"use client";

import { useEffect, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { ESTIMATE_STATUSES } from "../../lib/crm";
import {
  addCrmEstimate,
  deleteCrmEstimate,
  subscribeToCrmEstimates,
  subscribeToCrmLeads,
  updateCrmEstimate,
  updateCrmLead,
  type CrmEstimate,
  type CrmLead,
} from "../../lib/firebase/crmFirestore";
import { Card, GREEN, LeadSelect, fmtMoney, fmtDate } from "./crmShared";
import DateInput from "../DateInput";
import MoneyInput from "../MoneyInput";
import { parseMoneyInput } from "../../lib/formatMoneyInput";

const empty = {
  leadId: "",
  title: "",
  amount: "",
  lowAmount: "",
  highAmount: "",
  validUntil: "",
  notes: "",
};

export default function EstimatesPanel({
  userName,
  preselectedLeadId,
}: {
  userName: string | null;
  preselectedLeadId?: string;
}) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [estimates, setEstimates] = useState<CrmEstimate[]>([]);
  const [form, setForm] = useState({ ...empty, leadId: preselectedLeadId ?? "" });

  useEffect(() => {
    const u1 = subscribeToCrmLeads(setLeads);
    const u2 = subscribeToCrmEstimates(setEstimates);
    return () => {
      u1();
      u2();
    };
  }, []);

  useEffect(() => {
    if (preselectedLeadId) setForm((f) => ({ ...f, leadId: preselectedLeadId }));
  }, [preselectedLeadId]);

  const leadName = (id: string) => leads.find((l) => l.id === id)?.name ?? "Lead";

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leadId || !form.title.trim()) return;
    await addCrmEstimate({
      leadId: form.leadId,
      leadName: leadName(form.leadId),
      title: form.title.trim(),
      amount: parseMoneyInput(form.amount),
      lowAmount: parseMoneyInput(form.lowAmount) || parseMoneyInput(form.amount),
      highAmount: parseMoneyInput(form.highAmount) || parseMoneyInput(form.amount),
      status: "draft",
      validUntil: form.validUntil,
      notes: form.notes.trim(),
      createdBy: userName || "Staff",
    });
    setForm({ ...empty, leadId: form.leadId });
  };

  const markSent = async (est: CrmEstimate) => {
    await updateCrmEstimate(est.id, { status: "sent" });
    await updateCrmLead(est.leadId, { stage: "estimate_sent" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="flex items-center gap-2 font-bold">
          <Plus className="h-4 w-4" /> New estimate
        </h3>
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <LeadSelect
            leads={leads}
            value={form.leadId}
            onChange={(id) => setForm((f) => ({ ...f, leadId: id }))}
            required
          />
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Estimate title"
            className="profile-input"
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <MoneyInput
              hideLabel
              value={form.lowAmount}
              onChange={(lowAmount) => setForm((f) => ({ ...f, lowAmount }))}
              placeholder="Low $"
              className="profile-input money-input"
            />
            <MoneyInput
              hideLabel
              value={form.amount}
              onChange={(amount) => setForm((f) => ({ ...f, amount }))}
              placeholder="Mid $"
              className="profile-input money-input"
            />
            <MoneyInput
              hideLabel
              value={form.highAmount}
              onChange={(highAmount) => setForm((f) => ({ ...f, highAmount }))}
              placeholder="High $"
              className="profile-input money-input"
            />
          </div>
          <DateInput
            label="Valid until"
            value={form.validUntil}
            onChange={(v) => setForm((f) => ({ ...f, validUntil: v }))}
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Notes"
            className="profile-input resize-none"
          />
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: GREEN }}
          >
            Save estimate
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="font-bold">Estimates ({estimates.length})</h3>
        {estimates.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No estimates yet.</p>
        ) : (
          <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
            {estimates.map((est) => (
              <li key={est.id} className="rounded-xl border border-gray-100 p-3">
                <p className="font-semibold text-sm">{est.title}</p>
                <p className="text-xs text-gray-500">
                  {est.leadName} · {fmtMoney(est.lowAmount)} – {fmtMoney(est.highAmount)} ·{" "}
                  {fmtDate(est.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    value={est.status}
                    onChange={(e) =>
                      updateCrmEstimate(est.id, {
                        status: e.target.value as CrmEstimate["status"],
                      })
                    }
                    className="rounded border px-1 py-0.5 text-[10px] font-semibold capitalize"
                  >
                    {ESTIMATE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {est.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => markSent(est)}
                      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: GREEN }}
                    >
                      <Send className="h-3 w-3" /> Mark sent
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteCrmEstimate(est.id)}
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
  );
}
