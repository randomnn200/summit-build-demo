"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { WEATHER_OPTIONS } from "../../lib/constructionOps";
import { todayIso } from "../../lib/dates";
import {
  addDailyReport,
  deleteDailyReport,
  subscribeToDailyReports,
  type DailyReport,
} from "../../lib/firebase/constructionOpsFirestore";
import type { Job } from "../../lib/firebase/firebaseUtils";
import DateInput from "../DateInput";
import { Card, GREEN, JobSelect, fmtDate } from "./opsShared";

const empty = {
  jobId: "",
  reportDate: todayIso(),
  weather: "Clear",
  crewOnSite: "",
  workCompleted: "",
  delays: "",
  visitors: "",
  safetyIncidents: "",
  photoLinks: "",
  notes: "",
};

export default function DailyReportsPanel({
  jobs,
  userName,
  userEmail,
}: {
  jobs: Job[];
  userName: string | null;
  userEmail: string | null;
}) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [form, setForm] = useState(empty);
  const [filterJob, setFilterJob] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToDailyReports(setReports), []);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const jobTitle = (id: string) =>
    jobs.find((j) => j.jobId === id)?.title ?? "Unknown job";

  const filtered = useMemo(
    () => (filterJob ? reports.filter((r) => r.jobId === filterJob) : reports),
    [reports, filterJob]
  );

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobId || !form.reportDate || !form.workCompleted.trim()) return;
    setSaving(true);
    try {
      await addDailyReport({
        jobId: form.jobId,
        jobTitle: jobTitle(form.jobId),
        reportDate: form.reportDate,
        weather: form.weather,
        crewOnSite: form.crewOnSite.trim(),
        workCompleted: form.workCompleted.trim(),
        delays: form.delays.trim(),
        visitors: form.visitors.trim(),
        safetyIncidents: form.safetyIncidents.trim(),
        photoLinks: form.photoLinks.trim(),
        notes: form.notes.trim(),
        submittedBy: userName || userEmail || "Superintendent",
        submittedByEmail: userEmail,
      });
      setForm({ ...empty, reportDate: todayIso() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="flex items-center gap-2 font-bold">
          <Plus className="h-4 w-4" /> Daily field report
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          One report per superintendent per day — invaluable if disputes arise later.
        </p>
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <JobSelect
            jobs={jobs.filter((j) => j.status === "active")}
            value={form.jobId}
            onChange={(id) => set("jobId", id)}
            required
          />
          <DateInput
            label="Report date"
            value={form.reportDate}
            onChange={(v) => set("reportDate", v)}
          />
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Weather</span>
            <select
              value={form.weather}
              onChange={(e) => set("weather", e.target.value)}
              className="profile-input mt-1"
            >
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <input
            value={form.crewOnSite}
            onChange={(e) => set("crewOnSite", e.target.value)}
            placeholder="Crew members on site"
            className="profile-input"
          />
          <textarea
            value={form.workCompleted}
            onChange={(e) => set("workCompleted", e.target.value)}
            rows={3}
            placeholder="Work completed today *"
            className="profile-input resize-none"
            required
          />
          <textarea
            value={form.delays}
            onChange={(e) => set("delays", e.target.value)}
            rows={2}
            placeholder="Delays (weather, materials, etc.)"
            className="profile-input resize-none"
          />
          <input
            value={form.visitors}
            onChange={(e) => set("visitors", e.target.value)}
            placeholder="Visitors on site"
            className="profile-input"
          />
          <textarea
            value={form.safetyIncidents}
            onChange={(e) => set("safetyIncidents", e.target.value)}
            rows={2}
            placeholder="Safety incidents (or “None”)"
            className="profile-input resize-none"
          />
          <input
            value={form.photoLinks}
            onChange={(e) => set("photoLinks", e.target.value)}
            placeholder="Photo links (Drive, Dropbox, etc.)"
            className="profile-input"
          />
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Additional notes"
            className="profile-input resize-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: GREEN }}
          >
            Submit daily report
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold">
            <Calendar className="h-4 w-4" /> Report history ({filtered.length})
          </h3>
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
        <ul className="mt-4 max-h-[36rem] space-y-3 overflow-y-auto">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-xl border border-gray-100 p-3 text-sm">
              <p className="font-bold">
                {r.reportDate} · Job #{r.jobId}
              </p>
              <p className="text-xs text-gray-500">
                {r.weather} · {r.submittedBy} · {fmtDate(r.createdAt)}
              </p>
              <p className="mt-2">{r.workCompleted}</p>
              {r.delays && (
                <p className="mt-1 text-amber-800">
                  <strong>Delays:</strong> {r.delays}
                </p>
              )}
              {r.safetyIncidents && (
                <p className="mt-1 text-red-700">
                  <strong>Safety:</strong> {r.safetyIncidents}
                </p>
              )}
              {r.crewOnSite && (
                <p className="mt-1 text-gray-600">Crew: {r.crewOnSite}</p>
              )}
              {r.visitors && (
                <p className="mt-1 text-gray-600">Visitors: {r.visitors}</p>
              )}
              {r.photoLinks && (
                <p className="mt-1 truncate text-xs text-brand-primary">
                  {r.photoLinks}
                </p>
              )}
              <button
                type="button"
                onClick={() => deleteDailyReport(r.id)}
                className="mt-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500">No daily reports yet.</p>
          )}
        </ul>
      </Card>
    </div>
  );
}
