"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Plus, Trash2 } from "lucide-react";
import { isReminderDue, isReminderOverdue } from "../../lib/crm";
import {
  addCrmReminder,
  completeCrmReminder,
  deleteCrmReminder,
  subscribeToCrmLeads,
  subscribeToCrmReminders,
  type CrmLead,
  type CrmReminder,
} from "../../lib/firebase/crmFirestore";
import { Card, GREEN, LeadSelect, RED } from "./crmShared";
import DateInput from "../DateInput";

const empty = {
  leadId: "",
  dueDate: "",
  message: "",
};

export default function RemindersPanel({
  userName,
  userEmail,
}: {
  userName: string | null;
  userEmail: string | null;
}) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [reminders, setReminders] = useState<CrmReminder[]>([]);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState<"due" | "all">("due");

  useEffect(() => {
    const u1 = subscribeToCrmLeads(setLeads);
    const u2 = subscribeToCrmReminders(setReminders);
    return () => {
      u1();
      u2();
    };
  }, []);

  const dueReminders = useMemo(
    () => reminders.filter((r) => isReminderDue(r.dueDate, r.completed)),
    [reminders]
  );

  const overdue = useMemo(
    () => dueReminders.filter((r) => isReminderOverdue(r.dueDate, r.completed)),
    [dueReminders]
  );

  const displayed =
    filter === "due"
      ? reminders.filter((r) => !r.completed)
      : reminders;

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dueDate || !form.message.trim()) return;
    const lead = leads.find((l) => l.id === form.leadId);
    await addCrmReminder({
      leadId: form.leadId,
      leadName: lead?.name ?? "General",
      dueDate: form.dueDate,
      message: form.message.trim(),
      assigneeName: userName || userEmail || "Staff",
      assigneeEmail: userEmail,
      createdBy: userName || userEmail || "Staff",
    });
    setForm(empty);
  };

  return (
    <div className="space-y-6">
      {(overdue.length > 0 || dueReminders.length > 0) && (
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Bell className="h-4 w-4 text-amber-600" />
            Automated follow-up queue
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {overdue.length > 0
              ? `${overdue.length} overdue · ${dueReminders.length} due today or past`
              : `${dueReminders.length} reminder(s) need action`}
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> Schedule reminder
          </h3>
          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <LeadSelect
              leads={leads}
              value={form.leadId}
              onChange={(id) => setForm((f) => ({ ...f, leadId: id }))}
            />
            <DateInput
              label="Due date"
              value={form.dueDate}
              onChange={(dueDate) => setForm((f) => ({ ...f, dueDate }))}
              required
            />
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={2}
              placeholder="e.g. Call back about kitchen remodel estimate"
              className="profile-input resize-none"
              required
            />
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Add reminder
            </button>
          </form>
          <p className="mt-3 text-xs text-gray-400">
            Reminders are also created when leads sit 3+ days in a stage or move to
            follow-up.
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold">Reminders</h3>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded border px-2 py-1 text-xs font-semibold"
            >
              <option value="due">Open</option>
              <option value="all">All</option>
            </select>
          </div>
          {displayed.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No reminders.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {displayed.map((r) => {
                const overdueFlag = isReminderOverdue(r.dueDate, r.completed);
                return (
                  <li
                    key={r.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      r.completed
                        ? "border-gray-100 bg-gray-50 opacity-60"
                        : overdueFlag
                          ? "border-red-200 bg-red-50"
                          : "border-amber-100 bg-amber-50"
                    }`}
                  >
                    <p className="font-semibold">{r.leadName}</p>
                    <p className="text-xs text-gray-600">{r.message}</p>
                    <p className="text-[10px] text-gray-400">
                      Due {r.dueDate} · {r.assigneeName}
                    </p>
                    {!r.completed && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => completeCrmReminder(r.id)}
                          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: GREEN }}
                        >
                          <Check className="h-3 w-3" /> Done
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCrmReminder(r.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
