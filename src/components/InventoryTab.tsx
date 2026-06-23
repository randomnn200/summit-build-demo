"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Warehouse,
  X,
  ClipboardList,
} from "lucide-react";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_LOCATIONS,
  INVENTORY_UNITS,
  isLowStock,
  transactionLabel,
  type InventoryCategory,
  type InventoryUnit,
} from "../lib/inventory";
import {
  addInventoryItem,
  deleteInventoryItem,
  recordInventoryTransaction,
  subscribeToInventoryItems,
  subscribeToInventoryTransactions,
  updateInventoryItem,
  type InventoryItem,
  type InventoryItemInput,
  type InventoryTransaction,
  type InventoryTransactionType,
  type Role,
} from "../lib/firebase/firebaseUtils";
import PurchaseOrdersPanel, { OnHandStockView } from "./PurchaseOrdersPanel";

const GREEN = "var(--brand-primary)";
const RED = "var(--brand-accent)";

function fmtWhen(createdAt: { seconds: number } | null) {
  if (!createdAt?.seconds) return "—";
  return new Date(createdAt.seconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const emptyItemForm: {
  name: string;
  sku: string;
  category: InventoryCategory;
  quantity: string;
  unit: InventoryUnit;
  location: string;
  reorderLevel: string;
  unitCost: string;
  supplier: string;
  notes: string;
} = {
  name: "",
  sku: "",
  category: "Hardware",
  quantity: "0",
  unit: "ea",
  location: INVENTORY_LOCATIONS[0],
  reorderLevel: "5",
  unitCost: "",
  supplier: "",
  notes: "",
};

type ItemFormState = typeof emptyItemForm;

function itemToForm(item: InventoryItem): ItemFormState {
  return {
    name: item.name,
    sku: item.sku,
    category: item.category,
    quantity: String(item.quantity),
    unit: item.unit,
    location: item.location,
    reorderLevel: String(item.reorderLevel),
    unitCost: item.unitCost != null ? String(item.unitCost) : "",
    supplier: item.supplier ?? "",
    notes: item.notes ?? "",
  };
}

function parseItemForm(form: ItemFormState, includeQuantity: boolean): InventoryItemInput {
  const parsedCost = form.unitCost ? Number(form.unitCost) : NaN;
  return {
    name: form.name.trim(),
    sku: form.sku.trim(),
    category: form.category,
    quantity: includeQuantity ? Math.max(0, Number(form.quantity) || 0) : 0,
    unit: form.unit,
    location: form.location.trim() || INVENTORY_LOCATIONS[0],
    reorderLevel: Math.max(0, Number(form.reorderLevel) || 0),
    unitCost:
      !Number.isNaN(parsedCost) && parsedCost > 0 ? parsedCost : undefined,
    supplier: form.supplier.trim() || undefined,
    notes: form.notes.trim() || undefined,
  };
}

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${
          wide ? "max-w-lg" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brand-bar" />
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ItemFormFields({
  form,
  setForm,
  showQuantity,
}: {
  form: ItemFormState;
  setForm: React.Dispatch<React.SetStateAction<ItemFormState>>;
  showQuantity: boolean;
}) {
  const set = (k: keyof ItemFormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const qty = Math.max(0, Number(form.quantity) || 0);
  const unitCost = form.unitCost ? Number(form.unitCost) : 0;
  const totalStockValue =
    showQuantity && unitCost > 0 ? qty * unitCost : null;

  return (
    <div className="space-y-3">
      <input
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Item name *"
        required
        className="profile-input"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          value={form.sku}
          onChange={(e) => set("sku", e.target.value)}
          placeholder="SKU / part #"
          className="profile-input"
        />
        <select
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="profile-input"
        >
          {INVENTORY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {showQuantity && (
          <input
            type="number"
            min={0}
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            placeholder="Starting qty"
            className="profile-input"
          />
        )}
        <select
          value={form.unit}
          onChange={(e) => set("unit", e.target.value)}
          className="profile-input"
        >
          {INVENTORY_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <select
        value={form.location}
        onChange={(e) => set("location", e.target.value)}
        className="profile-input"
      >
        {INVENTORY_LOCATIONS.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          min={0}
          value={form.reorderLevel}
          onChange={(e) => set("reorderLevel", e.target.value)}
          placeholder="Reorder at (min stock)"
          className="profile-input"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={form.unitCost}
          onChange={(e) => set("unitCost", e.target.value)}
          placeholder="Unit cost ($)"
          className="profile-input"
        />
      </div>
      {totalStockValue != null && (
        <div className="flex items-center justify-between rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
          <span className="text-sm text-gray-600">
            Total stock value ({qty} × {fmtMoney(unitCost)})
          </span>
          <span className="text-lg font-black text-brand-primary">
            {fmtMoney(totalStockValue)}
          </span>
        </div>
      )}
      <input
        value={form.supplier}
        onChange={(e) => set("supplier", e.target.value)}
        placeholder="Preferred supplier"
        className="profile-input"
      />
      <textarea
        value={form.notes}
        onChange={(e) => set("notes", e.target.value)}
        rows={2}
        placeholder="Notes"
        className="profile-input resize-none"
      />
    </div>
  );
}

function TransactionModal({
  item,
  type,
  userName,
  userEmail,
  onClose,
  onDone,
}: {
  item: InventoryItem;
  type: InventoryTransactionType;
  userName: string | null;
  userEmail: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [qty, setQty] = useState(type === "adjustment" ? "0" : "1");
  const [job, setJob] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const titles: Record<InventoryTransactionType, string> = {
    pull: "Log pull from stock",
    restock: "Restock item",
    return: "Return to stock",
    adjustment: "Adjust quantity",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const quantity = Number(qty);
    if (Number.isNaN(quantity) || (type !== "adjustment" && quantity <= 0)) {
      setError("Enter a valid quantity.");
      return;
    }
    if (type === "adjustment" && quantity === 0) {
      setError("Adjustment amount cannot be zero.");
      return;
    }
    setBusy(true);
    try {
      await recordInventoryTransaction({
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        type,
        quantity,
        jobOrProject: job,
        performedBy: userName || userEmail || "Staff",
        performedByEmail: userEmail,
        notes,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={titles[type]} onClose={onClose}>
      <p className="mb-4 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{item.name}</span>
        {item.sku ? ` · ${item.sku}` : ""} —{" "}
        <span className="font-semibold">{item.quantity}</span> {item.unit} on
        hand
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="number"
          step={type === "adjustment" ? "any" : "1"}
          min={type === "adjustment" ? undefined : 1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder={
            type === "adjustment"
              ? "Change (+ or −, e.g. -2 or 10)"
              : "Quantity"
          }
          className="profile-input"
        />
        {(type === "pull" || type === "return") && (
          <input
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="Job / project / ticket #"
            className="profile-input"
          />
        )}
        {type === "restock" && (
          <input
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="PO # or supplier delivery (optional)"
            className="profile-input"
          />
        )}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notes"
          className="profile-input resize-none"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: GREEN }}
        >
          {busy ? "Saving…" : "Save transaction"}
        </button>
      </form>
    </Modal>
  );
}

export default function InventoryTab({
  userName,
  userEmail,
  role,
}: {
  userName: string | null;
  userEmail: string | null;
  role: Role;
}) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<
    "stock" | "on-hand" | "activity" | "purchase-orders"
  >("on-hand");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [txModal, setTxModal] = useState<{
    item: InventoryItem;
    type: InventoryTransactionType;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [addForm, setAddForm] = useState(emptyItemForm);
  const [editForm, setEditForm] = useState(emptyItemForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    let ready = 0;
    const mark = () => {
      ready += 1;
      if (ready >= 2) setLoading(false);
    };
    const u1 = subscribeToInventoryItems((list) => {
      setItems(list);
      mark();
    });
    const u2 = subscribeToInventoryTransactions((list) => {
      setTransactions(list);
      mark();
    });
    return () => {
      u1();
      u2();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.supplier?.toLowerCase().includes(q)
      );
    });
  }, [items, search, category]);

  const lowStock = items.filter((i) => isLowStock(i.quantity, i.reorderLevel));
  const totalValue = items.reduce(
    (sum, i) => sum + i.quantity * (i.unitCost ?? 0),
    0
  );

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    const data = parseItemForm(addForm, true);
    if (!data.name) {
      setAddError("Item name is required.");
      return;
    }
    setSaving(true);
    try {
      await addInventoryItem(data, userName || userEmail || "Staff", userEmail);
      setAddForm(emptyItemForm);
      setShowAdd(false);
    } catch (err) {
      console.error(err);
      setAddError(
        err instanceof Error
          ? err.message
          : "Could not add item. Check Firestore rules for the inventory collection."
      );
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const data = parseItemForm(editForm, false);
    if (!data.name) return;
    setSaving(true);
    try {
      await updateInventoryItem(editItem.id, data);
      setEditItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInventoryItem(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (item: InventoryItem) => {
    setEditForm(itemToForm(item));
    setEditItem(item);
  };

  return (
    <div className="space-y-6">
      {txModal && (
        <TransactionModal
          item={txModal.item}
          type={txModal.type}
          userName={userName}
          userEmail={userEmail}
          onClose={() => setTxModal(null)}
          onDone={() => {}}
        />
      )}

      {showAdd && (
        <Modal
          title="Add inventory item"
          onClose={() => {
            setShowAdd(false);
            setAddError("");
          }}
          wide
        >
          <form onSubmit={addItem}>
            <ItemFormFields form={addForm} setForm={setAddForm} showQuantity />
            {addError && (
              <p className="mt-3 text-sm text-red-600">{addError}</p>
            )}
            <button
              type="submit"
              disabled={saving || !addForm.name.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              <Plus className="h-4 w-4" />
              {saving ? "Adding…" : "Add to inventory"}
            </button>
          </form>
        </Modal>
      )}

      {editItem && (
        <Modal title="Edit item details" onClose={() => setEditItem(null)} wide>
          <p className="mb-3 text-xs text-gray-500">
            Quantity changes are logged via pull, restock, and adjustment
            transactions — not edited here.
          </p>
          <form onSubmit={saveEdit}>
            <ItemFormFields
              form={editForm}
              setForm={setEditForm}
              showQuantity={false}
            />
            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-md py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="brand-bar" />
            <div className="p-6">
              <h3 className="text-lg font-bold">Delete item?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Remove &ldquo;{deleteTarget.name}&rdquo; from inventory? Activity
                log entries will remain for audit purposes.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: RED }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm border-l-4 border-l-brand-primary">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Items in stock
          </p>
          <p className="mt-2 text-3xl font-black">{items.length}</p>
        </div>
        <div
          className={`rounded-xl border bg-white p-5 shadow-sm border-l-4 ${
            lowStock.length > 0 ? "border-l-amber-500" : "border-l-emerald-500"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Low stock alerts
          </p>
          <p className="mt-2 text-3xl font-black">{lowStock.length}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm border-l-4 border-l-brand-accent">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Est. inventory value
          </p>
          <p className="mt-2 text-2xl font-black">{fmtMoney(totalValue)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm border-l-4 border-l-indigo-500">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Transactions logged
          </p>
          <p className="mt-2 text-3xl font-black">{transactions.length}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Reorder needed</p>
            <p className="mt-0.5 text-amber-800/90">
              {lowStock.map((i) => i.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">Inventory</h2>
            <p className="mt-1 text-sm text-gray-500">
              Track materials, log pulls for jobs, restock deliveries, and audit
              every change.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("on-hand")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === "on-hand"
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={
                view === "on-hand" ? { backgroundColor: GREEN } : undefined
              }
            >
              <span className="inline-flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                On hand
              </span>
            </button>
            <button
              type="button"
              onClick={() => setView("stock")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === "stock"
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={view === "stock" ? { backgroundColor: GREEN } : undefined}
            >
              <span className="inline-flex items-center gap-2">
                <Package className="h-4 w-4" />
                Manage
              </span>
            </button>
            <button
              type="button"
              onClick={() => setView("purchase-orders")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === "purchase-orders"
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={
                view === "purchase-orders"
                  ? { backgroundColor: GREEN }
                  : undefined
              }
            >
              <span className="inline-flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Purchase orders
              </span>
            </button>
            <button
              type="button"
              onClick={() => setView("activity")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === "activity"
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={
                view === "activity" ? { backgroundColor: GREEN } : undefined
              }
            >
              <span className="inline-flex items-center gap-2">
                <History className="h-4 w-4" />
                Activity log
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAddForm(emptyItemForm);
                setShowAdd(true);
                setAddError("");
              }}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          </div>
        </div>

        {view === "on-hand" || view === "stock" ? (
          <>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, SKU, location…"
                  className="profile-input pl-9"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="profile-input sm:w-48"
              >
                <option value="all">All categories</option>
                {INVENTORY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-gray-500">Loading inventory…</p>
            ) : view === "on-hand" ? (
              <OnHandStockView
                items={items}
                search={search}
                category={category}
              />
            ) : filtered.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500">
                {items.length === 0
                  ? "No items yet. Add lumber, hardware, and supplies to get started."
                  : "No items match your search."}
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pr-4">Item</th>
                      <th className="pb-3 pr-4">On hand</th>
                      <th className="pb-3 pr-4">Location</th>
                      <th className="pb-3 pr-4">Reorder at</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((item) => {
                      const low = isLowStock(item.quantity, item.reorderLevel);
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="py-4 pr-4">
                            <p className="font-semibold text-gray-900">
                              {item.name}
                              {low && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                                  Low
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.category}
                              {item.sku ? ` · ${item.sku}` : ""}
                            </p>
                            {item.supplier && (
                              <p className="text-xs text-gray-400">
                                {item.supplier}
                              </p>
                            )}
                          </td>
                          <td className="py-4 pr-4">
                            <span
                              className={`text-lg font-black ${
                                low ? "text-amber-600" : "text-gray-900"
                              }`}
                            >
                              {item.quantity}
                            </span>
                            <span className="ml-1 text-gray-500">
                              {item.unit}
                            </span>
                            {item.unitCost != null && item.unitCost > 0 && (
                              <p className="text-xs text-gray-400">
                                {fmtMoney(item.unitCost)}/unit
                              </p>
                            )}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {item.location}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {item.reorderLevel > 0
                              ? `${item.reorderLevel} ${item.unit}`
                              : "—"}
                          </td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                title="Log pull"
                                onClick={() =>
                                  setTxModal({ item, type: "pull" })
                                }
                                className="rounded-md bg-red-50 p-2 text-red-600 hover:bg-red-100"
                              >
                                <ArrowDownCircle className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Restock"
                                onClick={() =>
                                  setTxModal({ item, type: "restock" })
                                }
                                className="rounded-md bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100"
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Return unused"
                                onClick={() =>
                                  setTxModal({ item, type: "return" })
                                }
                                className="rounded-md bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Adjust count"
                                onClick={() =>
                                  setTxModal({ item, type: "adjustment" })
                                }
                                className="rounded-md bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
                              >
                                <SlidersHorizontal className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Edit details"
                                onClick={() => openEdit(item)}
                                className="rounded-md bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {role === "owner" && (
                                <button
                                  type="button"
                                  title="Delete item"
                                  onClick={() => setDeleteTarget(item)}
                                  className="rounded-md bg-gray-100 p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : view === "purchase-orders" ? (
          <PurchaseOrdersPanel
            items={items}
            userName={userName}
            userEmail={userEmail}
          />
        ) : (
          <div className="mt-6">
            {loading ? (
              <p className="text-sm text-gray-500">Loading activity…</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-gray-500">
                No transactions yet. Pulls, restocks, and adjustments appear
                here with a full audit trail.
              </p>
            ) : (
              <ul className="space-y-3">
                {transactions.map((tx) => {
                  const isOut =
                    tx.type === "pull" ||
                    (tx.type === "adjustment" && tx.quantityAfter < tx.quantityBefore);
                  return (
                    <li
                      key={tx.id}
                      className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {transactionLabel(tx.type)} — {tx.itemName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {tx.itemSku ? `${tx.itemSku} · ` : ""}
                            {fmtWhen(tx.createdAt)} · {tx.performedBy}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isOut
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {tx.type === "adjustment"
                            ? `${tx.quantityAfter - tx.quantityBefore >= 0 ? "+" : ""}${tx.quantityAfter - tx.quantityBefore}`
                            : isOut
                              ? `−${tx.quantity}`
                              : `+${tx.quantity}`}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {tx.quantityBefore} → {tx.quantityAfter} on hand
                        {tx.jobOrProject ? ` · ${tx.jobOrProject}` : ""}
                      </p>
                      {tx.notes && (
                        <p className="mt-1 text-xs text-gray-500">{tx.notes}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
