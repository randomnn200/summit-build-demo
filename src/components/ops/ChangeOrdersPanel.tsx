"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Printer, Trash2 } from "lucide-react";
import {
  CHANGE_ORDER_STATUSES,
  CHANGE_ORDER_STATUS_LABELS,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  changeOrderTotal,
  type ChangeOrderStatus,
  type InvoiceStatus,
} from "../../lib/constructionOps";
import {
  addChangeOrder,
  deleteChangeOrder,
  subscribeToChangeOrders,
  updateChangeOrder,
  type ChangeOrder,
} from "../../lib/firebase/constructionOpsFirestore";
import type { Job } from "../../lib/firebase/firebaseUtils";
import { parseMoneyInput } from "../../lib/formatMoneyInput";
import MoneyInput from "../MoneyInput";
import { Card, GREEN, RED, fmtDate, fmtMoney, printChangeOrderPdf, JobSelect, InlineSelect } from "./opsShared";

const CO_STATUS_COLORS: Record<ChangeOrderStatus, string> = {
  draft: "#64748b",
  pending_approval: "#f59e0b",
  approved: "#059669",
  rejected: "#dc2626",
};

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  not_invoiced: "#64748b",
  invoiced: "#2563eb",
  paid: "#059669",
};

const empty = {
  jobId: "",
  title: "",
  description: "",
  laborCost: "",
  materialsCost: "",
  otherCost: "",
  attachmentNotes: "",
  externalLinks: "",
};

export default function ChangeOrdersPanel({
  jobs,
  userName,
  userEmail,
  companyName,
}: {
  jobs: Job[];
  userName: string | null;
  userEmail: string | null;
  companyName: string;
}) {
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToChangeOrders(setOrders), []);

  const pending = useMemo(
    () => orders.filter((o) => o.status === "pending_approval"),
    [orders]
  );

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const jobTitle = (id: string) =>
    jobs.find((j) => j.jobId === id)?.title ?? "Unknown job";

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobId || !form.title.trim()) return;
    setSaving(true);
    try {
      await addChangeOrder({
        jobId: form.jobId,
        jobTitle: jobTitle(form.jobId),
        title: form.title.trim(),
        description: form.description.trim(),
        laborCost: Math.max(0, parseMoneyInput(form.laborCost)),
        materialsCost: Math.max(0, parseMoneyInput(form.materialsCost)),
        otherCost: Math.max(0, parseMoneyInput(form.otherCost)),
        status: "pending_approval",
        invoiceStatus: "not_invoiced",
        attachmentNotes: form.attachmentNotes.trim(),
        externalLinks: form.externalLinks.trim(),
        requestedBy: userName || userEmail || "Staff",
        requestedByEmail: userEmail,
      });
      setForm(empty);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <Card>
          <h3 className="font-bold text-amber-800">
            Pending approval ({pending.length})
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Unapproved change orders = lost revenue. Review and approve quickly.
          </p>
          <ul className="mt-4 space-y-2">
            {pending.map((co) => (
              <li
                key={co.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm"
              >
                <span>
                  <strong>{co.title}</strong> · Job #{co.jobId} ·{" "}
                  {fmtMoney(changeOrderTotal(co))}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateChangeOrder(co.id, {
                        status: "approved",
                        approvedBy: userName || userEmail || "Owner",
                        approvedAt: Date.now(),
                      })
                    }
                    className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: GREEN }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateChangeOrder(co.id, { status: "rejected" })
                    }
                    className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: RED }}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> New change order
          </h3>
          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <JobSelect
              jobs={jobs.filter((j) => j.status === "active")}
              value={form.jobId}
              onChange={(id) => set("jobId", id)}
              required
            />
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Add window — east wall"
              className="profile-input"
              required
            />
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Scope of extra work"
              className="profile-input resize-none"
            />
            <div className="grid grid-cols-3 gap-2">
              <MoneyInput
                hideLabel
                value={form.laborCost}
                onChange={(v) => set("laborCost", v)}
                placeholder="Labor $"
                className="profile-input money-input"
              />
              <MoneyInput
                hideLabel
                value={form.materialsCost}
                onChange={(v) => set("materialsCost", v)}
                placeholder="Materials $"
                className="profile-input money-input"
              />
              <MoneyInput
                hideLabel
                value={form.otherCost}
                onChange={(v) => set("otherCost", v)}
                placeholder="Other $"
                className="profile-input money-input"
              />
            </div>
            <input
              value={form.attachmentNotes}
              onChange={(e) => set("attachmentNotes", e.target.value)}
              placeholder="Photo / document notes (describe attachments)"
              className="profile-input"
            />
            <input
              value={form.externalLinks}
              onChange={(e) => set("externalLinks", e.target.value)}
              placeholder="Links to photos or files (Drive, Dropbox, etc.)"
              className="profile-input"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {saving ? "Saving…" : "Create change order"}
            </button>
          </form>
        </Card>

        <Card>
          <h3 className="font-bold">All change orders ({orders.length})</h3>
          {orders.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No change orders yet.</p>
          ) : (
            <ul className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto overflow-x-visible pr-1">
              {orders.map((co) => (
                <li
                  key={co.id}
                  className="rounded-xl border border-gray-100 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{co.title}</p>
                      <p className="text-xs text-gray-500">
                        Job #{co.jobId} · {fmtMoney(changeOrderTotal(co))} ·{" "}
                        {fmtDate(co.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <InlineSelect
                        options={CHANGE_ORDER_STATUSES.map((s) => ({
                          value: s,
                          label: CHANGE_ORDER_STATUS_LABELS[s],
                          color: CO_STATUS_COLORS[s],
                        }))}
                        value={co.status}
                        onChange={(status) =>
                          updateChangeOrder(co.id, {
                            status: status as ChangeOrder["status"],
                          })
                        }
                      />
                      <InlineSelect
                        options={INVOICE_STATUSES.map((s) => ({
                          value: s,
                          label: INVOICE_STATUS_LABELS[s],
                          color: INVOICE_STATUS_COLORS[s],
                        }))}
                        value={co.invoiceStatus}
                        onChange={(invoiceStatus) =>
                          updateChangeOrder(co.id, {
                            invoiceStatus:
                              invoiceStatus as ChangeOrder["invoiceStatus"],
                          })
                        }
                      />
                    </div>
                  </div>
                  {co.description && (
                    <p className="mt-2 text-sm text-gray-600">{co.description}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => printChangeOrderPdf(co, companyName)}
                      className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold"
                      style={{ borderColor: GREEN, color: GREEN }}
                    >
                      <Printer className="h-3 w-3" /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteChangeOrder(co.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
