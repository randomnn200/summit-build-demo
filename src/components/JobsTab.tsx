"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus, Search, Trash2 } from "lucide-react";
import { buildClientDirectory } from "../lib/clientDirectory";
import { JOB_STATUSES, JOB_STATUS_LABELS, type JobStatus } from "../lib/jobs";
import {
  createJob,
  deleteJob,
  getAllUsers,
  subscribeToAllTickets,
  subscribeToJobs,
  subscribeToScheduleItems,
  updateJob,
  type Job,
  type Role,
  type ScheduleItem,
} from "../lib/firebase/firebaseUtils";
import { SearchableSelect } from "./ops/opsShared";

const GREEN = "var(--brand-primary)";
const RED = "var(--brand-accent)";

function fmtDate(ts: { seconds: number } | null) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const emptyForm = {
  title: "",
  clientUid: "",
  postalCode: "",
  status: "active" as JobStatus,
  notes: "",
};

export default function JobsTab({
  userName,
  userEmail,
  role,
}: {
  userName: string | null;
  userEmail: string | null;
  role: Role;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [clients, setClients] = useState<
    ReturnType<typeof buildClientDirectory>
  >([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingDelete, setPendingDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let unsubTickets: (() => void) | undefined;
    getAllUsers()
      .then((users) => {
        unsubTickets = subscribeToAllTickets((tickets) => {
          setClients(buildClientDirectory(users, tickets));
        });
      })
      .catch(console.error);
    const unsubJobs = subscribeToJobs((list) => {
      setJobs(list);
      setLoading(false);
    });
    const unsubSchedule = subscribeToScheduleItems(setSchedule);
    return () => {
      unsubTickets?.();
      unsubJobs();
      unsubSchedule();
    };
  }, []);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onClientChange = (uid: string) => {
    set("clientUid", uid);
    const client = clients.find((c) => c.uid === uid);
    if (client && !form.title) {
      set("title", `${client.name} job`);
    }
  };

  const scheduleCount = (jobId: string) =>
    schedule.filter((s) => s.jobId === jobId).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (!q) return true;
      return [
        j.jobId,
        j.title,
        j.clientName,
        j.postalCode,
        j.clientEmail,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [jobs, search, statusFilter]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!form.postalCode.trim()) {
      setError("Postal code is required.");
      return;
    }
    const client =
      form.clientUid && form.clientUid !== "__manual__"
        ? clients.find((c) => c.uid === form.clientUid)
        : null;
    setSaving(true);
    try {
      await createJob({
        title: form.title.trim(),
        clientUid: client?.uid ?? null,
        clientName: client?.name ?? "Unassigned client",
        clientEmail: client?.email ?? null,
        postalCode: form.postalCode.trim(),
        status: form.status,
        notes: form.notes.trim() || undefined,
        createdBy: userName || userEmail || "Staff",
        createdByEmail: userEmail,
      });
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
      setError("Could not create job. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const onStatusChange = async (job: Job, status: JobStatus) => {
    try {
      await updateJob(job.jobId, { status });
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteJob(pendingDelete.jobId);
      setPendingDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="brand-bar" />
            <div className="p-6">
              <h3 className="text-lg font-bold">Delete job #{pendingDelete.jobId}?</h3>
              <p className="mt-2 text-sm text-gray-600">
                This removes the job record. Schedule entries linked to this job
                will keep their data but lose the link.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  disabled={deleting}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: RED }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
          <Briefcase className="h-5 w-5 text-brand-primary" />
          Jobs
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Each job gets a unique numeric ID. Link jobs to a client, postal code,
          and schedule entries from the Schedule tab.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {role === "owner" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold">Create job</h3>
            <form onSubmit={onCreate} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Client</span>
                <div className="mt-1">
                  <SearchableSelect
                    options={[
                      ...clients.map((c) => ({
                        value: c.uid,
                        label: c.name,
                        meta: c.email || undefined,
                        searchText: `${c.name} ${c.email ?? ""}`,
                      })),
                      { value: "__manual__", label: "No client / TBD" },
                    ]}
                    value={form.clientUid}
                    onChange={onClientChange}
                    placeholder="— Select client —"
                    searchPlaceholder="Search by name or email…"
                  />
                </div>
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Job title"
                className="profile-input"
              />
              <input
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
                placeholder="Postal code (e.g. 90210)"
                className="profile-input"
              />
              <SearchableSelect
                options={JOB_STATUSES.map((s) => ({
                  value: s,
                  label: JOB_STATUS_LABELS[s],
                }))}
                value={form.status}
                onChange={(status) => set("status", status)}
                searchPlaceholder="Search status…"
              />
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                placeholder="Notes"
                className="profile-input resize-none"
              />
              {error && (
                <p className="text-xs font-semibold text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: GREEN }}
              >
                <Plus size={16} />
                {saving ? "Creating…" : "Create job"}
              </button>
            </form>
          </div>
        )}

        <div
          className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${
            role !== "owner" ? "lg:col-span-2" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold">All jobs ({filtered.length})</h3>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-200 px-2 py-1.5 text-xs font-semibold"
              >
                <option value="all">All statuses</option>
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {JOB_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, client, postal…"
                  className="rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-xs"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Loading jobs…</p>
          ) : filtered.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              {jobs.length === 0
                ? "No jobs yet. Create one to get a numeric job ID."
                : "No jobs match your filters."}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {filtered.map((j) => (
                <li
                  key={j.jobId}
                  className="rounded-xl border border-gray-100 p-4"
                  style={{ borderLeftColor: GREEN, borderLeftWidth: 4 }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        #{j.jobId} · {j.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {j.clientName}
                        {j.clientEmail ? ` · ${j.clientEmail}` : ""}
                      </p>
                    </div>
                    {role === "owner" && (
                      <div className="flex items-center gap-2">
                        <select
                          value={j.status}
                          onChange={(e) =>
                            onStatusChange(j, e.target.value as JobStatus)
                          }
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold capitalize"
                        >
                          {JOB_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {JOB_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setPendingDelete(j)}
                          className="text-gray-400 hover:text-red-500"
                          aria-label="Delete job"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>📮 {j.postalCode}</span>
                    <span>📅 {scheduleCount(j.jobId)} on schedule</span>
                    <span>Created {fmtDate(j.createdAt)}</span>
                  </div>
                  {j.notes && (
                    <p className="mt-2 text-sm text-gray-600">{j.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
