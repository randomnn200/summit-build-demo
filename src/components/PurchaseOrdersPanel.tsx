"use client";

import { useEffect, useState } from "react";
import { PackageCheck, Plus, X } from "lucide-react";
import {
  generatePoNumber,
  poRemaining,
  poStatusLabel,
  poTotal,
  type PurchaseOrderStatus,
} from "../lib/inventory";
import {
  createPurchaseOrder,
  receivePurchaseOrderItems,
  subscribeToPurchaseOrders,
  updatePurchaseOrderStatus,
  type InventoryItem,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from "../lib/firebase/firebaseUtils";
import DateInput from "./DateInput";
import MoneyInput from "./MoneyInput";
import { moneyInputFromNumber, parseMoneyInput } from "../lib/formatMoneyInput";

const GREEN = "var(--brand-primary)";

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDate(createdAt: { seconds: number } | null) {
  if (!createdAt?.seconds) return "—";
  return new Date(createdAt.seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusColor(status: PurchaseOrderStatus) {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-700";
    case "ordered":
      return "bg-blue-100 text-blue-800";
    case "partial":
      return "bg-amber-100 text-amber-800";
    case "received":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-red-100 text-red-700";
  }
}

type DraftLine = {
  itemId: string;
  quantityOrdered: string;
  unitCost: string;
};

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
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brand-bar" />
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
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

function ReceivePoModal({
  po,
  userName,
  userEmail,
  onClose,
  onDone,
}: {
  po: PurchaseOrder;
  userName: string | null;
  userEmail: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [quantities, setQuantities] = useState<string[]>(
    po.lines.map((l) => String(poRemaining(l)))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const receives = po.lines
      .map((line, i) => ({
        lineIndex: i,
        quantity: Number(quantities[i]) || 0,
      }))
      .filter((r) => r.quantity > 0);

    if (receives.length === 0) {
      setError("Enter at least one quantity to receive.");
      return;
    }

    setBusy(true);
    try {
      await receivePurchaseOrderItems(
        po.id,
        receives,
        userName || userEmail || "Staff",
        userEmail
      );
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Receive failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Receive — ${po.poNumber}`} onClose={onClose} wide>
      <p className="mb-4 text-sm text-gray-500">
        Received quantities are added to linked inventory items automatically.
      </p>
      <form onSubmit={submit} className="space-y-4">
        {po.lines.map((line, i) => {
          const remaining = poRemaining(line);
          return (
            <div
              key={i}
              className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{line.itemName}</p>
                  <p className="text-xs text-gray-500">
                    Ordered {line.quantityOrdered} {line.unit} · Received{" "}
                    {line.quantityReceived} · Remaining {remaining}
                  </p>
                </div>
                {!line.itemId && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                    No inventory link
                  </span>
                )}
              </div>
              {remaining > 0 ? (
                <input
                  type="number"
                  min={0}
                  max={remaining}
                  value={quantities[i]}
                  onChange={(e) =>
                    setQuantities((q) => {
                      const next = [...q];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  className="profile-input mt-3"
                  placeholder={`Receive qty (max ${remaining})`}
                />
              ) : (
                <p className="mt-2 text-xs font-medium text-emerald-600">
                  Fully received
                </p>
              )}
            </div>
          );
        })}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: GREEN }}
        >
          {busy ? "Receiving…" : "Confirm receipt & update stock"}
        </button>
      </form>
    </Modal>
  );
}

export default function PurchaseOrdersPanel({
  items,
  userName,
  userEmail,
}: {
  items: InventoryItem[];
  userName: string | null;
  userEmail: string | null;
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [supplier, setSupplier] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { itemId: "", quantityOrdered: "1", unitCost: "" },
  ]);
  const [submitAs, setSubmitAs] = useState<PurchaseOrderStatus>("ordered");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = subscribeToPurchaseOrders((list) => {
      setOrders(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const addLine = () =>
    setLines((l) => [...l, { itemId: "", quantityOrdered: "1", unitCost: "" }]);

  const updateLine = (i: number, patch: Partial<DraftLine>) =>
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    );

  const onItemSelect = (i: number, itemId: string) => {
    const item = items.find((x) => x.id === itemId);
    updateLine(i, {
      itemId,
      unitCost: item?.unitCost != null ? moneyInputFromNumber(item.unitCost) : "",
    });
  };

  const draftTotal = lines.reduce((sum, line) => {
    const item = items.find((x) => x.id === line.itemId);
    const qty = Number(line.quantityOrdered) || 0;
    const cost =
      parseMoneyInput(line.unitCost) || (item?.unitCost != null ? item.unitCost : 0);
    return sum + qty * cost;
  }, 0);

  const resetForm = () => {
    setSupplier("");
    setExpectedDate("");
    setNotes("");
    setLines([{ itemId: "", quantityOrdered: "1", unitCost: "" }]);
    setSubmitAs("ordered");
    setError("");
  };

  const createPo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!supplier.trim()) {
      setError("Supplier is required.");
      return;
    }

    const poLines: PurchaseOrderLine[] = [];
    for (const line of lines) {
      const item = items.find((x) => x.id === line.itemId);
      if (!item) continue;
      const qty = Number(line.quantityOrdered);
      if (!qty || qty <= 0) continue;
      const cost = parseMoneyInput(line.unitCost) || item.unitCost || 0;
      poLines.push({
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        unit: item.unit,
        quantityOrdered: qty,
        quantityReceived: 0,
        unitCost: cost,
      });
    }

    if (poLines.length === 0) {
      setError("Add at least one inventory item with a quantity.");
      return;
    }

    setSaving(true);
    try {
      await createPurchaseOrder({
        poNumber: generatePoNumber(),
        supplier: supplier.trim(),
        status: submitAs,
        lines: poLines,
        expectedDate: expectedDate || undefined,
        notes: notes.trim() || undefined,
        createdBy: userName || userEmail || "Staff",
        createdByEmail: userEmail,
      });
      resetForm();
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create PO");
    } finally {
      setSaving(false);
    }
  };

  const openCount = orders.filter(
    (o) => o.status === "ordered" || o.status === "partial"
  ).length;

  return (
    <div className="mt-6">
      {receivePo && (
        <ReceivePoModal
          po={receivePo}
          userName={userName}
          userEmail={userEmail}
          onClose={() => setReceivePo(null)}
          onDone={() => {}}
        />
      )}

      {showCreate && (
        <Modal title="New purchase order" onClose={() => setShowCreate(false)} wide>
          <form onSubmit={createPo} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier *"
                className="profile-input"
                required
              />
              <DateInput
                label="Expected delivery"
                value={expectedDate}
                onChange={setExpectedDate}
              />
            </div>
            <select
              value={submitAs}
              onChange={(e) =>
                setSubmitAs(e.target.value as PurchaseOrderStatus)
              }
              className="profile-input"
            >
              <option value="draft">Save as draft</option>
              <option value="ordered">Submit as ordered</option>
            </select>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Line items
              </p>
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3 sm:grid-cols-[1fr_5rem_6rem_auto]"
                >
                  <select
                    value={line.itemId}
                    onChange={(e) => onItemSelect(i, e.target.value)}
                    className="profile-input"
                  >
                    <option value="">Select inventory item…</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.quantity} {item.unit} on hand)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={line.quantityOrdered}
                    onChange={(e) =>
                      updateLine(i, { quantityOrdered: e.target.value })
                    }
                    placeholder="Qty"
                    className="profile-input"
                  />
                  <MoneyInput
                    hideLabel
                    value={line.unitCost}
                    onChange={(unitCost) => updateLine(i, { unitCost })}
                    placeholder="Unit $"
                    className="profile-input money-input"
                  />
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setLines((l) => l.filter((_, idx) => idx !== i))
                      }
                      className="rounded-md px-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addLine}
                className="text-sm font-semibold text-brand-primary hover:underline"
              >
                + Add line
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
              <span className="text-sm text-gray-600">PO total</span>
              <span className="text-lg font-black text-brand-primary">
                {fmtMoney(draftTotal)}
              </span>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes for supplier or internal use"
              className="profile-input resize-none"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {saving ? "Creating…" : "Create purchase order"}
            </button>
          </form>
        </Modal>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {openCount > 0
            ? `${openCount} open order${openCount === 1 ? "" : "s"} awaiting delivery`
            : "Order materials from suppliers and receive into stock"}
        </p>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          disabled={items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: GREEN }}
        >
          <Plus className="h-4 w-4" />
          New purchase order
        </button>
      </div>

      {items.length === 0 && (
        <p className="mb-4 text-sm text-amber-700">
          Add inventory items first before creating purchase orders.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading purchase orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-500">
          No purchase orders yet. Create one to order lumber, hardware, and
          supplies from your vendors.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((po) => (
            <li
              key={po.id}
              className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-gray-900">{po.poNumber}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusColor(po.status)}`}
                    >
                      {poStatusLabel(po.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{po.supplier}</p>
                  <p className="text-xs text-gray-400">
                    {fmtDate(po.createdAt)}
                    {po.expectedDate
                      ? ` · Expected ${po.expectedDate}`
                      : ""}{" "}
                    · {po.lines.length} line
                    {po.lines.length === 1 ? "" : "s"} · {fmtMoney(poTotal(po.lines))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(po.status === "ordered" || po.status === "partial") && (
                    <button
                      type="button"
                      onClick={() => setReceivePo(po)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      Receive
                    </button>
                  )}
                  {po.status === "draft" && (
                    <button
                      type="button"
                      onClick={() =>
                        updatePurchaseOrderStatus(po.id, "ordered")
                      }
                      className="rounded-lg border border-brand-primary/30 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/5"
                    >
                      Mark ordered
                    </button>
                  )}
                  {(po.status === "draft" || po.status === "ordered") && (
                    <button
                      type="button"
                      onClick={() =>
                        updatePurchaseOrderStatus(po.id, "cancelled")
                      }
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-600">
                {po.lines.map((line, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {line.itemName} — {line.quantityOrdered} {line.unit}
                    </span>
                    <span className="shrink-0 text-gray-400">
                      {line.quantityReceived}/{line.quantityOrdered} rcvd
                    </span>
                  </li>
                ))}
              </ul>
              {po.notes && (
                <p className="mt-2 text-xs text-gray-500">{po.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OnHandStockView({
  items,
  search,
  category,
}: {
  items: InventoryItem[];
  search: string;
  category: string;
}) {
  const filtered = items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q)
    );
  });

  const byCategory = groupByCategory(filtered);
  const totalUnits = filtered.reduce((n, i) => n + i.quantity, 0);

  if (filtered.length === 0) {
    return (
      <p className="mt-6 text-sm text-gray-500">
        No items to display. Add inventory or adjust your filters.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3 text-sm">
        <span className="font-semibold text-gray-900">{filtered.length}</span>{" "}
        items ·{" "}
        <span className="font-semibold text-brand-primary">{totalUnits}</span>{" "}
        total units in stock
      </div>

      {byCategory.map(([cat, catItems]) => (
        <div key={cat}>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
            {cat} ({catItems.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {catItems.map((item) => {
              const low = isLowStock(item.quantity, item.reorderLevel);
              const maxBar = Math.max(
                item.reorderLevel * 2,
                item.quantity,
                1
              );
              const pct = Math.min(100, (item.quantity / maxBar) * 100);
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    low ? "border-amber-200" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.sku || "No SKU"} · {item.location}
                      </p>
                    </div>
                    {low && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        Low
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-3xl font-black text-gray-900">
                    {item.quantity}
                    <span className="ml-1 text-base font-semibold text-gray-500">
                      {item.unit}
                    </span>
                  </p>
                  {item.reorderLevel > 0 && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                        <span>Stock level</span>
                        <span>Reorder at {item.reorderLevel}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            low ? "bg-amber-500" : "bg-brand-primary"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {item.unitCost != null && item.unitCost > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {fmtMoney(item.quantity * item.unitCost)} on hand (
                      {fmtMoney(item.unitCost)}/{item.unit})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupByCategory(items: InventoryItem[]) {
  const map = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function isLowStock(quantity: number, reorderLevel: number) {
  return reorderLevel > 0 && quantity <= reorderLevel;
}
