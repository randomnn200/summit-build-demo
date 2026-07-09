"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import {
  CRM_LEAD_SOURCES,
  CRM_PIPELINE_STAGES,
  CRM_STAGE_COLORS,
  CRM_STAGE_LABELS,
  daysInStage,
  type CrmPipelineStage,
} from "../../lib/crm";
import {
  addCrmLead,
  addCrmReminder,
  deleteCrmLead,
  subscribeToCrmLeads,
  updateCrmLead,
  type CrmLead,
} from "../../lib/firebase/crmFirestore";
import {
  subscribeToQuoteRequests,
  updateQuoteRequestStatus,
  type QuoteRequest,
} from "../../lib/firebase/firebaseUtils";
import PhoneInput from "../PhoneInput";
import DateInput from "../DateInput";
import MoneyInput from "../MoneyInput";
import { parseMoneyInput } from "../../lib/formatMoneyInput";
import { Card, GREEN, fmtMoney } from "./crmShared";

const empty = {
  name: "",
  phone: "",
  email: "",
  source: "Phone call" as (typeof CRM_LEAD_SOURCES)[number],
  projectType: "",
  estimatedValue: "",
  notes: "",
  nextFollowUp: "",
};

export default function PipelinePanel({
  userName,
  userEmail,
  onSelectLead,
}: {
  userName: string | null;
  userEmail: string | null;
  onSelectLead?: (id: string) => void;
}) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [form, setForm] = useState(empty);
  const [view, setView] = useState<"board" | "list">("board");

  useEffect(() => {
    const u1 = subscribeToCrmLeads(setLeads);
    const u2 = subscribeToQuoteRequests(setQuoteRequests);
    return () => {
      u1();
      u2();
    };
  }, []);

  const importedIds = useMemo(
    () => new Set(leads.map((l) => l.quoteRequestId).filter(Boolean)),
    [leads]
  );

  const inboxLeads = quoteRequests.filter((q) => !importedIds.has(q.id));

  const byStage = useMemo(() => {
    const map = new Map<CrmPipelineStage, CrmLead[]>();
    for (const s of CRM_PIPELINE_STAGES) map.set(s, []);
    for (const l of leads) {
      const arr = map.get(l.stage) ?? [];
      arr.push(l);
      map.set(l.stage, arr);
    }
    return map;
  }, [leads]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await addCrmLead({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: form.source,
      stage: "new",
      projectType: form.projectType.trim(),
      estimatedValue: parseMoneyInput(form.estimatedValue),
      notes: form.notes.trim(),
      quoteRequestId: null,
      nextFollowUp: form.nextFollowUp,
      assignedTo: userName || userEmail || "Unassigned",
      assignedEmail: userEmail,
      createdBy: userName || userEmail || "Staff",
    });
    setForm(empty);
  };

  const importFromInbox = async (q: QuoteRequest) => {
    await addCrmLead({
      name: q.name,
      phone: q.phone,
      email: "",
      source: "Homepage",
      stage: "new",
      projectType: "Homepage inquiry",
      estimatedValue: 0,
      notes: "",
      quoteRequestId: q.id,
      nextFollowUp: "",
      assignedTo: userName || userEmail || "Unassigned",
      assignedEmail: userEmail,
      createdBy: userName || userEmail || "Staff",
    });
    await updateQuoteRequestStatus(q.id, "contacted");
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 2);
    await addCrmReminder({
      leadId: "",
      leadName: q.name,
      dueDate: followUp.toISOString().slice(0, 10),
      message: `Follow up with ${q.name} — homepage lead`,
      assigneeName: userName || userEmail || "Staff",
      assigneeEmail: userEmail,
      createdBy: userName || userEmail || "Staff",
    });
  };

  const moveStage = (lead: CrmLead, stage: CrmPipelineStage) => {
    updateCrmLead(lead.id, { stage });
    if (stage === "follow_up" || stage === "contacted") {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      addCrmReminder({
        leadId: lead.id,
        leadName: lead.name,
        dueDate: d.toISOString().slice(0, 10),
        message: `Follow up: ${lead.name} — moved to ${CRM_STAGE_LABELS[stage]}`,
        assigneeName: userName || userEmail || "Staff",
        assigneeEmail: userEmail,
        createdBy: userName || userEmail || "Staff",
      });
    }
  };

  return (
    <div className="space-y-6">
      {inboxLeads.length > 0 && (
        <Card>
          <h3 className="font-bold">Import from Lead Inbox ({inboxLeads.length})</h3>
          <p className="mt-1 text-sm text-gray-500">
            Homepage requests not yet in your CRM pipeline.
          </p>
          <ul className="mt-3 space-y-2">
            {inboxLeads.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <span>
                  {q.name} · {q.phone}
                </span>
                <button
                  type="button"
                  onClick={() => importFromInbox(q)}
                  className="rounded-md px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: GREEN }}
                >
                  Add to pipeline
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> New lead
          </h3>
          <form onSubmit={onCreate} className="mt-4 space-y-2">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Name"
              className="profile-input"
              required
            />
            <PhoneInput
              value={form.phone}
              onChange={(v) => set("phone", v)}
            />
            <input
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="Email"
              className="profile-input"
            />
            <select
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              className="profile-input"
            >
              {CRM_LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              value={form.projectType}
              onChange={(e) => set("projectType", e.target.value)}
              placeholder="Project type"
              className="profile-input"
            />
            <MoneyInput
              hideLabel
              value={form.estimatedValue}
              onChange={(v) => set("estimatedValue", v)}
              placeholder="Est. value $"
              className="profile-input money-input"
            />
            <DateInput
              label="Next follow-up"
              value={form.nextFollowUp}
              onChange={(v) => set("nextFollowUp", v)}
            />
            <button
              type="submit"
              className="w-full rounded-md py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Add lead
            </button>
          </form>
        </Card>

        <div>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${view === "board" ? "bg-brand-primary text-white" : "bg-white"}`}
            >
              Pipeline board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${view === "list" ? "bg-brand-primary text-white" : "bg-white"}`}
            >
              List
            </button>
          </div>

          {view === "board" ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {CRM_PIPELINE_STAGES.filter((s) => s !== "lost").map((stage) => (
                <div
                  key={stage}
                  className="min-w-[11rem] flex-shrink-0 rounded-xl border border-gray-100 bg-gray-50/80 p-2"
                >
                  <p
                    className="mb-2 px-1 text-xs font-bold uppercase tracking-wide"
                    style={{ color: CRM_STAGE_COLORS[stage] }}
                  >
                    {CRM_STAGE_LABELS[stage]} ({byStage.get(stage)?.length ?? 0})
                  </p>
                  <ul className="space-y-2">
                    {(byStage.get(stage) ?? []).map((lead) => (
                      <li
                        key={lead.id}
                        className="rounded-lg border border-white bg-white p-2 shadow-sm"
                      >
                        <p className="text-sm font-semibold">{lead.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {lead.projectType || lead.source}
                          {lead.estimatedValue > 0 &&
                            ` · ${fmtMoney(lead.estimatedValue)}`}
                        </p>
                        {daysInStage(lead.stageChangedAt) >= 3 && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-700">
                            <Bell className="h-3 w-3" />
                            {daysInStage(lead.stageChangedAt)}d in stage
                          </p>
                        )}
                        <select
                          value={lead.stage}
                          onChange={(e) =>
                            moveStage(lead, e.target.value as CrmPipelineStage)
                          }
                          className="mt-2 w-full rounded border px-1 py-0.5 text-[10px]"
                        >
                          {CRM_PIPELINE_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {CRM_STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <ul className="space-y-2">
                {leads.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectLead?.(lead.id)}
                      className="text-left text-sm font-semibold hover:underline"
                    >
                      {lead.name} · {CRM_STAGE_LABELS[lead.stage]}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{lead.phone}</span>
                      <button
                        type="button"
                        onClick={() => deleteCrmLead(lead.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
