"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Plus, Search, Trash2 } from "lucide-react";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_STATUSES,
} from "../../lib/constructionOps";
import {
  addProjectDocument,
  deleteProjectDocument,
  subscribeToProjectDocuments,
  updateProjectDocument,
  type ProjectDocument,
} from "../../lib/firebase/constructionOpsFirestore";
import type { Job } from "../../lib/firebase/firebaseUtils";
import { Card, GREEN, fmtDate, JobSelect, SearchableSelect } from "./opsShared";

const empty = {
  jobId: "",
  name: "",
  category: "drawings" as (typeof DOCUMENT_CATEGORIES)[number],
  externalUrl: "",
  notes: "",
};

export default function ProjectDocumentsPanel({
  jobs,
  userName,
}: {
  jobs: Job[];
  userName: string | null;
}) {
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToProjectDocuments(setDocs), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (jobFilter !== "all" && d.jobId !== jobFilter) return false;
      if (!q) return true;
      return [d.name, d.notes, d.jobTitle, DOCUMENT_CATEGORY_LABELS[d.category]]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [docs, search, jobFilter]);

  const jobTitle = (id: string) =>
    jobs.find((j) => j.jobId === id)?.title ?? "Unknown";

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobId || !form.name.trim()) return;
    setSaving(true);
    try {
      await addProjectDocument({
        jobId: form.jobId,
        jobTitle: jobTitle(form.jobId),
        name: form.name.trim(),
        category: form.category,
        version: 1,
        externalUrl: form.externalUrl.trim(),
        notes: form.notes.trim(),
        status: "draft",
        uploadedBy: userName || "Staff",
      });
      setForm(empty);
    } finally {
      setSaving(false);
    }
  };

  const bumpVersion = (doc: ProjectDocument) => {
    const next = doc.version + 1;
    updateProjectDocument(
      doc.id,
      { version: next, status: "draft" },
      {
        at: Date.now(),
        by: userName || "Staff",
        action: `Uploaded v${next}`,
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-bold">One place for every project file</h3>
        <p className="mt-1 text-sm text-gray-500">
          Drawings, permits, contracts, RFIs, meeting notes, inspections, and
          photos — with version history and activity log. Link to files stored in
          Drive or Dropbox until file upload is enabled.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4" /> Add document
          </h3>
          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <JobSelect
              jobs={jobs}
              value={form.jobId}
              onChange={(id) => setForm((f) => ({ ...f, jobId: id }))}
              required
            />
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Document name"
              className="profile-input"
              required
            />
            <SearchableSelect
              options={DOCUMENT_CATEGORIES.map((c) => ({
                value: c,
                label: DOCUMENT_CATEGORY_LABELS[c],
              }))}
              value={form.category}
              onChange={(category) =>
                setForm((f) => ({
                  ...f,
                  category: category as typeof form.category,
                }))
              }
              searchPlaceholder="Search category…"
            />
            <input
              value={form.externalUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, externalUrl: e.target.value }))
              }
              placeholder="Link to file (Google Drive, Dropbox, etc.)"
              className="profile-input"
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
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {saving ? "Saving…" : "Add document"}
            </button>
          </form>
        </Card>

        <Card>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="w-full rounded-md border py-1.5 pl-8 pr-2 text-sm"
              />
            </div>
            <SearchableSelect
              compact
              buttonClassName="rounded-md border px-2 py-1 text-xs font-semibold"
              options={[
                { value: "all", label: "All jobs" },
                ...jobs.map((j) => ({
                  value: j.jobId,
                  label: `#${j.jobId}`,
                  meta: j.title,
                  searchText: `${j.jobId} ${j.title} ${j.clientName}`,
                })),
              ]}
              value={jobFilter}
              onChange={setJobFilter}
              searchPlaceholder="Search jobs…"
              className="w-auto min-w-[7rem]"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No documents yet.</p>
          ) : (
            <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
              {filtered.map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-gray-100 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 font-semibold text-sm">
                        <FolderOpen className="h-4 w-4 text-brand-primary" />
                        {d.name}{" "}
                        <span className="text-xs text-gray-400">v{d.version}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {DOCUMENT_CATEGORY_LABELS[d.category]} · Job #{d.jobId} ·{" "}
                        {fmtDate(d.updatedAt ?? d.createdAt)}
                      </p>
                    </div>
                    <SearchableSelect
                      compact
                      buttonClassName=""
                      options={DOCUMENT_STATUSES.map((s) => ({
                        value: s,
                        label: s.replace("_", " "),
                      }))}
                      value={d.status}
                      onChange={(status) =>
                        updateProjectDocument(
                          d.id,
                          { status: status as ProjectDocument["status"] },
                          {
                            at: Date.now(),
                            by: userName || "Staff",
                            action: `Status → ${status}`,
                          }
                        )
                      }
                      searchPlaceholder="Search status…"
                      className="w-auto"
                    />
                  </div>
                  {d.externalUrl && (
                    <a
                      href={d.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-xs text-brand-primary hover:underline"
                    >
                      {d.externalUrl}
                    </a>
                  )}
                  {d.activityLog?.length > 0 && (
                    <p className="mt-2 text-[10px] text-gray-400">
                      Last: {d.activityLog[d.activityLog.length - 1]?.action} by{" "}
                      {d.activityLog[d.activityLog.length - 1]?.by}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => bumpVersion(d)}
                      className="text-xs font-semibold text-brand-primary hover:underline"
                    >
                      New version
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProjectDocument(d.id)}
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
    </div>
  );
}
