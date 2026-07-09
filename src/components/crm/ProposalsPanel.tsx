"use client";

import { useEffect, useState } from "react";
import { FileCheck, Plus, Printer, Send, Trash2 } from "lucide-react";
import { PROPOSAL_STATUSES } from "../../lib/crm";
import {
  addCrmProposal,
  deleteCrmProposal,
  subscribeToCrmEstimates,
  subscribeToCrmLeads,
  subscribeToCrmProposals,
  updateCrmLead,
  updateCrmProposal,
  type CrmEstimate,
  type CrmLead,
  type CrmProposal,
} from "../../lib/firebase/crmFirestore";
import {
  Card,
  GREEN,
  LeadSelect,
  fmtDate,
  fmtMoney,
  printProposalHtml,
} from "./crmShared";
import DateInput from "../DateInput";
import MoneyInput from "../MoneyInput";
import { moneyInputFromNumber, parseMoneyInput } from "../../lib/formatMoneyInput";

const empty = {
  leadId: "",
  estimateId: "",
  title: "",
  amount: "",
  validUntil: "",
  scopeNotes: "",
};

export default function ProposalsPanel({
  userName,
  companyName,
  preselectedLeadId,
}: {
  userName: string | null;
  companyName: string;
  preselectedLeadId?: string;
}) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [estimates, setEstimates] = useState<CrmEstimate[]>([]);
  const [proposals, setProposals] = useState<CrmProposal[]>([]);
  const [form, setForm] = useState({ ...empty, leadId: preselectedLeadId ?? "" });

  useEffect(() => {
    const u1 = subscribeToCrmLeads(setLeads);
    const u2 = subscribeToCrmEstimates(setEstimates);
    const u3 = subscribeToCrmProposals(setProposals);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const leadEstimates = estimates.filter((e) => e.leadId === form.leadId);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leadId || !form.title.trim()) return;
    const lead = leads.find((l) => l.id === form.leadId);
    const est = estimates.find((x) => x.id === form.estimateId);
    await addCrmProposal({
      leadId: form.leadId,
      leadName: lead?.name ?? "Lead",
      estimateId: form.estimateId || null,
      title: form.title.trim(),
      amount: parseMoneyInput(form.amount) || est?.amount || 0,
      status: "draft",
      validUntil: form.validUntil,
      scopeNotes: form.scopeNotes.trim() || est?.notes || "",
      createdBy: userName || "Staff",
    });
    setForm({ ...empty, leadId: form.leadId });
  };

  const markSent = async (p: CrmProposal) => {
    await updateCrmProposal(p.id, { status: "sent" });
    await updateCrmLead(p.leadId, { stage: "proposal_sent" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="flex items-center gap-2 font-bold">
          <Plus className="h-4 w-4" /> New proposal
        </h3>
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <LeadSelect
            leads={leads}
            value={form.leadId}
            onChange={(id) => setForm((f) => ({ ...f, leadId: id, estimateId: "" }))}
            required
          />
          {leadEstimates.length > 0 && (
            <select
              value={form.estimateId}
              onChange={(e) => {
                const est = estimates.find((x) => x.id === e.target.value);
                setForm((f) => ({
                  ...f,
                  estimateId: e.target.value,
                  title: est ? est.title : f.title,
                  amount: est ? moneyInputFromNumber(est.amount) : f.amount,
                  scopeNotes: est?.notes ?? f.scopeNotes,
                }));
              }}
              className="profile-input"
            >
              <option value="">— Link estimate (optional) —</option>
              {leadEstimates.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.title} · {fmtMoney(est.amount)}
                </option>
              ))}
            </select>
          )}
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Proposal title"
            className="profile-input"
            required
          />
          <MoneyInput
            hideLabel
            value={form.amount}
            onChange={(amount) => setForm((f) => ({ ...f, amount }))}
            placeholder="Amount $"
            className="profile-input money-input"
          />
          <DateInput
            label="Valid until"
            value={form.validUntil}
            onChange={(v) => setForm((f) => ({ ...f, validUntil: v }))}
          />
          <textarea
            value={form.scopeNotes}
            onChange={(e) => setForm((f) => ({ ...f, scopeNotes: e.target.value }))}
            rows={4}
            placeholder="Scope of work"
            className="profile-input resize-none"
          />
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: GREEN }}
          >
            Create proposal
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="flex items-center gap-2 font-bold">
          <FileCheck className="h-4 w-4" /> Proposals ({proposals.length})
        </h3>
        {proposals.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No proposals yet.</p>
        ) : (
          <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
            {proposals.map((p) => (
              <li key={p.id} className="rounded-xl border border-gray-100 p-3">
                <p className="font-semibold text-sm">{p.title}</p>
                <p className="text-xs text-gray-500">
                  {p.leadName} · {fmtMoney(p.amount)} · {fmtDate(p.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    value={p.status}
                    onChange={(e) =>
                      updateCrmProposal(p.id, {
                        status: e.target.value as CrmProposal["status"],
                      })
                    }
                    className="rounded border px-1 py-0.5 text-[10px] font-semibold capitalize"
                  >
                    {PROPOSAL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      printProposalHtml(
                        p.title,
                        companyName,
                        p.leadName,
                        fmtMoney(p.amount),
                        p.scopeNotes,
                        p.validUntil || "—"
                      )
                    }
                    className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold"
                  >
                    <Printer className="h-3 w-3" /> PDF
                  </button>
                  {p.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => markSent(p)}
                      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: GREEN }}
                    >
                      <Send className="h-3 w-3" /> Mark sent
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteCrmProposal(p.id)}
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
