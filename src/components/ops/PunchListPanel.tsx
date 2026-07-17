"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Plus, Printer, Trash2 } from "lucide-react";
import {
  PUNCH_STATUS_LABELS,
  PUNCH_STATUSES,
  type PunchStatus,
} from "../../lib/constructionOps";
import {
  addPunchListItem,
  deletePunchListItem,
  subscribeToPunchListItems,
  subscribeToSubcontractors,
  updatePunchListItem,
  type PunchListItem,
  type Subcontractor,
} from "../../lib/firebase/constructionOpsFirestore";
import type { Job } from "../../lib/firebase/firebaseUtils";
import DateInput from "../DateInput";
import {
  Card,
  GREEN,
  JobSelect,
  InlineSelect,
  SearchableSelect,
  printPunchListPdf,
} from "./opsShared";

const STATUS_COLORS: Record<PunchStatus, string> = {
  open: "#64748b",
  in_progress: "#2563eb",
  complete: "#059669",
};

const empty = {
  jobId: "",
  location: "",
  description: "",
  assignedSubId: "",
  dueDate: "",
  photoLinks: "",
};

export default function PunchListPanel({
  jobs,
  userName,
  companyName,
}: {
  jobs: Job[];
  userName: string | null;
  companyName: string;
}) {
  const [items, setItems] = useState<PunchListItem[]>([]);
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [form, setForm] = useState(empty);
  const [filterJob, setFilterJob] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToPunchListItems(setItems), []);
  useEffect(() => subscribeToSubcontractors(setSubs), []);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const jobTitle = (id: string) =>
    jobs.find((j) => j.jobId === id)?.title ?? "Unknown job";

  const filtered = useMemo(
    () => (filterJob ? items.filter((i) => i.jobId === filterJob) : items),
    [items, filterJob]
  );

  const openCount = filtered.filter((i) => i.status !== "complete").length;

  const subOptions = useMemo(
    () => [
      { value: "", label: "— Unassigned —" },
      ...subs.map((s) => ({
        value: s.id,
        label: s.companyName,
        searchText: `${s.companyName} ${s.trade}`,
      })),
    ],
    [subs]
  );

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobId || !form.description.trim()) return;
    const sub = subs.find((s) => s.id === form.assignedSubId);
    setSaving(true);
    try {
      await addPunchListItem({
        jobId: form.jobId,
        jobTitle: jobTitle(form.jobId),
        location: form.location.trim(),
        description: form.description.trim(),
        assignedSubId: form.assignedSubId || null,
        assignedSubName: sub?.companyName ?? "",
        dueDate: form.dueDate,
        status: "open",
        photoLinks: form.photoLinks.trim(),
        createdBy: userName || "Staff",
      });
      setForm(empty);
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = () => {
    const job = jobs.find((j) => j.jobId === filterJob);
    if (!filterJob || !job) return;
    printPunchListPdf(
      filtered.map((p) => ({
        location: p.location,
        description: p.description,
        assignedSubName: p.assignedSubName,
        dueDate: p.dueDate,
        status: PUNCH_STATUS_LABELS[p.status],
      })),
      job.title,
      filterJob,
      companyName
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Punch list</h3>
            <p className="text-sm text-gray-500">
              {openCount} open item{openCount === 1 ? "" : "s"}
              {filterJob ? ` · Job #${filterJob}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
            {filterJob && (
              <button
                type="button"
                onClick={exportPdf}
                className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Printer className="h-4 w-4" /> Export PDF
              </button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> Add punch item
          </h3>
          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <JobSelect
              jobs={jobs.filter((j) => j.status === "active")}
              value={form.jobId}
              onChange={(id) => set("jobId", id)}
              required
            />
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Location (room, floor, exterior…)"
              className="profile-input"
            />
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Description of work needed *"
              className="profile-input resize-none"
              required
            />
            <SearchableSelect
              options={subOptions}
              value={form.assignedSubId}
              onChange={(v) => set("assignedSubId", v)}
              placeholder="Assign subcontractor"
              searchPlaceholder="Search subs…"
            />
            <DateInput
              label="Due date"
              value={form.dueDate}
              onChange={(v) => set("dueDate", v)}
            />
            <input
              value={form.photoLinks}
              onChange={(e) => set("photoLinks", e.target.value)}
              placeholder="Photo links"
              className="profile-input"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              Add to punch list
            </button>
          </form>
        </Card>

        <Card>
          <h3 className="font-bold">Items ({filtered.length})</h3>
          <ul className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">
            {filtered.map((p) => (
              <li key={p.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    {p.location && (
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        {p.location}
                      </p>
                    )}
                    <p className="font-semibold">{p.description}</p>
                    <p className="text-xs text-gray-500">
                      Job #{p.jobId}
                      {p.assignedSubName ? ` · ${p.assignedSubName}` : ""}
                      {p.dueDate ? ` · Due ${p.dueDate}` : ""}
                    </p>
                  </div>
                  <InlineSelect
                    value={p.status}
                    options={PUNCH_STATUSES.map((s) => ({
                      value: s,
                      label: PUNCH_STATUS_LABELS[s],
                      color: STATUS_COLORS[s],
                    }))}
                    onChange={(status) =>
                      updatePunchListItem(p.id, {
                        status: status as PunchStatus,
                        completedAt:
                          status === "complete" ? Date.now() : null,
                      })
                    }
                  />
                </div>
                {p.photoLinks && (
                  <p className="mt-1 truncate text-xs text-brand-primary">
                    {p.photoLinks}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  {p.status !== "complete" && (
                    <button
                      type="button"
                      onClick={() =>
                        updatePunchListItem(p.id, {
                          status: "complete",
                          completedAt: Date.now(),
                        })
                      }
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700"
                    >
                      <CheckCircle className="h-3 w-3" /> Mark complete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deletePunchListItem(p.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-500">No punch list items yet.</p>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
