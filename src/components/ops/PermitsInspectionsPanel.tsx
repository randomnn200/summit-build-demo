"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_RESULTS,
  PERMIT_STATUS_LABELS,
  PERMIT_STATUSES,
  daysUntil,
  isExpiringSoon,
  type InspectionResult,
  type PermitStatus,
} from "../../lib/constructionOps";
import {
  addInspection,
  addPermit,
  deleteInspection,
  deletePermit,
  subscribeToInspections,
  subscribeToPermits,
  updateInspection,
  updatePermit,
  type Inspection,
  type Permit,
} from "../../lib/firebase/constructionOpsFirestore";
import type { Job } from "../../lib/firebase/firebaseUtils";
import DateInput from "../DateInput";
import { Card, GREEN, JobSelect, InlineSelect } from "./opsShared";

const PERMIT_COLORS: Record<PermitStatus, string> = {
  pending: "#64748b",
  active: "#059669",
  expired: "#dc2626",
  closed: "#94a3b8",
};

const INSP_COLORS: Record<InspectionResult, string> = {
  scheduled: "#2563eb",
  passed: "#059669",
  failed: "#dc2626",
  cancelled: "#64748b",
};

export default function PermitsInspectionsPanel({
  jobs,
  userName,
}: {
  jobs: Job[];
  userName: string | null;
}) {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filterJob, setFilterJob] = useState("");
  const [permitForm, setPermitForm] = useState({
    jobId: "",
    permitNumber: "",
    permitType: "Building",
    issuedDate: "",
    expirationDate: "",
    notes: "",
  });
  const [inspForm, setInspForm] = useState({
    jobId: "",
    permitId: "",
    inspectionType: "",
    scheduledDate: "",
    inspectorNotes: "",
  });

  useEffect(() => subscribeToPermits(setPermits), []);
  useEffect(() => subscribeToInspections(setInspections), []);

  const jobTitle = (id: string) =>
    jobs.find((j) => j.jobId === id)?.title ?? "Unknown job";

  const jobPermits = useMemo(
    () => (filterJob ? permits.filter((p) => p.jobId === filterJob) : permits),
    [permits, filterJob]
  );

  const jobInspections = useMemo(
    () =>
      filterJob ? inspections.filter((i) => i.jobId === filterJob) : inspections,
    [inspections, filterJob]
  );

  const expiring = useMemo(
    () =>
      jobPermits.filter(
        (p) => p.status === "active" && isExpiringSoon(p.expirationDate, 30)
      ),
    [jobPermits]
  );

  const upcoming = useMemo(
    () =>
      jobInspections.filter(
        (i) =>
          i.result === "scheduled" &&
          i.scheduledDate >= new Date().toISOString().slice(0, 10)
      ),
    [jobInspections]
  );

  const addPermitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitForm.jobId || !permitForm.permitNumber.trim()) return;
    await addPermit({
      jobId: permitForm.jobId,
      jobTitle: jobTitle(permitForm.jobId),
      permitNumber: permitForm.permitNumber.trim(),
      permitType: permitForm.permitType.trim(),
      issuedDate: permitForm.issuedDate,
      expirationDate: permitForm.expirationDate,
      status: "active",
      notes: permitForm.notes.trim(),
      createdBy: userName || "Staff",
    });
    setPermitForm({
      jobId: "",
      permitNumber: "",
      permitType: "Building",
      issuedDate: "",
      expirationDate: "",
      notes: "",
    });
  };

  const addInspRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspForm.jobId || !inspForm.inspectionType.trim()) return;
    await addInspection({
      jobId: inspForm.jobId,
      jobTitle: jobTitle(inspForm.jobId),
      permitId: inspForm.permitId || null,
      inspectionType: inspForm.inspectionType.trim(),
      scheduledDate: inspForm.scheduledDate,
      result: "scheduled",
      inspectorNotes: inspForm.inspectorNotes.trim(),
      createdBy: userName || "Staff",
    });
    setInspForm({
      jobId: "",
      permitId: "",
      inspectionType: "",
      scheduledDate: "",
      inspectorNotes: "",
    });
  };

  return (
    <div className="space-y-6">
      {(expiring.length > 0 || upcoming.length > 0) && (
        <Card>
          <h3 className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4" /> Reminders
          </h3>
          {expiring.length > 0 && (
            <p className="mt-2 text-sm">
              <strong>Permits expiring soon:</strong>{" "}
              {expiring.map((p) => `${p.permitNumber} (${p.expirationDate})`).join(", ")}
            </p>
          )}
          {upcoming.length > 0 && (
            <p className="mt-1 text-sm">
              <strong>Upcoming inspections:</strong>{" "}
              {upcoming.map((i) => `${i.inspectionType} ${i.scheduledDate}`).join(", ")}
            </p>
          )}
        </Card>
      )}

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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> Add permit
          </h3>
          <form onSubmit={addPermitRecord} className="mt-4 space-y-3">
            <JobSelect
              jobs={jobs.filter((j) => j.status === "active")}
              value={permitForm.jobId}
              onChange={(id) => setPermitForm((f) => ({ ...f, jobId: id }))}
              required
            />
            <input
              value={permitForm.permitNumber}
              onChange={(e) =>
                setPermitForm((f) => ({ ...f, permitNumber: e.target.value }))
              }
              placeholder="Permit number *"
              className="profile-input"
              required
            />
            <input
              value={permitForm.permitType}
              onChange={(e) =>
                setPermitForm((f) => ({ ...f, permitType: e.target.value }))
              }
              placeholder="Type (Building, Electrical…)"
              className="profile-input"
            />
            <DateInput
              label="Issued date"
              value={permitForm.issuedDate}
              onChange={(v) => setPermitForm((f) => ({ ...f, issuedDate: v }))}
            />
            <DateInput
              label="Expiration date"
              value={permitForm.expirationDate}
              onChange={(v) =>
                setPermitForm((f) => ({ ...f, expirationDate: v }))
              }
            />
            <textarea
              value={permitForm.notes}
              onChange={(e) => setPermitForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Notes"
              className="profile-input resize-none"
            />
            <button
              type="submit"
              className="w-full rounded-md py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Save permit
            </button>
          </form>

          <ul className="mt-6 space-y-2">
            {jobPermits.map((p) => {
              const days = daysUntil(p.expirationDate);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
                >
                  <div>
                    <strong>{p.permitNumber}</strong> · {p.permitType}
                    <p className="text-xs text-gray-500">
                      Job #{p.jobId}
                      {p.expirationDate ? ` · Exp ${p.expirationDate}` : ""}
                      {days != null && days >= 0 && days <= 30 && (
                        <span className="text-amber-600"> · {days}d left</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <InlineSelect
                      value={p.status}
                      options={PERMIT_STATUSES.map((s) => ({
                        value: s,
                        label: PERMIT_STATUS_LABELS[s],
                        color: PERMIT_COLORS[s],
                      }))}
                      onChange={(status) =>
                        updatePermit(p.id, { status: status as PermitStatus })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => deletePermit(p.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
            {jobPermits.length === 0 && (
              <p className="text-sm text-gray-500">No permits tracked.</p>
            )}
          </ul>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> Schedule inspection
          </h3>
          <form onSubmit={addInspRecord} className="mt-4 space-y-3">
            <JobSelect
              jobs={jobs.filter((j) => j.status === "active")}
              value={inspForm.jobId}
              onChange={(id) =>
                setInspForm((f) => ({ ...f, jobId: id, permitId: "" }))
              }
              required
            />
            <select
              value={inspForm.permitId}
              onChange={(e) =>
                setInspForm((f) => ({ ...f, permitId: e.target.value }))
              }
              className="profile-input"
            >
              <option value="">— Link permit (optional) —</option>
              {permits
                .filter((p) => !inspForm.jobId || p.jobId === inspForm.jobId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.permitNumber} ({p.permitType})
                  </option>
                ))}
            </select>
            <input
              value={inspForm.inspectionType}
              onChange={(e) =>
                setInspForm((f) => ({ ...f, inspectionType: e.target.value }))
              }
              placeholder="Inspection type (Framing, Final…)"
              className="profile-input"
              required
            />
            <DateInput
              label="Scheduled date"
              value={inspForm.scheduledDate}
              onChange={(v) => setInspForm((f) => ({ ...f, scheduledDate: v }))}
            />
            <textarea
              value={inspForm.inspectorNotes}
              onChange={(e) =>
                setInspForm((f) => ({ ...f, inspectorNotes: e.target.value }))
              }
              rows={2}
              placeholder="Inspector notes"
              className="profile-input resize-none"
            />
            <button
              type="submit"
              className="w-full rounded-md py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Schedule inspection
            </button>
          </form>

          <ul className="mt-6 space-y-2">
            {jobInspections.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
              >
                <div>
                  <strong>{i.inspectionType}</strong>
                  <p className="text-xs text-gray-500">
                    Job #{i.jobId} · {i.scheduledDate || "TBD"}
                  </p>
                  {i.inspectorNotes && (
                    <p className="text-xs text-gray-600">{i.inspectorNotes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <InlineSelect
                    value={i.result}
                    options={INSPECTION_RESULTS.map((s) => ({
                      value: s,
                      label: INSPECTION_RESULT_LABELS[s],
                      color: INSP_COLORS[s],
                    }))}
                    onChange={(result) =>
                      updateInspection(i.id, {
                        result: result as InspectionResult,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => deleteInspection(i.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
            {jobInspections.length === 0 && (
              <p className="text-sm text-gray-500">No inspections scheduled.</p>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
