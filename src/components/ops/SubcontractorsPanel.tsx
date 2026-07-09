"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, HardHat, Plus, Trash2 } from "lucide-react";
import {
  SUB_PAYMENT_STATUSES,
  isExpired,
  isExpiringSoon,
} from "../../lib/constructionOps";
import {
  addSubcontractor,
  deleteSubcontractor,
  subscribeToSubcontractors,
  updateSubcontractor,
  type Subcontractor,
} from "../../lib/firebase/constructionOpsFirestore";
import type { Job } from "../../lib/firebase/firebaseUtils";
import PhoneInput from "../PhoneInput";
import DateInput from "../DateInput";
import { Card, GREEN, fmtDate, JobSelect, SearchableSelect } from "./opsShared";

const empty = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  trade: "",
  insuranceExpiry: "",
  licenseExpiry: "",
  licenseNumber: "",
  assignedJobId: "",
  paymentStatus: "current" as (typeof SUB_PAYMENT_STATUSES)[number],
  performanceNotes: "",
  contractNotes: "",
};

export default function SubcontractorsPanel({
  jobs,
  userName,
}: {
  jobs: Job[];
  userName: string | null;
}) {
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSubcontractors(setSubs), []);

  const expiring = useMemo(
    () =>
      subs.filter(
        (s) =>
          isExpiringSoon(s.insuranceExpiry) ||
          isExpiringSoon(s.licenseExpiry) ||
          isExpired(s.insuranceExpiry) ||
          isExpired(s.licenseExpiry)
      ),
    [subs]
  );

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    setSaving(true);
    try {
      await addSubcontractor({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        trade: form.trade.trim(),
        insuranceExpiry: form.insuranceExpiry,
        licenseExpiry: form.licenseExpiry,
        licenseNumber: form.licenseNumber.trim(),
        assignedJobIds: form.assignedJobId ? [form.assignedJobId] : [],
        paymentStatus: form.paymentStatus,
        performanceNotes: form.performanceNotes.trim(),
        contractNotes: form.contractNotes.trim(),
        createdBy: userName || "Staff",
      });
      setForm(empty);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {expiring.length > 0 && (
        <Card>
          <h3 className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Compliance reminders ({expiring.length})
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {expiring.map((s) => (
              <li key={s.id} className="rounded-lg bg-amber-50 px-3 py-2">
                <strong>{s.companyName}</strong>
                {isExpired(s.insuranceExpiry) && (
                  <span className="ml-2 text-red-600">Insurance expired</span>
                )}
                {isExpiringSoon(s.insuranceExpiry) &&
                  !isExpired(s.insuranceExpiry) && (
                    <span className="ml-2 text-amber-700">
                      Insurance expires {s.insuranceExpiry}
                    </span>
                  )}
                {isExpired(s.licenseExpiry) && (
                  <span className="ml-2 text-red-600">License expired</span>
                )}
                {isExpiringSoon(s.licenseExpiry) &&
                  !isExpired(s.licenseExpiry) && (
                    <span className="ml-2 text-amber-700">
                      License expires {s.licenseExpiry}
                    </span>
                  )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> Add subcontractor
          </h3>
          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <input
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="Company name"
              className="profile-input"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="Contact name"
                className="profile-input"
              />
              <input
                value={form.trade}
                onChange={(e) => set("trade", e.target.value)}
                placeholder="Trade (electric, HVAC…)"
                className="profile-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="Email"
                className="profile-input"
              />
              <PhoneInput
                value={form.phone}
                onChange={(v) => set("phone", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-500">
                Insurance expiry
                <DateInput
                  hideLabel
                  value={form.insuranceExpiry}
                  onChange={(v) => set("insuranceExpiry", v)}
                  className="profile-input date-input mt-1"
                />
              </label>
              <label className="text-xs text-gray-500">
                License expiry
                <DateInput
                  hideLabel
                  value={form.licenseExpiry}
                  onChange={(v) => set("licenseExpiry", v)}
                  className="profile-input date-input mt-1"
                />
              </label>
            </div>
            <input
              value={form.licenseNumber}
              onChange={(e) => set("licenseNumber", e.target.value)}
              placeholder="License #"
              className="profile-input"
            />
            <JobSelect
              jobs={jobs}
              value={form.assignedJobId}
              onChange={(id) => set("assignedJobId", id)}
            />
            <SearchableSelect
              options={SUB_PAYMENT_STATUSES.map((s) => ({
                value: s,
                label: `Payment: ${s}`,
                searchText: s,
              }))}
              value={form.paymentStatus}
              onChange={(v) => set("paymentStatus", v)}
              searchPlaceholder="Search payment status…"
            />
            <textarea
              value={form.contractNotes}
              onChange={(e) => set("contractNotes", e.target.value)}
              rows={2}
              placeholder="Contract notes"
              className="profile-input resize-none"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {saving ? "Saving…" : "Add subcontractor"}
            </button>
          </form>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <HardHat className="h-4 w-4" /> Subcontractors ({subs.length})
          </h3>
          {subs.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No subs on file yet.</p>
          ) : (
            <ul className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">
              {subs.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{s.companyName}</p>
                      <p className="text-xs text-gray-500">
                        {s.trade} · {s.contactName} · {s.phone || s.email}
                      </p>
                    </div>
                    <SearchableSelect
                      compact
                      buttonClassName=""
                      options={SUB_PAYMENT_STATUSES.map((p) => ({
                        value: p,
                        label: p,
                      }))}
                      value={s.paymentStatus}
                      onChange={(v) =>
                        updateSubcontractor(s.id, {
                          paymentStatus: v as Subcontractor["paymentStatus"],
                        })
                      }
                      searchPlaceholder="Search…"
                      className="w-auto"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Insurance: {s.insuranceExpiry || "—"} · License:{" "}
                    {s.licenseExpiry || "—"}
                    {s.licenseNumber ? ` (#${s.licenseNumber})` : ""}
                  </p>
                  {s.assignedJobIds?.length > 0 && (
                    <p className="mt-1 text-xs text-gray-600">
                      Jobs: {s.assignedJobIds.map((id) => `#${id}`).join(", ")}
                    </p>
                  )}
                  {s.performanceNotes && (
                    <p className="mt-1 text-xs text-gray-600">{s.performanceNotes}</p>
                  )}
                  <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                    <span>Added {fmtDate(s.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => deleteSubcontractor(s.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
