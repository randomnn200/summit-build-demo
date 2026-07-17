"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import {
  generatePoNumber,
  poRemaining,
  poStatusLabel,
  poTotal,
  type PurchaseOrderStatus,
} from "../../lib/inventory";
import PhoneInput from "../PhoneInput";
import {
  createPurchaseOrder,
  subscribeToInventoryItems,
  subscribeToPurchaseOrders,
  approvePurchaseOrder,
  updatePurchaseOrderStatus,
  type InventoryItem,
  type PurchaseOrder,
} from "../../lib/firebase/firebaseUtils";
import {
  addSupplier,
  deleteSupplier,
  subscribeToSuppliers,
  type Supplier,
} from "../../lib/firebase/constructionOpsFirestore";
import type { Job } from "../../lib/firebase/firebaseUtils";
import { Card, GREEN, JobSelect, SearchableSelect, fmtMoney } from "./opsShared";

function statusColor(status: PurchaseOrderStatus) {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-700";
    case "pending_approval":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "ordered":
    case "partial":
      return "bg-indigo-100 text-indigo-800";
    case "received":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-700";
  }
}

export default function ProjectPurchaseOrdersPanel({
  jobs,
  userName,
  userEmail,
}: {
  jobs: Job[];
  userName: string | null;
  userEmail: string | null;
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterJob, setFilterJob] = useState("");
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    terms: "",
  });
  const [poForm, setPoForm] = useState({
    jobId: "",
    supplierId: "",
    supplier: "",
    itemId: "",
    qty: "1",
    notes: "",
  });

  useEffect(() => subscribeToPurchaseOrders(setOrders), []);
  useEffect(() => subscribeToSuppliers(setSuppliers), []);
  useEffect(() => subscribeToInventoryItems(setItems), []);

  const filtered = useMemo(
    () =>
      filterJob
        ? orders.filter((o) => o.jobId === filterJob)
        : orders,
    [orders, filterJob]
  );

  const pendingApproval = useMemo(
    () => filtered.filter((o) => o.status === "pending_approval"),
    [filtered]
  );

  const supplierOptions = useMemo(
    () => [
      { value: "", label: "— Select supplier —" },
      ...suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        searchText: `${s.name} ${s.contactName}`,
      })),
    ],
    [suppliers]
  );

  const addSupplierRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;
    await addSupplier({
      ...supplierForm,
      phone: supplierForm.phone.trim(),
      notes: "",
      createdBy: userName || "Staff",
    });
    setSupplierForm({ name: "", contactName: "", email: "", phone: "", terms: "" });
  };

  const createPo = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find((i) => i.id === poForm.itemId);
    const qty = Number(poForm.qty);
    if (!item || !qty || qty <= 0) return;
    const sup =
      suppliers.find((s) => s.id === poForm.supplierId)?.name ?? poForm.supplier;
    if (!sup.trim()) return;
    const job = jobs.find((j) => j.jobId === poForm.jobId);
    await createPurchaseOrder({
      poNumber: generatePoNumber(),
      supplier: sup.trim(),
      supplierId: poForm.supplierId || null,
      jobId: poForm.jobId || null,
      jobTitle: job?.title ?? null,
      status: "pending_approval",
      lines: [
        {
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          unit: item.unit,
          quantityOrdered: qty,
          quantityReceived: 0,
          unitCost: item.unitCost ?? 0,
        },
      ],
      notes: poForm.notes.trim() || undefined,
      createdBy: userName || userEmail || "Staff",
      createdByEmail: userEmail,
    });
    setPoForm({ jobId: "", supplierId: "", supplier: "", itemId: "", qty: "1", notes: "" });
  };

  return (
    <div className="space-y-6">
      {pendingApproval.length > 0 && (
        <Card>
          <h3 className="font-bold text-amber-800">
            Pending approval ({pendingApproval.length})
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {pendingApproval.map((po) => (
              <li key={po.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {po.poNumber} · {po.supplier} · {fmtMoney(poTotal(po.lines))}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updatePurchaseOrderStatus(po.id, "approved").then(() =>
                      updatePurchaseOrderStatus(po.id, "ordered")
                    )
                  }
                  className="rounded px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: GREEN }}
                >
                  Approve & order
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-bold">Supplier directory</h3>
          <form onSubmit={addSupplierRecord} className="mt-4 space-y-2">
            <input
              value={supplierForm.name}
              onChange={(e) =>
                setSupplierForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Supplier name *"
              className="profile-input"
              required
            />
            <input
              value={supplierForm.contactName}
              onChange={(e) =>
                setSupplierForm((f) => ({ ...f, contactName: e.target.value }))
              }
              placeholder="Contact name"
              className="profile-input"
            />
            <input
              value={supplierForm.email}
              onChange={(e) =>
                setSupplierForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="Email"
              className="profile-input"
            />
            <PhoneInput
              value={supplierForm.phone}
              onChange={(phone) => setSupplierForm((f) => ({ ...f, phone }))}
            />
            <input
              value={supplierForm.terms}
              onChange={(e) =>
                setSupplierForm((f) => ({ ...f, terms: e.target.value }))
              }
              placeholder="Payment terms"
              className="profile-input"
            />
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Add supplier
            </button>
          </form>
          <ul className="mt-4 space-y-1 text-sm">
            {suppliers.map((s) => (
              <li
                key={s.id}
                className="flex justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span>
                  <strong>{s.name}</strong>
                  {s.contactName ? ` · ${s.contactName}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => deleteSupplier(s.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> Create material PO
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Receive stock in the Inventory tab after approval.
          </p>
          <form onSubmit={createPo} className="mt-4 space-y-3">
            <JobSelect
              jobs={jobs.filter((j) => j.status === "active")}
              value={poForm.jobId}
              onChange={(id) => setPoForm((f) => ({ ...f, jobId: id }))}
            />
            <SearchableSelect
              options={supplierOptions}
              value={poForm.supplierId}
              onChange={(id) => {
                const s = suppliers.find((x) => x.id === id);
                setPoForm((f) => ({
                  ...f,
                  supplierId: id,
                  supplier: s?.name ?? f.supplier,
                }));
              }}
              placeholder="Supplier"
              searchPlaceholder="Search suppliers…"
            />
            <select
              value={poForm.itemId}
              onChange={(e) => setPoForm((f) => ({ ...f, itemId: e.target.value }))}
              className="profile-input"
              required
            >
              <option value="">Select inventory item…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.quantity} {item.unit})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={poForm.qty}
              onChange={(e) => setPoForm((f) => ({ ...f, qty: e.target.value }))}
              placeholder="Quantity"
              className="profile-input"
            />
            <input
              value={poForm.notes}
              onChange={(e) => setPoForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              className="profile-input"
            />
            <button
              type="submit"
              className="w-full rounded-md py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Submit for approval
            </button>
          </form>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold">
            <Package className="h-4 w-4" /> Purchase orders
          </h3>
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="profile-input text-sm"
          >
            <option value="">All jobs</option>
            {jobs.map((j) => (
              <option key={j.jobId} value={j.jobId}>
                #{j.jobId} · {j.title}
              </option>
            ))}
          </select>
        </div>
        <ul className="mt-4 space-y-3">
          {filtered.map((po) => (
            <li
              key={po.id}
              className="rounded-xl border border-gray-100 p-4 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{po.poNumber}</p>
                  <p className="text-gray-600">{po.supplier}</p>
                  <p className="text-xs text-gray-500">
                    {po.jobId ? `Job #${po.jobId}` : "No job linked"} ·{" "}
                    {fmtMoney(poTotal(po.lines))}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusColor(po.status)}`}
                >
                  {poStatusLabel(po.status)}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                {po.lines.map((line, i) => (
                  <li key={i}>
                    {line.itemName}: {line.quantityReceived}/{line.quantityOrdered}{" "}
                    {line.unit} ({poRemaining(line)} remaining)
                  </li>
                ))}
              </ul>
              {po.status === "pending_approval" && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      approvePurchaseOrder(
                        po.id,
                        userName ?? "Staff",
                        userEmail
                      )
                    }
                    className="rounded px-2 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: GREEN }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePurchaseOrderStatus(po.id, "cancelled")}
                    className="rounded px-2 py-1 text-xs font-semibold text-red-600"
                  >
                    Reject
                  </button>
                </div>
              )}
              {po.status === "approved" && (
                <button
                  type="button"
                  onClick={() => updatePurchaseOrderStatus(po.id, "ordered")}
                  className="mt-2 rounded px-2 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: GREEN }}
                >
                  Mark ordered
                </button>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500">No purchase orders yet.</p>
          )}
        </ul>
      </Card>
    </div>
  );
}
