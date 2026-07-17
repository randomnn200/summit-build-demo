"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Download,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../lib/hooks/useAuth";
import { useRole } from "../lib/hooks/useRole";
import { useClientJobs } from "../lib/hooks/useClientJobs";
import { isStaffRole } from "../lib/portalAccess";
import { JOB_STATUS_LABELS } from "../lib/jobs";
import {
  CHANGE_ORDER_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  changeOrderTotal,
} from "../lib/constructionOps";
import {
  subscribeToChangeOrders,
  subscribeToProjectDocuments,
  subscribeToDailyReports,
  type ChangeOrder,
  type ProjectDocument,
  type DailyReport,
} from "../lib/firebase/constructionOpsFirestore";
import {
  addClientMessage,
  clientRespondToChangeOrder,
  subscribeToClientMessages,
  type ClientMessage,
} from "../lib/firebase/clientPortalFirestore";
import {
  subscribeToScheduleItems,
  type ScheduleItem,
} from "../lib/firebase/firebaseUtils";
import { CLIENT_PORTAL_TABS, type ClientPortalTab } from "../lib/clientPortal";
import SignInWithGoogle from "./SignInWithGoogle";
import { companyInitials } from "../lib/theme";

const GREEN = "var(--brand-primary)";

function fmtDate(ts: { seconds: number } | null) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function parsePhotoLinks(raw: string) {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

export default function ClientPortal() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const { jobs, loading: jobsLoading, hasProjects } = useClientJobs();
  const [tab, setTab] = useState<ClientPortalTab>("overview");
  const [selectedJobId, setSelectedJobId] = useState("");

  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [coBusy, setCoBusy] = useState<string | null>(null);

  useEffect(() => {
    if (jobs.length && !selectedJobId) setSelectedJobId(jobs[0].jobId);
  }, [jobs, selectedJobId]);

  const selectedJob = jobs.find((j) => j.jobId === selectedJobId) ?? jobs[0];

  useEffect(() => {
    const unsubCo = subscribeToChangeOrders(setChangeOrders);
    const unsubDocs = subscribeToProjectDocuments(setDocuments);
    const unsubDr = subscribeToDailyReports(setDailyReports);
    const unsubSched = subscribeToScheduleItems(setSchedule);
    return () => {
      unsubCo();
      unsubDocs();
      unsubDr();
      unsubSched();
    };
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setMessages([]);
      return;
    }
    return subscribeToClientMessages(selectedJobId, setMessages);
  }, [selectedJobId]);

  const jobChangeOrders = useMemo(
    () => changeOrders.filter((co) => co.jobId === selectedJobId),
    [changeOrders, selectedJobId]
  );

  const jobDocuments = useMemo(
    () => documents.filter((d) => d.jobId === selectedJobId),
    [documents, selectedJobId]
  );

  const jobReports = useMemo(
    () => dailyReports.filter((r) => r.jobId === selectedJobId),
    [dailyReports, selectedJobId]
  );

  const jobSchedule = useMemo(
    () =>
      schedule
        .filter((s) => s.jobId === selectedJobId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [schedule, selectedJobId]
  );

  const clientPhotos = useMemo(() => {
    const fromDocs = jobDocuments
      .filter((d) => d.category === "photos" && d.externalUrl)
      .map((d) => ({
        url: d.externalUrl,
        label: d.name,
        date: fmtDate(d.createdAt),
      }));
    const fromReports = jobReports.flatMap((r) =>
      parsePhotoLinks(r.photoLinks).map((url) => ({
        url,
        label: r.reportDate,
        date: r.reportDate,
      }))
    );
    return [...fromDocs, ...fromReports];
  }, [jobDocuments, jobReports]);

  const clientDocs = useMemo(
    () =>
      jobDocuments.filter(
        (d) => d.status !== "draft" && d.category !== "photos" && d.externalUrl
      ),
    [jobDocuments]
  );

  const pendingCos = jobChangeOrders.filter(
    (co) => co.status === "pending_approval"
  );

  const loading = authLoading || roleLoading || jobsLoading;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !messageDraft.trim() || !user) return;
    setSending(true);
    try {
      await addClientMessage({
        jobId: selectedJob.jobId,
        jobTitle: selectedJob.title,
        senderRole: "client",
        senderName: user.displayName || user.email || "Client",
        senderEmail: user.email,
        message: messageDraft.trim(),
      });
      setMessageDraft("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const respondToCo = async (co: ChangeOrder, approved: boolean) => {
    setCoBusy(co.id);
    try {
      await clientRespondToChangeOrder(
        co.id,
        approved,
        user?.displayName || user?.email || "Client"
      );
    } catch (err) {
      console.error(err);
    } finally {
      setCoBusy(null);
    }
  };

  if (loading) {
    return (
      <Shell>
        <p className="py-24 text-center text-gray-500">Loading your project…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <Gate
          title="Client sign-in"
          message="Sign in with the Google account your builder used when they created your project."
        >
          <SignInWithGoogle />
        </Gate>
      </Shell>
    );
  }

  if (!hasProjects) {
    return (
      <Shell user={user} onSignOut={signOut}>
        <Gate
          title="No project linked yet"
          message={`You're signed in as ${user.email}. Once your builder creates a job and links it to your account, your project portal will appear here and on the homepage.`}
        >
          <Link
            href="/"
            className="font-semibold underline"
            style={{ color: GREEN }}
          >
            Back to homepage
          </Link>
        </Gate>
      </Shell>
    );
  }

  const previewAsStaff = isStaffRole(role);

  return (
    <Shell user={user} onSignOut={signOut} previewAsStaff={previewAsStaff}>
      {previewAsStaff && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Previewing the client view — this is what your customer sees for linked
          projects.{" "}
          <Link href="/portal" className="font-semibold underline">
            Back to employee portal
          </Link>
        </div>
      )}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-black text-gray-900">My project</h1>
        <p className="mt-1 text-sm text-gray-500">
          Progress, photos, documents, change orders, and messages — all in one
          place.
        </p>
        {jobs.length > 1 && (
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="profile-input mt-4 max-w-md"
          >
            {jobs.map((j) => (
              <option key={j.jobId} value={j.jobId}>
                #{j.jobId} · {j.title}
              </option>
            ))}
          </select>
        )}
        {selectedJob && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              {selectedJob.title}
            </span>
            <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-bold text-brand-primary">
              {JOB_STATUS_LABELS[selectedJob.status]}
            </span>
            <span className="text-xs text-gray-400">Job #{selectedJob.jobId}</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {CLIENT_PORTAL_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200"
            style={
              tab === t.id
                ? { backgroundColor: GREEN, color: "white" }
                : { backgroundColor: "white", color: "#374151" }
            }
          >
            {t.label}
            {t.id === "change_orders" && pendingCos.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                {pendingCos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && selectedJob && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Project progress">
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                Status: <strong>{JOB_STATUS_LABELS[selectedJob.status]}</strong>
              </li>
              <li>
                {jobReports.length} daily field report
                {jobReports.length === 1 ? "" : "s"} on file
              </li>
              <li>
                {jobChangeOrders.filter((co) => co.status === "approved").length}{" "}
                approved change order
                {jobChangeOrders.filter((co) => co.status === "approved")
                  .length === 1
                  ? ""
                  : "s"}
              </li>
              <li>{clientDocs.length} shared documents</li>
              <li>{clientPhotos.length} photos available</li>
            </ul>
            {jobReports[0] && (
              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Latest update · {jobReports[0].reportDate}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  {jobReports[0].workCompleted || "No work log for this day."}
                </p>
              </div>
            )}
          </Card>
          <Card title="Upcoming on site">
            {jobSchedule.length === 0 ? (
              <p className="text-sm text-gray-500">No scheduled items yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {jobSchedule.slice(0, 6).map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-gray-100 px-3 py-2"
                  >
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-xs text-gray-500">
                      {s.date}
                      {s.time ? ` · ${s.time}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "photos" && (
        <Card title="Project photos" className="mt-6">
          {clientPhotos.length === 0 ? (
            <p className="text-sm text-gray-500">
              Photos will appear here when your builder uploads them.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clientPhotos.map((p, i) => (
                <a
                  key={`${p.url}-${i}`}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.label}
                    className="aspect-video w-full object-cover transition group-hover:scale-[1.02]"
                  />
                  <p className="px-3 py-2 text-xs text-gray-500">{p.label}</p>
                </a>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "documents" && (
        <Card title="Documents" className="mt-6">
          {clientDocs.length === 0 ? (
            <p className="text-sm text-gray-500">No documents shared yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {clientDocs.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500">
                      {DOCUMENT_CATEGORY_LABELS[d.category]} · v{d.version} ·{" "}
                      {fmtDate(d.createdAt)}
                    </p>
                  </div>
                  <a
                    href={d.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "change_orders" && (
        <Card title="Change orders" className="mt-6">
          {jobChangeOrders.filter((co) => co.status !== "draft").length === 0 ? (
            <p className="text-sm text-gray-500">No change orders yet.</p>
          ) : (
            <ul className="space-y-4">
              {jobChangeOrders
                .filter((co) => co.status !== "draft")
                .map((co) => (
                  <li
                    key={co.id}
                    className="rounded-2xl border border-gray-100 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900">{co.title}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {co.description}
                        </p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-gray-700">
                        {CHANGE_ORDER_STATUS_LABELS[co.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-800">
                      {fmtMoney(changeOrderTotal(co))}
                    </p>
                    {co.status === "pending_approval" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={coBusy === co.id}
                          onClick={() => respondToCo(co, true)}
                          className="rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          style={{ backgroundColor: GREEN }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={coBusy === co.id}
                          onClick={() => respondToCo(co, false)}
                          className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "invoices" && (
        <Card title="Invoices" className="mt-6">
          {jobChangeOrders.filter(
            (co) => co.invoiceStatus !== "not_invoiced" && co.status === "approved"
          ).length === 0 ? (
            <p className="text-sm text-gray-500">
              Invoices will appear here when change orders are billed.
            </p>
          ) : (
            <ul className="space-y-3">
              {jobChangeOrders
                .filter(
                  (co) =>
                    co.invoiceStatus !== "not_invoiced" &&
                    co.status === "approved"
                )
                .map((co) => (
                  <li
                    key={co.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold">{co.title}</p>
                      <p className="text-xs text-gray-500">
                        {INVOICE_STATUS_LABELS[co.invoiceStatus]}
                      </p>
                    </div>
                    <p className="text-sm font-bold">
                      {fmtMoney(changeOrderTotal(co))}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "messages" && selectedJob && (
        <Card title="Messages" className="mt-6">
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-gray-50 p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">
                No messages yet. Send a note to your project team.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.senderRole === "client"
                      ? "ml-auto bg-brand-primary text-white"
                      : "bg-white text-gray-800 shadow-sm"
                  }`}
                >
                  <p className="text-[10px] font-semibold opacity-80">
                    {m.senderName} · {fmtDate(m.createdAt)}
                  </p>
                  <p className="mt-1">{m.message}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={sendMessage} className="mt-4 flex gap-2">
            <input
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              placeholder="Ask for an update, share a question…"
              className="profile-input flex-1"
            />
            <button
              type="submit"
              disabled={sending || !messageDraft.trim()}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              Send
            </button>
          </form>
        </Card>
      )}
    </Shell>
  );
}

function Shell({
  children,
  user,
  onSignOut,
  previewAsStaff = false,
}: {
  children: React.ReactNode;
  user?: { email: string | null; displayName: string | null };
  onSignOut?: () => void;
  previewAsStaff?: boolean;
}) {
  const initials = companyInitials("Summit Build Co.");
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="brand-bar" />
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-black text-white"
              style={{ backgroundColor: GREEN }}
            >
              {initials}
            </span>
            <div>
              <p className="text-sm font-extrabold leading-tight">
                Client Portal
              </p>
              <p className="text-xs text-gray-500">Summit Build Co.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
              <Home size={16} />
              <span className="hidden sm:inline">Site</span>
            </Link>
            {user && (
              <span
                className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-flex ${
                  previewAsStaff
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <ShieldCheck size={12} className="mr-1" />
                {previewAsStaff ? "Staff preview" : "Client"}
              </span>
            )}
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}

function Gate({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-black text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}
    >
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
        {title.includes("photo") && <Camera className="h-4 w-4" />}
        {title.includes("Document") && <FileText className="h-4 w-4" />}
        {title.includes("Invoice") && <Receipt className="h-4 w-4" />}
        {title.includes("Message") && <MessageSquare className="h-4 w-4" />}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
