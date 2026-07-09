"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import {
  addScheduleItem,
  addTimeOffRequest,
  deleteScheduleItem,
  subscribeToJobs,
  subscribeToScheduleItems,
  subscribeToTimeOffRequests,
  updateTimeOffRequestStatus,
  type Job,
  type Role,
  type RolesConfig,
  type ScheduleItem,
  type TimeOffRequest,
} from "../lib/firebase/firebaseUtils";
import DateInput from "./DateInput";

const GREEN = "var(--brand-primary)";
const RED = "var(--brand-accent)";

const emptyScheduleForm = {
  title: "",
  date: "",
  time: "",
  location: "",
  assigneeEmail: "",
  notes: "",
  jobId: "",
  postalCode: "",
};

const emptyTimeOffForm = {
  startDate: "",
  endDate: "",
  reason: "",
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold">{children}</h2>;
}

function ScheduleList({
  items,
  jobsById,
  loading,
  canDelete,
  onDelete,
  emptyMessage,
}: {
  items: ScheduleItem[];
  jobsById: Map<string, Job>;
  loading: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  emptyMessage: string;
}) {
  if (loading) {
    return <p className="mt-4 text-sm text-gray-500">Loading…</p>;
  }
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">{emptyMessage}</p>;
  }
  return (
    <ul className="mt-4 space-y-3">
      {items.map((i) => {
        const job = i.jobId ? jobsById.get(i.jobId) : undefined;
        return (
          <li key={i.id} className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{i.title}</p>
                <p className="text-xs font-medium" style={{ color: GREEN }}>
                  {i.date} {i.time && `· ${i.time}`}
                </p>
              </div>
              {canDelete && (
                <button
                  onClick={() => onDelete(i.id)}
                  className="text-gray-400 transition hover:text-red-500"
                  aria-label="Delete schedule item"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-gray-500">
              {i.jobId && (
                <p>
                  🏷️ Job #{i.jobId}
                  {job ? ` · ${job.clientName}` : ""}
                </p>
              )}
              {i.postalCode && <p>📮 {i.postalCode}</p>}
              {i.location && <p>📍 {i.location}</p>}
              {i.assignee && <p>👷 {i.assignee}</p>}
              {i.notes && <p className="text-gray-700">{i.notes}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function ScheduleTab({
  role,
  userName,
  userEmail,
  config,
}: {
  role: Role;
  userName: string | null;
  userEmail: string | null;
  config: RolesConfig;
}) {
  const isOwner = role === "owner";
  const myEmail = userEmail?.trim().toLowerCase() ?? "";

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyScheduleForm);
  const [timeOffForm, setTimeOffForm] = useState(emptyTimeOffForm);
  const [saving, setSaving] = useState(false);
  const [timeOffSaving, setTimeOffSaving] = useState(false);
  const [timeOffError, setTimeOffError] = useState("");
  const [ownerView, setOwnerView] = useState<"mine" | "team">("team");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  useEffect(() => {
    const unsubSchedule = subscribeToScheduleItems((list) => {
      setItems(list);
      setLoading(false);
    });
    const unsubJobs = subscribeToJobs(setJobs);
    const unsubTimeOff = subscribeToTimeOffRequests(setTimeOff);
    return () => {
      unsubSchedule();
      unsubJobs();
      unsubTimeOff();
    };
  }, []);

  useEffect(() => {
    if (isOwner && config.employeeEmails.length > 0 && !selectedEmployee) {
      setSelectedEmployee(config.employeeEmails[0]);
    }
  }, [isOwner, config.employeeEmails, selectedEmployee]);

  const jobsById = useMemo(
    () => new Map(jobs.map((j) => [j.jobId, j])),
    [jobs]
  );

  const employeeOptions = useMemo(() => {
    const list = config.employeeEmails.map((email) => ({
      email,
      label:
        config.employeeTitles[email] ||
        email.split("@")[0]?.replace(/\./g, " ") ||
        email,
    }));
    if (isOwner && myEmail && !list.some((e) => e.email === myEmail)) {
      list.unshift({ email: myEmail, label: userName || "Owner" });
    }
    return list;
  }, [config, isOwner, myEmail, userName]);

  const labelForEmail = (email: string) =>
    employeeOptions.find((e) => e.email === email)?.label ?? email;

  const mySchedule = useMemo(
    () => items.filter((i) => i.assigneeEmail === myEmail),
    [items, myEmail]
  );

  const teamSchedule = useMemo(
    () =>
      selectedEmployee
        ? items.filter((i) => i.assigneeEmail === selectedEmployee)
        : [],
    [items, selectedEmployee]
  );

  const myTimeOff = useMemo(
    () => timeOff.filter((t) => t.employeeEmail === myEmail),
    [timeOff, myEmail]
  );

  const pendingTimeOff = useMemo(
    () => timeOff.filter((t) => t.status === "pending"),
    [timeOff]
  );

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onJobChange = (jobId: string) => {
    set("jobId", jobId);
    const job = jobsById.get(jobId);
    if (job) {
      setForm((f) => ({
        ...f,
        jobId,
        title: f.title || job.title,
        postalCode: job.postalCode,
        location: f.location || job.postalCode,
      }));
    }
  };

  const onAssigneeChange = (email: string) => {
    set("assigneeEmail", email);
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.assigneeEmail) return;
    const job = form.jobId ? jobsById.get(form.jobId) : undefined;
    setSaving(true);
    try {
      await addScheduleItem({
        title: form.title.trim(),
        date: form.date,
        time: form.time,
        location: form.location,
        assignee: labelForEmail(form.assigneeEmail),
        assigneeEmail: form.assigneeEmail,
        notes: form.notes,
        jobId: form.jobId || null,
        clientUid: job?.clientUid ?? null,
        postalCode: form.postalCode || job?.postalCode || "",
      });
      setForm(emptyScheduleForm);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteScheduleItem(id);
    } catch (e) {
      console.error(e);
    }
  };

  const onTimeOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTimeOffError("");
    if (!timeOffForm.startDate || !timeOffForm.endDate) {
      setTimeOffError("Start and end dates are required.");
      return;
    }
    if (timeOffForm.endDate < timeOffForm.startDate) {
      setTimeOffError("End date must be on or after start date.");
      return;
    }
    if (!timeOffForm.reason.trim()) {
      setTimeOffError("Please briefly describe your request.");
      return;
    }
    setTimeOffSaving(true);
    try {
      await addTimeOffRequest({
        employeeEmail: myEmail,
        employeeName: userName || myEmail,
        startDate: timeOffForm.startDate,
        endDate: timeOffForm.endDate,
        reason: timeOffForm.reason.trim(),
      });
      setTimeOffForm(emptyTimeOffForm);
    } catch (err) {
      console.error(err);
      setTimeOffError("Could not submit request.");
    } finally {
      setTimeOffSaving(false);
    }
  };

  const reviewTimeOff = async (
    req: TimeOffRequest,
    status: "approved" | "denied"
  ) => {
    try {
      await updateTimeOffRequestStatus(
        req.id,
        status,
        userName || userEmail || "Owner"
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
          <CalendarClock className="h-5 w-5 text-brand-primary" />
          Schedule
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isOwner
            ? "Assign work to your team and review each employee's calendar. Link entries to jobs by ID."
            : "Your assigned jobs and time off requests."}
        </p>
      </div>

      {isOwner && pendingTimeOff.length > 0 && (
        <Card>
          <SectionTitle>Time off requests ({pendingTimeOff.length})</SectionTitle>
          <ul className="mt-4 space-y-3">
            {pendingTimeOff.map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{req.employeeName}</p>
                  <p className="text-xs text-gray-600">
                    {req.startDate} → {req.endDate} · {req.reason}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewTimeOff(req, "approved")}
                    className="rounded-md px-3 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: GREEN }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewTimeOff(req, "denied")}
                    className="rounded-md px-3 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: RED }}
                  >
                    Deny
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!isOwner && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle>My schedule</SectionTitle>
            <ScheduleList
              items={mySchedule}
              jobsById={jobsById}
              loading={loading}
              canDelete={false}
              onDelete={onDelete}
              emptyMessage="Nothing assigned to you yet."
            />
          </Card>
          <Card>
            <SectionTitle>Request time off</SectionTitle>
            <form onSubmit={onTimeOffSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <DateInput
                  label="Start date"
                  value={timeOffForm.startDate}
                  onChange={(startDate) =>
                    setTimeOffForm((f) => ({ ...f, startDate }))
                  }
                />
                <DateInput
                  label="End date"
                  value={timeOffForm.endDate}
                  onChange={(endDate) =>
                    setTimeOffForm((f) => ({ ...f, endDate }))
                  }
                />
              </div>
              <textarea
                value={timeOffForm.reason}
                onChange={(e) =>
                  setTimeOffForm((f) => ({ ...f, reason: e.target.value }))
                }
                rows={2}
                placeholder="Reason (e.g. family vacation, doctor appointment)"
                className="profile-input resize-none"
              />
              {timeOffError && (
                <p className="text-xs font-semibold text-red-600">{timeOffError}</p>
              )}
              <button
                type="submit"
                disabled={timeOffSaving}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: GREEN }}
              >
                {timeOffSaving ? "Submitting…" : "Submit request"}
              </button>
            </form>
            {myTimeOff.length > 0 && (
              <>
                <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Your requests
                </p>
                <ul className="mt-2 space-y-2">
                  {myTimeOff.map((req) => (
                    <li
                      key={req.id}
                      className="rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold capitalize">{req.status}</span>
                      <span className="text-gray-500">
                        {" "}
                        · {req.startDate} → {req.endDate}
                      </span>
                      <p className="text-xs text-gray-600">{req.reason}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      )}

      {isOwner && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOwnerView("team")}
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={
                ownerView === "team"
                  ? { backgroundColor: GREEN, color: "white" }
                  : { backgroundColor: "white", color: "#374151" }
              }
            >
              Team schedules
            </button>
            <button
              onClick={() => setOwnerView("mine")}
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={
                ownerView === "mine"
                  ? { backgroundColor: GREEN, color: "white" }
                  : { backgroundColor: "white", color: "#374151" }
              }
            >
              My schedule
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle>Schedule a job</SectionTitle>
              <form onSubmit={onAdd} className="mt-4 space-y-3">
                <select
                  value={form.jobId}
                  onChange={(e) => onJobChange(e.target.value)}
                  className="profile-input"
                >
                  <option value="">— Link to job (optional) —</option>
                  {jobs
                    .filter((j) => j.status === "active")
                    .map((j) => (
                      <option key={j.jobId} value={j.jobId}>
                        #{j.jobId} · {j.title} · {j.postalCode}
                      </option>
                    ))}
                </select>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Title"
                  className="profile-input"
                />
                <div className="grid grid-cols-2 gap-3">
                  <DateInput
                    label="Date"
                    value={form.date}
                    onChange={(date) => set("date", date)}
                    required
                  />
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Time</span>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => set("time", e.target.value)}
                      className="profile-input time-input mt-1"
                    />
                  </label>
                </div>
                <input
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Location / address"
                  className="profile-input"
                />
                <input
                  value={form.postalCode}
                  onChange={(e) => set("postalCode", e.target.value)}
                  placeholder="Postal code"
                  className="profile-input"
                />
                <select
                  value={form.assigneeEmail}
                  onChange={(e) => onAssigneeChange(e.target.value)}
                  className="profile-input"
                  required
                >
                  <option value="">— Assign to —</option>
                  {employeeOptions.map((e) => (
                    <option key={e.email} value={e.email}>
                      {e.label} ({e.email})
                    </option>
                  ))}
                </select>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={2}
                  placeholder="Notes"
                  className="profile-input resize-none"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: GREEN }}
                >
                  <Plus size={16} />
                  {saving ? "Saving…" : "Add to schedule"}
                </button>
              </form>
            </Card>

            <Card>
              {ownerView === "team" ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <SectionTitle>Employee schedule</SectionTitle>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="rounded-md border border-gray-200 px-2 py-1.5 text-xs font-semibold"
                    >
                      {employeeOptions.map((e) => (
                        <option key={e.email} value={e.email}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedEmployee && (
                    <>
                      {timeOff
                        .filter(
                          (t) =>
                            t.employeeEmail === selectedEmployee &&
                            t.status === "approved"
                        )
                        .length > 0 && (
                        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                          Approved time off:{" "}
                          {timeOff
                            .filter(
                              (t) =>
                                t.employeeEmail === selectedEmployee &&
                                t.status === "approved"
                            )
                            .map((t) => `${t.startDate}–${t.endDate}`)
                            .join(", ")}
                        </div>
                      )}
                      <ScheduleList
                        items={teamSchedule}
                        jobsById={jobsById}
                        loading={loading}
                        canDelete
                        onDelete={onDelete}
                        emptyMessage="No jobs scheduled for this employee."
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <SectionTitle>My schedule ({mySchedule.length})</SectionTitle>
                  <ScheduleList
                    items={mySchedule}
                    jobsById={jobsById}
                    loading={loading}
                    canDelete
                    onDelete={onDelete}
                    emptyMessage="Nothing on your calendar."
                  />
                </>
              )}
            </Card>
          </div>

          <Card>
            <SectionTitle>All upcoming ({items.length})</SectionTitle>
            <ScheduleList
              items={items}
              jobsById={jobsById}
              loading={loading}
              canDelete
              onDelete={onDelete}
              emptyMessage="Nothing scheduled."
            />
          </Card>
        </>
      )}
    </div>
  );
}
