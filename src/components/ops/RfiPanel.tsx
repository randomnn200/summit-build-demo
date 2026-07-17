"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Mail, Plus, Trash2 } from "lucide-react";
import {
  RFI_STATUS_LABELS,
  RFI_STATUSES,
  generateRfiNumber,
  type RfiStatus,
} from "../../lib/constructionOps";
import {
  addRfi,
  deleteRfi,
  subscribeToProjectDocuments,
  subscribeToRfis,
  updateRfi,
  type Rfi,
} from "../../lib/firebase/constructionOpsFirestore";
import type { Job } from "../../lib/firebase/firebaseUtils";
import DateInput from "../DateInput";
import {
  Card,
  GREEN,
  JobSelect,
  InlineSelect,
  SearchableSelect,
  fmtDate,
  rfiNotificationEmail,
} from "./opsShared";

const STATUS_COLORS: Record<RfiStatus, string> = {
  open: "#2563eb",
  pending: "#f59e0b",
  closed: "#64748b",
};

const empty = {
  jobId: "",
  subject: "",
  question: "",
  assignedTo: "",
  assignedEmail: "",
  dueDate: "",
  drawingLinks: "",
};

export default function RfiPanel({
  jobs,
  userName,
}: {
  jobs: Job[];
  userName: string | null;
}) {
  const [rfis, setRfis] = useState<Rfi[]>([]);
  const [drawings, setDrawings] = useState<{ id: string; label: string }[]>([]);
  const [form, setForm] = useState(empty);
  const [filterJob, setFilterJob] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToRfis(setRfis), []);
  useEffect(
    () =>
      subscribeToProjectDocuments((docs) =>
        setDrawings(
          docs
            .filter((d) => d.category === "drawings")
            .map((d) => ({
              id: d.id,
              label: `#${d.jobId} · ${d.name} v${d.version}`,
            }))
        )
      ),
    []
  );

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const jobTitle = (id: string) =>
    jobs.find((j) => j.jobId === id)?.title ?? "Unknown job";

  const filtered = useMemo(
    () => (filterJob ? rfis.filter((r) => r.jobId === filterJob) : rfis),
    [rfis, filterJob]
  );

  const overdue = useMemo(
    () =>
      filtered.filter(
        (r) =>
          r.status !== "closed" &&
          r.dueDate &&
          r.dueDate < new Date().toISOString().slice(0, 10)
      ),
    [filtered]
  );

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobId || !form.subject.trim() || !form.assignedTo.trim()) return;
    setSaving(true);
    try {
      const count = rfis.filter((r) => r.jobId === form.jobId).length;
      const rfiNumber = generateRfiNumber(form.jobId, count);
      await addRfi({
        jobId: form.jobId,
        jobTitle: jobTitle(form.jobId),
        rfiNumber,
        subject: form.subject.trim(),
        question: form.question.trim(),
        assignedTo: form.assignedTo.trim(),
        assignedEmail: form.assignedEmail.trim() || null,
        dueDate: form.dueDate,
        status: "open",
        drawingLinks: form.drawingLinks.trim(),
        createdBy: userName || "Staff",
      });
      setForm(empty);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <Card>
          <h3 className="flex items-center gap-2 font-bold text-amber-800">
            <Bell className="h-4 w-4" /> Overdue RFIs ({overdue.length})
          </h3>
          <ul className="mt-3 space-y-1 text-sm">
            {overdue.map((r) => (
              <li key={r.id}>
                {r.rfiNumber} · {r.subject} · due {r.dueDate}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> New RFI
          </h3>
          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <JobSelect
              jobs={jobs.filter((j) => j.status === "active")}
              value={form.jobId}
              onChange={(id) => set("jobId", id)}
              required
            />
            <input
              value={form.subject}
              onChange={(e) => set("subject", e.target.value)}
              placeholder="Subject"
              className="profile-input"
              required
            />
            <textarea
              value={form.question}
              onChange={(e) => set("question", e.target.value)}
              rows={3}
              placeholder="Question / clarification needed"
              className="profile-input resize-none"
            />
            <input
              value={form.assignedTo}
              onChange={(e) => set("assignedTo", e.target.value)}
              placeholder="Who must respond (name)"
              className="profile-input"
              required
            />
            <input
              value={form.assignedEmail}
              onChange={(e) => set("assignedEmail", e.target.value)}
              placeholder="Responder email (optional)"
              className="profile-input"
            />
            <DateInput
              label="Due date"
              value={form.dueDate}
              onChange={(v) => set("dueDate", v)}
            />
            {drawings.length > 0 && (
              <SearchableSelect
                options={[
                  { value: "", label: "— Link drawing (optional) —" },
                  ...drawings
                    .filter((d) => !form.jobId || d.label.startsWith(`#${form.jobId}`))
                    .map((d) => ({ value: d.id, label: d.label })),
                ]}
                value={form.drawingLinks}
                onChange={(v) => set("drawingLinks", v)}
                placeholder="Link to drawing"
                searchPlaceholder="Search drawings…"
              />
            )}
            <input
              value={form.drawingLinks.startsWith("http") ? form.drawingLinks : ""}
              onChange={(e) => set("drawingLinks", e.target.value)}
              placeholder="Or paste drawing URL"
              className="profile-input"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              Create RFI (auto-numbered)
            </button>
          </form>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">RFIs ({filtered.length})</h3>
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
          <ul className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{r.rfiNumber}</p>
                    <p className="font-semibold">{r.subject}</p>
                    <p className="text-xs text-gray-500">
                      Job #{r.jobId} · Assigned: {r.assignedTo}
                      {r.dueDate ? ` · Due ${r.dueDate}` : ""}
                    </p>
                  </div>
                  <InlineSelect
                    value={r.status}
                    options={RFI_STATUSES.map((s) => ({
                      value: s,
                      label: RFI_STATUS_LABELS[s],
                      color: STATUS_COLORS[s],
                    }))}
                    onChange={(status) =>
                      updateRfi(
                        r.id,
                        { status: status as RfiStatus },
                        {
                          at: Date.now(),
                          by: userName || "Staff",
                          action: `Status → ${RFI_STATUS_LABELS[status as RfiStatus]}`,
                        }
                      )
                    }
                  />
                </div>
                {r.question && (
                  <p className="mt-2 text-gray-600">{r.question}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={rfiNotificationEmail(r)}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold text-brand-primary hover:underline"
                  >
                    <Mail className="h-3 w-3" /> Email notification
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteRfi(r.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {r.activityLog?.length > 0 && (
                  <ul className="mt-2 border-t pt-2 text-[10px] text-gray-400">
                    {r.activityLog.slice(-4).map((a, i) => (
                      <li key={i}>
                        {new Date(a.at).toLocaleString()} — {a.by}: {a.action}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-[10px] text-gray-400">
                  Created {fmtDate(r.createdAt)}
                </p>
              </li>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-500">No RFIs yet.</p>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
