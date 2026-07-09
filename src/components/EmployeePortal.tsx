"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  HardHat,
  BarChart3,
  Calculator,
  CalendarClock,
  ClipboardList,
  Contact,
  Handshake,
  Home,
  Inbox,
  Mail,
  MapPin,
  Package,
  Palette,
  Receipt,
  LogOut,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../lib/hooks/useAuth";
import { useRole } from "../lib/hooks/useRole";
import { useTheme } from "../lib/hooks/useTheme";
import PhoneInput from "./PhoneInput";
import { companyInitials, THEME_PRESETS } from "../lib/theme";
import {
  computeAnalyticsMetrics,
  formatWeekLabel,
  fmtAnalyticsMoney,
  getWeekId,
  normalizeAnalyticsMetrics,
  snapshotFromMetrics,
  type AnalyticsMetrics,
  type AnalyticsWeeklySnapshot,
} from "../lib/analyticsMetrics";
import { GoogleReviewsPanelTrigger } from "./GoogleReviewsPanel";
import GoogleReviewsTab from "./GoogleReviewsTab";
import InventoryTab from "./InventoryTab";
import ExpensesTab from "./ExpensesTab";
import QuoteHelperTab from "./QuoteHelperTab";
import JobsTab from "./JobsTab";
import ScheduleTab from "./ScheduleTab";
import ProjectOpsTab from "./ProjectOpsTab";
import CrmTab from "./CrmTab";
import AnalyticsReport from "./AnalyticsReport";
import {
  addCallNote,
  addEmployee,
  addTicketResponse,
  deleteCallNote,
  deleteQuoteRequest,
  deleteTicket,
  clearTicketDeletionRequest,
  getAllUsers,
  getCallNotes,
  companyTicketState,
  getUserProfile,
  isEnvOwner,
  markTicketViewedByCompany,
  removeEmployee,
  requestTicketDeletion,
  roleForEmail,
  setEmployeeTitle,
  setUserRole,
  subscribeToAllTickets,
  subscribeToAllUsers,
  subscribeToCallNotes,
  subscribeToExpenses,
  subscribeToInventoryItems,
  subscribeToJobs,
  subscribeToPurchaseOrders,
  subscribeToQuoteRequests,
  subscribeToSavedQuotes,
  subscribeToScheduleItems,
  subscribeToTicket,
  subscribeToTimeOffRequests,
  saveWeeklyAnalyticsSnapshot,
  subscribeToWeeklyAnalyticsSnapshots,
  ticketStatuses,
  updateQuoteRequestStatus,
  updateTicketStatus,
  type CallNote,
  type Expense,
  type InventoryItem,
  type Job,
  type PurchaseOrder,
  type QuoteRequest,
  type QuoteRequestStatus,
  type SavedQuote,
  type Role,
  type RolesConfig,
  type ScheduleItem,
  type StoredUser,
  type Ticket,
  type TicketResponse,
  type TimeOffRequest,
  type UserProfile,
} from "../lib/firebase/firebaseUtils";
import {
  subscribeToChangeOrders,
  subscribeToJobBudgets,
  subscribeToProjectDocuments,
  subscribeToSubcontractors,
  subscribeToToolCheckouts,
  type ChangeOrder,
  type JobBudget,
  type ProjectDocument,
  type Subcontractor,
  type ToolCheckout,
} from "../lib/firebase/constructionOpsFirestore";
import {
  subscribeToCrmEstimates,
  subscribeToCrmLeads,
  subscribeToCrmProposals,
  subscribeToCrmReminders,
  type CrmEstimate,
  type CrmLead,
  type CrmProposal,
  type CrmReminder,
} from "../lib/firebase/crmFirestore";

const GREEN = "var(--brand-primary)";
const RED = "var(--brand-accent)";

type Tab = "tickets" | "clients" | "leads" | "crm" | "calls" | "jobs" | "ops" | "schedule" | "inventory" | "expenses" | "quotes" | "reviews" | "analytics" | "users" | "team" | "settings";

function fmtDate(createdAt: { seconds: number } | null) {
  if (!createdAt?.seconds) return "—";
  return new Date(createdAt.seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EmployeePortal() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { role, config, setConfig, loading: roleLoading, error } = useRole();
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>("tickets");
  const [analyticsWide, setAnalyticsWide] = useState(false);

  useEffect(() => {
    if (tab !== "analytics") setAnalyticsWide(false);
  }, [tab]);

  const loading = authLoading || roleLoading;
  const isStaff = role === "owner" || role === "employee";

  // Gate the whole portal.
  if (loading) {
    return (
      <PortalShell>
        <div className="py-24 text-center text-gray-500">Loading portal…</div>
      </PortalShell>
    );
  }

  if (!user) {
    return (
      <PortalShell>
        <Gate
          title="Employee sign-in"
          message="Sign in with your work Google account to access the portal."
        >
          <button
            onClick={signInWithGoogle}
            className="mx-auto flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-2.5 font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
              className="h-5 w-5"
            />
            Sign in with Google
          </button>
        </Gate>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell>
        <Gate title="Couldn't load portal" message={error}>
          <p className="text-sm text-gray-500">
            Make sure Firestore is set up, then refresh.
          </p>
        </Gate>
      </PortalShell>
    );
  }

  if (!isStaff) {
    return (
      <PortalShell>
        <Gate
          title="No access"
          message={`You're signed in as ${user.email}, but this account doesn't have employee access. Ask the owner to add you.`}
        >
          <Link
            href="/"
            className="font-semibold underline"
            style={{ color: GREEN }}
          >
            Back to site
          </Link>
        </Gate>
      </PortalShell>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
    { id: "tickets", label: "Tickets", icon: <ClipboardList size={16} /> },
    { id: "clients", label: "Clients", icon: <Contact size={16} /> },
    { id: "leads", label: "Lead Inbox", icon: <Inbox size={16} /> },
    { id: "crm", label: "CRM", icon: <Handshake size={16} /> },
    { id: "calls", label: "Call Notes", icon: <Phone size={16} /> },
    { id: "jobs", label: "Jobs", icon: <Briefcase size={16} /> },
    { id: "ops", label: "Project Ops", icon: <HardHat size={16} /> },
    { id: "schedule", label: "Schedule", icon: <CalendarClock size={16} /> },
    { id: "inventory", label: "Inventory", icon: <Package size={16} /> },
    { id: "expenses", label: "Expenses", icon: <Receipt size={16} /> },
    { id: "quotes", label: "Quote Helper", icon: <Calculator size={16} /> },
    { id: "reviews", label: "Reviews", icon: <Star size={16} />, ownerOnly: true },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={16} />, ownerOnly: true },
    { id: "users", label: "Users", icon: <Users size={16} />, ownerOnly: true },
    { id: "team", label: "Team", icon: <Users size={16} />, ownerOnly: true },
    { id: "settings", label: "Settings", icon: <Palette size={16} /> },
  ];

  return (
    <PortalShell
      user={{ email: user.email, role }}
      onSignOut={signOut}
      companyName={theme.companyName}
      wide={analyticsWide}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs
          .filter((t) => !t.ownerOnly || role === "owner")
          .map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
              style={
                tab === t.id
                  ? { backgroundColor: GREEN, color: "white" }
                  : { backgroundColor: "white", color: "#374151" }
              }
            >
              {t.icon}
              {t.label}
            </button>
          ))}
      </div>

      {tab === "tickets" && (
        <TicketsTab
          currentUserName={user.displayName}
          role={role}
          userEmail={user.email}
        />
      )}
      {tab === "clients" && (
        <ClientsTab
          currentUserName={user.displayName}
          role={role}
          userEmail={user.email}
        />
      )}
      {tab === "leads" && <LeadInboxTab />}
      {tab === "crm" && (
        <CrmTab
          userName={user.displayName}
          userEmail={user.email}
          companyName={theme.companyName}
        />
      )}
      {tab === "calls" && <CallNotesTab createdByName={user.displayName} />}
      {tab === "jobs" && (
        <JobsTab
          userName={user.displayName}
          userEmail={user.email}
          role={role}
        />
      )}
      {tab === "ops" && (
        <ProjectOpsTab
          userName={user.displayName}
          userEmail={user.email}
          companyName={theme.companyName}
        />
      )}
      {tab === "schedule" && (
        <ScheduleTab
          role={role}
          userName={user.displayName}
          userEmail={user.email}
          config={config}
        />
      )}
      {tab === "inventory" && (
        <InventoryTab
          userName={user.displayName}
          userEmail={user.email}
          role={role}
        />
      )}
      {tab === "expenses" && (
        <ExpensesTab
          userName={user.displayName}
          userEmail={user.email}
          role={role}
        />
      )}
      {tab === "quotes" && (
        <QuoteHelperTab
          userName={user.displayName}
          userEmail={user.email}
        />
      )}
      {tab === "reviews" && role === "owner" && (
        <GoogleReviewsTab
          userName={user.displayName}
          userEmail={user.email}
        />
      )}
      {tab === "analytics" && role === "owner" && (
        <AnalyticsTab
          user={user}
          onViewChange={(view) => setAnalyticsWide(view === "report")}
        />
      )}
      {tab === "users" && role === "owner" && (
        <UsersTab config={config} setConfig={setConfig} />
      )}
      {tab === "team" && role === "owner" && (
        <TeamTab config={config} setConfig={setConfig} />
      )}
      {tab === "settings" && (
        <SettingsTab role={role} />
      )}
    </PortalShell>
  );
}

/* ---------------- Shell & gates ---------------- */

function PortalShell({
  children,
  user,
  onSignOut,
  companyName,
  wide = false,
}: {
  children: React.ReactNode;
  user?: { email: string | null; role: string };
  onSignOut?: () => void;
  companyName?: string;
  wide?: boolean;
}) {
  const contentWidth = wide ? "max-w-none" : "max-w-6xl";
  const contentPad = wide ? "px-4 lg:px-6" : "px-6";
  const { theme } = useTheme();
  const displayName = companyName ?? theme.companyName;
  const initials = companyInitials(displayName);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="brand-bar" />
      <header className="border-b border-gray-200 bg-white">
        <div className={`mx-auto flex ${contentWidth} items-center justify-between ${contentPad} py-4`}>
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-black text-white"
              style={{ backgroundColor: GREEN }}
            >
              {initials}
            </span>
            <div>
              <p className="text-sm font-extrabold leading-tight">
                Employee Portal
              </p>
              <p className="text-xs text-gray-500">{displayName}</p>
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
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: user.role === "owner" ? RED : GREEN }}
              >
                <ShieldCheck size={12} />
                {user.role}
              </span>
            )}
            {onSignOut && (
              <button
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
      <div className={`mx-auto ${contentWidth} ${contentPad} ${wide ? "py-4" : "py-8"}`}>{children}</div>
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
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">{message}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brand-bar" />
        <div className="p-6">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60"
              style={{ backgroundColor: RED }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

/* ---------------- Tickets ---------------- */

function TicketsTab({
  currentUserName,
  role,
  userEmail,
}: {
  currentUserName: string | null;
  role: Role;
  userEmail: string | null;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Ticket | null>(null);

  // Live updates so new tickets and messages appear automatically.
  useEffect(() => {
    const unsub = subscribeToAllTickets((fresh) => {
      setTickets(fresh);
      setActive((cur) => (cur ? fresh.find((t) => t.id === cur.id) ?? cur : cur));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const onStatus = async (id: string, status: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
    try {
      await updateTicketStatus(id, status);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card>
      {active && (
        <EmployeeTicketModal
          ticket={active}
          currentUserName={currentUserName}
          userEmail={userEmail}
          role={role}
          onClose={() => setActive(null)}
          onChanged={() => {}}
          onDeleted={() => setActive(null)}
        />
      )}
      <div className="flex items-center justify-between">
        <SectionTitle>All Tickets ({tickets.length})</SectionTitle>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading tickets…</p>
      ) : tickets.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No tickets yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-gray-100 p-4"
              style={{ borderLeftColor: RED, borderLeftWidth: 4 }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{t.projectType}</p>
                  <p className="text-xs text-gray-500">
                    {t.userName || "Unknown"} · {t.userEmail || "no email"}
                  </p>
                  {t.deletionRequested && (
                    <p className="mt-1 text-xs font-semibold text-amber-600">
                      Deletion requested
                      {t.deletionRequestedBy ? ` by ${t.deletionRequestedBy}` : ""}
                    </p>
                  )}
                </div>
                <select
                  value={t.status}
                  onChange={(e) => onStatus(t.id, e.target.value)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold capitalize outline-none focus:border-gray-900"
                >
                  {ticketStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-gray-700">{t.description}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                  <span>Budget: {t.budget}</span>
                  <span>Opened: {fmtDate(t.createdAt)}</span>
                  {t.responses && t.responses.length > 0 && (
                    <span>{t.responses.length} message(s)</span>
                  )}
                </div>
                <button
                  onClick={() => setActive(t)}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: GREEN }}
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function EmployeeTicketModal({
  ticket,
  currentUserName,
  userEmail,
  role,
  onClose,
  onChanged,
  onDeleted,
}: {
  ticket: Ticket;
  currentUserName: string | null;
  userEmail: string | null;
  role: Role;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const { theme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState<Ticket>(ticket);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isOwner = role === "owner";
  const requesterLabel = currentUserName || userEmail || "Employee";
  const isOwnDeletionRequest =
    !!live.deletionRequested &&
    (!live.deletionRequestedBy ||
      live.deletionRequestedBy === requesterLabel ||
      (!!userEmail && live.deletionRequestedBy === userEmail) ||
      (!!currentUserName && live.deletionRequestedBy === currentUserName));
  const busy = sending || deleting || requesting || cancelling;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingProfile(true);
      try {
        const p = await getUserProfile(ticket.userId);
        if (active) setProfile(p);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoadingProfile(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ticket.userId]);

  // Live updates so customer replies appear without a manual refresh.
  useEffect(() => {
    const unsub = subscribeToTicket(ticket.id, (t) => {
      if (t) setLive(t);
    });
    return () => unsub();
  }, [ticket.id]);

  // Opening the ticket counts as the company viewing it ("read").
  useEffect(() => {
    markTicketViewedByCompany(ticket.id).catch((e) => console.error(e));
  }, [ticket.id]);

  const responses = live.responses ?? [];

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const response: TicketResponse = {
      from: "company",
      text: reply.trim(),
      authorName: currentUserName,
      at: Date.now(),
    };
    try {
      await addTicketResponse(ticket.id, response);
      setReply("");
      onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTicket(ticket.id);
      onDeleted();
    } catch (e) {
      console.error(e);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleRequestDeletion = async () => {
    setRequesting(true);
    const label = currentUserName || userEmail || "Employee";
    try {
      await requestTicketDeletion(ticket.id, label);
      setConfirmRequest(false);
      onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setRequesting(false);
    }
  };

  const handleDismissRequest = async () => {
    try {
      await clearTicketDeletionRequest(ticket.id);
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelRequest = async () => {
    setCancelling(true);
    try {
      await clearTicketDeletionRequest(ticket.id);
      setConfirmCancel(false);
      onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setCancelling(false);
    }
  };

  const contactName = profile?.displayName || ticket.userName || "Customer";
  const contactEmail = profile?.contactEmail || ticket.userEmail || "";
  const phone = profile?.phone || "";
  const city = profile?.city || "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brand-bar shrink-0" />
        <div className="overflow-y-auto p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{ticket.projectType}</h3>
              <p className="text-xs text-gray-400">
                Budget: {ticket.budget} · Opened {fmtDate(ticket.createdAt)}
              </p>
            </div>
            <button
              onClick={() => !busy && onClose()}
              className="text-gray-400 transition hover:text-gray-900"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Customer contact info */}
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Customer Contact
            </p>
            {loadingProfile ? (
              <p className="mt-2 text-sm text-gray-500">Loading contact…</p>
            ) : (
              <div className="mt-2 space-y-1.5 text-sm">
                <p className="font-semibold">{contactName}</p>
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-2 text-gray-600 hover:underline"
                  >
                    <Mail size={14} style={{ color: GREEN }} />
                    {contactEmail}
                  </a>
                )}
                {phone && (
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-2 text-gray-600 hover:underline"
                  >
                    <Phone size={14} style={{ color: GREEN }} />
                    {phone}
                  </a>
                )}
                {city && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} style={{ color: GREEN }} />
                    {city}
                  </p>
                )}
                {!contactEmail && !phone && (
                  <p className="text-gray-500">
                    No contact details on file yet.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Original request */}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Request
            </p>
            <p className="mt-1 text-sm text-gray-700">{ticket.description}</p>
          </div>

          {/* Conversation */}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Conversation
            </p>
            <Thread responses={responses} viewer="company" />
          </div>
        </div>

        {/* Reply box + ticket actions */}
        <div className="shrink-0 border-t border-gray-100 p-4">
          {live.deletionRequested && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <span>
                Deletion requested
                {live.deletionRequestedBy
                  ? ` by ${live.deletionRequestedBy}`
                  : ""}
              </span>
              {isOwner ? (
                <button
                  type="button"
                  onClick={handleDismissRequest}
                  disabled={busy}
                  className="text-xs font-semibold text-amber-800 underline hover:text-amber-950 disabled:opacity-50"
                >
                  Dismiss request
                </button>
              ) : isOwnDeletionRequest ? (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  disabled={busy}
                  className="text-xs font-semibold text-amber-800 underline hover:text-amber-950 disabled:opacity-50"
                >
                  Cancel request
                </button>
              ) : null}
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              placeholder="Respond to the customer…"
              className="profile-input resize-none"
              disabled={busy}
            />
            <button
              onClick={send}
              disabled={busy || !reply.trim()}
              className="flex items-center gap-1 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: GREEN }}
            >
              <Send size={16} />
              {sending ? "…" : "Send"}
            </button>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            {confirmDelete ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-700">
                  Delete this ticket permanently?
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  This removes the ticket and all messages. This can&apos;t be
                  undone.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : confirmRequest ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">
                  Request ticket deletion?
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  The owner will be notified and can approve the deletion.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleRequestDeletion}
                    disabled={requesting}
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {requesting ? "Submitting…" : "Submit request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRequest(false)}
                    disabled={requesting}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : confirmCancel ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">
                  Cancel your deletion request?
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  The owner will no longer see this ticket flagged for deletion.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    disabled={cancelling}
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {cancelling ? "Cancelling…" : "Yes, cancel request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    disabled={cancelling}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-60"
                  >
                    Keep request
                  </button>
                </div>
              </div>
            ) : isOwner ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="flex items-center gap-1.5 text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Delete ticket
              </button>
            ) : live.deletionRequested && isOwnDeletionRequest ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-amber-700">
                  Deletion request pending — waiting for owner approval.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  disabled={busy}
                  className="text-sm font-semibold text-amber-800 underline hover:text-amber-950 disabled:opacity-50"
                >
                  Cancel request
                </button>
              </div>
            ) : live.deletionRequested ? (
              <p className="text-sm font-medium text-amber-700">
                Deletion request pending — waiting for owner approval.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRequest(true)}
                disabled={busy}
                className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 transition hover:text-amber-800 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Request deletion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Thread({
  responses,
  viewer,
}: {
  responses: TicketResponse[];
  viewer: "company" | "customer";
}) {
  const { theme } = useTheme();

  if (responses.length === 0) {
    return (
      <p className="mt-2 text-sm text-gray-500">No messages yet.</p>
    );
  }
  const sorted = [...responses].sort((a, b) => a.at - b.at);
  return (
    <div className="mt-2 space-y-2">
      {sorted.map((r, i) => {
        const mine = r.from === viewer;
        return (
          <div
            key={i}
            className={`flex ${mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                r.from === "company"
                  ? "bg-brand-primary text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                {r.from === "company"
                  ? r.authorName || theme.companyName
                  : r.authorName || "Customer"}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{r.text}</p>
              <p className="mt-1 text-[10px] opacity-60">
                {new Date(r.at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Clients ---------------- */

type Client = {
  uid: string;
  name: string;
  email: string | null;
  phone: string;
  city: string;
  title: string;
  bio: string;
  hasProfile: boolean;
  tickets: Ticket[];
  lastActivityAt: number;
};

function lastResponse(t: Ticket): TicketResponse | null {
  const r = t.responses ?? [];
  if (r.length === 0) return null;
  return [...r].sort((a, b) => a.at - b.at)[r.length - 1];
}

function attentionReason(t: Ticket): string | null {
  const r = t.responses ?? [];
  if (r.length === 0) return "New ticket";
  return lastResponse(t)?.from === "customer" ? "New message" : null;
}

function ticketActivityAt(t: Ticket): number {
  const created = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
  const last = lastResponse(t)?.at ?? 0;
  return Math.max(created, last);
}

function ClientsTab({
  currentUserName,
  role,
  userEmail,
}: {
  currentUserName: string | null;
  role: Role;
  userEmail: string | null;
}) {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [active, setActive] = useState<Ticket | null>(null);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [clientJobs, setClientJobs] = useState<Job[]>([]);

  useEffect(() => {
    let mounted = true;
    getAllUsers()
      .then((u) => mounted && setUsers(u))
      .catch((e) => console.error(e));
    const unsubTickets = subscribeToAllTickets((t) => {
      setTickets(t);
      setActive((cur) => (cur ? t.find((x) => x.id === cur.id) ?? cur : cur));
      setLoading(false);
    });
    const unsubQuotes = subscribeToSavedQuotes(setSavedQuotes);
    const unsubJobs = subscribeToJobs(setClientJobs);
    return () => {
      mounted = false;
      unsubTickets();
      unsubQuotes();
      unsubJobs();
    };
  }, []);

  // Build client records by merging profiles + tickets.
  const usersById = new Map(users.map((u) => [u.id, u]));
  const ticketsByUser = new Map<string, Ticket[]>();
  for (const t of tickets) {
    const arr = ticketsByUser.get(t.userId) ?? [];
    arr.push(t);
    ticketsByUser.set(t.userId, arr);
  }
  const uids = new Set<string>(
    Array.from(usersById.keys()).concat(Array.from(ticketsByUser.keys()))
  );

  const clients: Client[] = Array.from(uids).map((uid) => {
    const u = usersById.get(uid);
    const ts = (ticketsByUser.get(uid) ?? []).sort(
      (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    );
    const first = ts[0];
    return {
      uid,
      name:
        u?.displayName ||
        first?.userName ||
        u?.email ||
        first?.userEmail ||
        "Unknown client",
      email: u?.email || first?.userEmail || null,
      phone: u?.phone || "",
      city: u?.city || "",
      title: u?.title || "",
      bio: u?.bio || "",
      hasProfile: !!u,
      tickets: ts,
      lastActivityAt: ts.reduce((m, t) => Math.max(m, ticketActivityAt(t)), 0),
    };
  });
  clients.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? clients.filter((c) =>
        [c.name, c.email, c.phone, c.city]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))
      )
    : clients;

  // Split tickets awaiting a reply into "not yet opened" vs "viewed, no reply".
  const byActivity = (
    a: { ticket: Ticket },
    b: { ticket: Ticket }
  ) => ticketActivityAt(b.ticket) - ticketActivityAt(a.ticket);

  const attention = tickets
    .map((t) => ({ ticket: t, reason: attentionReason(t) }))
    .filter((x) => x.reason && companyTicketState(x.ticket) === "attention")
    .sort(byActivity);

  const leftOnRead = tickets
    .map((t) => ({ ticket: t, reason: attentionReason(t) }))
    .filter((x) => x.reason && companyTicketState(x.ticket) === "read")
    .sort(byActivity);

  const clientName = (t: Ticket) =>
    usersById.get(t.userId)?.displayName || t.userName || t.userEmail || "Unknown";

  return (
    <div className="space-y-6">
      {active && (
        <EmployeeTicketModal
          ticket={active}
          currentUserName={currentUserName}
          userEmail={userEmail}
          role={role}
          onClose={() => setActive(null)}
          onChanged={() => {}}
          onDeleted={() => setActive(null)}
        />
      )}

      {/* Needs attention */}
      <Card>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full animate-blink"
            style={{ backgroundColor: RED }}
          />
          <SectionTitle>Needs Attention ({attention.length})</SectionTitle>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Clients who opened a new ticket or sent a message awaiting a reply.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading…</p>
        ) : attention.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">All caught up. 🎉</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {attention.map(({ ticket, reason }) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {clientName(ticket)}{" "}
                    <span
                      className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: reason === "New ticket" ? GREEN : RED }}
                    >
                      {reason}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {ticket.projectType} · {fmtDate(ticket.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setActive(ticket)}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: GREEN }}
                >
                  Open ticket
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Left on read */}
      {leftOnRead.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <span className="text-base">👀</span>
            <SectionTitle>Left on Read ({leftOnRead.length})</SectionTitle>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            You viewed these but haven&apos;t replied yet. Don&apos;t leave the
            customer hanging.
          </p>
          <ul className="mt-4 space-y-2">
            {leftOnRead.map(({ ticket }) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {clientName(ticket)}{" "}
                    <span className="ml-1 rounded-full bg-gray-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-700">
                      Read
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {ticket.projectType} · {fmtDate(ticket.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setActive(ticket)}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: RED }}
                >
                  Reply now
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Client directory */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Clients ({clients.length})</SectionTitle>
          <div className="relative w-full max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, city…"
              className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-900"
            />
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading clients…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            {term ? "No clients match your search." : "No clients yet."}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {filtered.map((c) => {
              const open = expanded === c.uid;
              const needsAttention = c.tickets.some(
                (t) => companyTicketState(t) === "attention"
              );
              return (
                <li
                  key={c.uid}
                  className="rounded-xl border border-gray-100"
                  style={{ borderLeftColor: GREEN, borderLeftWidth: 4 }}
                >
                  <button
                    onClick={() => setExpanded(open ? null : c.uid)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: GREEN }}
                      >
                        {c.name[0]?.toUpperCase() ?? "U"}
                      </span>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          {c.name}
                          {needsAttention && (
                            <span
                              className="inline-block h-2 w-2 rounded-full animate-blink"
                              style={{ backgroundColor: RED }}
                            />
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {c.email || "no email"} ·{" "}
                          {c.tickets.length} ticket(s)
                          {savedQuotes.filter((q) => q.clientUid === c.uid).length > 0 &&
                            ` · ${savedQuotes.filter((q) => q.clientUid === c.uid).length} quote(s)`}
                          {clientJobs.filter((j) => j.clientUid === c.uid).length > 0 &&
                            ` · ${clientJobs.filter((j) => j.clientUid === c.uid).length} job(s)`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-400">
                      {open ? "Hide" : "View"}
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-gray-100 px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Info label="Name" value={c.name} />
                        <Info label="Email" value={c.email || ""} link={c.email ? `mailto:${c.email}` : undefined} />
                        <Info label="Phone" value={c.phone} link={c.phone ? `tel:${c.phone.replace(/[^\d+]/g, "")}` : undefined} />
                        <Info label="City" value={c.city} />
                        <Info
                          label="Profile"
                          value={c.hasProfile ? "Completed" : "Not filled out"}
                        />
                      </div>
                      {c.bio && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Bio
                          </p>
                          <p className="mt-1 text-sm text-gray-700">{c.bio}</p>
                        </div>
                      )}

                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Saved quotes
                      </p>
                      {(() => {
                        const clientQuotes = savedQuotes.filter(
                          (q) => q.clientUid === c.uid
                        );
                        if (clientQuotes.length === 0) {
                          return (
                            <p className="mt-1 text-sm text-gray-500">
                              No saved quotes yet. Use Quote Helper to save one
                              to this client&apos;s file.
                            </p>
                          );
                        }
                        return (
                          <ul className="mt-2 space-y-2">
                            {clientQuotes.map((q) => (
                              <li
                                key={q.id}
                                className="rounded-lg border border-gray-100 bg-white px-3 py-2"
                              >
                                <p className="text-sm font-semibold text-gray-900">
                                  {q.form.projectName || q.form.projectType}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {q.form.projectType} ·{" "}
                                  {q.result.suggestedTotal.toLocaleString(undefined, {
                                    style: "currency",
                                    currency: "USD",
                                  })}{" "}
                                  · {fmtDate(q.createdAt)}
                                </p>
                                {q.form.scopeNotes && (
                                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                                    {q.form.scopeNotes}
                                  </p>
                                )}
                                <p className="mt-1 text-[11px] text-gray-400">
                                  Range{" "}
                                  {q.result.lowRange.toLocaleString(undefined, {
                                    style: "currency",
                                    currency: "USD",
                                  })}{" "}
                                  –{" "}
                                  {q.result.highRange.toLocaleString(undefined, {
                                    style: "currency",
                                    currency: "USD",
                                  })}{" "}
                                  · saved by {q.savedBy}
                                </p>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}

                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Jobs
                      </p>
                      {(() => {
                        const jobsForClient = clientJobs.filter(
                          (j) => j.clientUid === c.uid
                        );
                        if (jobsForClient.length === 0) {
                          return (
                            <p className="mt-1 text-sm text-gray-500">
                              No jobs linked to this client yet.
                            </p>
                          );
                        }
                        return (
                          <ul className="mt-2 space-y-2">
                            {jobsForClient.map((j) => (
                              <li
                                key={j.jobId}
                                className="rounded-lg border border-gray-100 bg-white px-3 py-2"
                              >
                                <p className="text-sm font-semibold text-gray-900">
                                  #{j.jobId} · {j.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {j.postalCode} · {j.status.replace("_", " ")} ·{" "}
                                  {fmtDate(j.createdAt)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}

                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Tickets
                      </p>
                      {c.tickets.length === 0 ? (
                        <p className="mt-1 text-sm text-gray-500">
                          No tickets from this client.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {c.tickets.map((t) => (
                            <li
                              key={t.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"
                            >
                              <div>
                                <p className="flex items-center gap-2 text-sm font-medium">
                                  {companyTicketState(t) === "attention" && (
                                    <span
                                      className="inline-block h-2 w-2 rounded-full animate-blink"
                                      style={{ backgroundColor: RED }}
                                    />
                                  )}
                                  {companyTicketState(t) === "read" && (
                                    <span
                                      className="inline-block h-2 w-2 rounded-full bg-gray-300"
                                      title="Viewed, awaiting your reply"
                                    />
                                  )}
                                  {t.projectType}
                                  <span
                                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize text-white"
                                    style={{ backgroundColor: GREEN }}
                                  >
                                    {t.status}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500">
                                  {t.budget} · {fmtDate(t.createdAt)}
                                </p>
                              </div>
                              <button
                                onClick={() => setActive(t)}
                                className="rounded-md border px-3 py-1 text-xs font-semibold transition hover:bg-white"
                                style={{ borderColor: GREEN, color: GREEN }}
                              >
                                Open
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Info({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      {value ? (
        link ? (
          <a
            href={link}
            className="text-sm text-gray-800 hover:underline"
            style={{ color: GREEN }}
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-gray-800">{value}</p>
        )
      ) : (
        <p className="text-sm text-gray-400">—</p>
      )}
    </div>
  );
}

/* ---------------- Call notes ---------------- */

function CallNotesTab({ createdByName }: { createdByName: string | null }) {
  const [notes, setNotes] = useState<CallNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CallNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await getCallNotes());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    const qDigits = q.replace(/\D/g, "");
    return notes.filter((n) => {
      const name = (n.customerName || "").toLowerCase();
      const phoneText = (n.phone || "").toLowerCase();
      const phoneDigits = (n.phone || "").replace(/\D/g, "");
      if (name.includes(q)) return true;
      if (qDigits && phoneDigits.includes(qDigits)) return true;
      if (phoneText.includes(q)) return true;
      return false;
    });
  }, [notes, search]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;
    setSaving(true);
    try {
      await addCallNote({ customerName, phone, summary, createdByName });
      setCustomerName("");
      setPhone("");
      setSummary("");
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(true);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteCallNote(id);
    } catch (e) {
      console.error(e);
      load();
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {pendingDelete && (
        <ConfirmDialog
          title="Delete call note?"
          message={`This will permanently delete the call note for "${
            pendingDelete.customerName || "Unknown caller"
          }". This can't be undone.`}
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          busy={deleting}
          onCancel={() => !deleting && setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
      <Card>
        <SectionTitle>Log a Call</SectionTitle>
        <form onSubmit={onAdd} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="profile-input"
            />
            <PhoneInput
              value={phone}
              onChange={setPhone}
            />
          </div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="What was discussed on the call…"
            className="profile-input resize-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: GREEN }}
          >
            <Plus size={16} />
            {saving ? "Saving…" : "Add note"}
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Call Notes ({filteredNotes.length})</SectionTitle>
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-xs"
            />
          </div>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No call notes yet.</p>
        ) : filteredNotes.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No call notes match your search.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {filteredNotes.map((n) => (
              <li key={n.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {n.customerName || "Unknown caller"}
                    </p>
                    {n.phone && (
                      <p className="text-xs text-gray-500">{n.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setPendingDelete(n)}
                    className="text-gray-400 transition hover:text-red-500"
                    aria-label="Delete note"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-700">{n.summary}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                  {n.createdByName && <span>By {n.createdByName}</span>}
                  <span>{fmtDate(n.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Team (owner only) ---------------- */

/* ---------------- Users (owner only) ---------------- */

function UsersTab({
  config,
  setConfig,
}: {
  config: RolesConfig;
  setConfig: (c: RolesConfig) => void;
}) {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await getAllUsers());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? users.filter((u) =>
        [u.displayName, u.email]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))
      )
    : users;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>All Users ({users.length})</SectionTitle>
        <div className="relative w-full max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-900"
          />
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Everyone who has signed in. Change a user&apos;s website permissions and
        title below.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading users…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          {term ? "No users match your search." : "No users yet."}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              config={config}
              onConfigChange={setConfig}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function UserRow({
  user,
  config,
  onConfigChange,
}: {
  user: StoredUser;
  config: RolesConfig;
  onConfigChange: (c: RolesConfig) => void;
}) {
  const email = user.email || "";
  const role = roleForEmail(email, config);
  const lockedOwner = isEnvOwner(email);

  const [title, setTitle] = useState(
    config.employeeTitles?.[email.toLowerCase()] || ""
  );
  const [savingRole, setSavingRole] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleSaved, setTitleSaved] = useState(false);

  useEffect(() => {
    setTitle(config.employeeTitles?.[email.toLowerCase()] || "");
  }, [config, email]);

  const onRole = async (next: Role) => {
    if (!email || lockedOwner) return;
    setSavingRole(true);
    try {
      onConfigChange(await setUserRole(email, next));
    } catch (e) {
      console.error(e);
    } finally {
      setSavingRole(false);
    }
  };

  const dirtyTitle =
    title.trim() !== (config.employeeTitles?.[email.toLowerCase()] || "").trim();

  const onSaveTitle = async () => {
    if (!email) return;
    setSavingTitle(true);
    try {
      onConfigChange(await setEmployeeTitle(email, title.trim()));
      setTitleSaved(true);
      setTimeout(() => setTitleSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingTitle(false);
    }
  };

  return (
    <li className="rounded-xl border border-gray-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: role === "owner" ? RED : GREEN }}
          >
            {(user.displayName || email || "U")[0]?.toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-semibold">
              {user.displayName || "Unnamed user"}
            </p>
            <p className="text-xs text-gray-500">{email || "no email"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">
            Permission
          </label>
          <select
            value={role}
            onChange={(e) => onRole(e.target.value as Role)}
            disabled={lockedOwner || savingRole || !email}
            title={
              lockedOwner ? "This owner is set in configuration and can't be changed" : undefined
            }
            className="rounded-md border border-gray-200 px-2 py-1.5 text-sm font-semibold capitalize outline-none focus:border-gray-900 disabled:opacity-60"
          >
            <option value="owner">owner</option>
            <option value="employee">employee</option>
            <option value="customer">customer</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && dirtyTitle && onSaveTitle()}
          placeholder="Title (e.g. Site Foreman)"
          className="profile-input flex-1"
        />
        <button
          onClick={onSaveTitle}
          disabled={!dirtyTitle || savingTitle}
          className="rounded-md px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: GREEN }}
        >
          {savingTitle ? "…" : titleSaved ? "Saved" : "Save title"}
        </button>
      </div>
    </li>
  );
}

function TeamTab({
  config,
  setConfig,
}: {
  config: RolesConfig;
  setConfig: (c: RolesConfig) => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const onAdd = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const updated = await addEmployee(email);
      setConfig(updated);
      setEmail("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (e: string) => {
    setBusy(true);
    try {
      const updated = await removeEmployee(e);
      setConfig(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <SectionTitle>Add Employee</SectionTitle>
        <p className="mt-1 text-sm text-gray-500">
          Add a Google account email. Next time they sign in, the Employee
          Portal unlocks for them.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder="employee@email.com"
            className="profile-input flex-1"
          />
          <button
            onClick={onAdd}
            disabled={busy}
            className="flex items-center gap-1 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: RED }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Team</SectionTitle>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Owners
          </p>
          <ul className="mt-2 space-y-1.5">
            {config.ownerEmails.length === 0 && (
              <li className="text-sm text-gray-500">
                Owner set via configuration.
              </li>
            )}
            {config.ownerEmails.map((e) => (
              <li
                key={e}
                className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-sm"
              >
                <span className="truncate">{e}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: RED }}
                >
                  owner
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Employees
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Set each employee&apos;s job title below — only owners can change
            these.
          </p>
          {config.employeeEmails.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No employees yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {config.employeeEmails.map((e) => (
                <EmployeeRow
                  key={e}
                  email={e}
                  title={config.employeeTitles?.[e.toLowerCase()] || ""}
                  busy={busy}
                  onRemove={() => onRemove(e)}
                  onSaved={setConfig}
                />
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function EmployeeRow({
  email,
  title,
  busy,
  onRemove,
  onSaved,
}: {
  email: string;
  title: string;
  busy: boolean;
  onRemove: () => void;
  onSaved: (c: RolesConfig) => void;
}) {
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  const dirty = value.trim() !== title.trim();

  const save = async () => {
    setSaving(true);
    try {
      const updated = await setEmployeeTitle(email, value.trim());
      onSaved(updated);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-md bg-gray-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{email}</span>
        <button
          onClick={onRemove}
          disabled={busy || saving}
          className="text-gray-400 transition hover:text-red-500 disabled:opacity-50"
          aria-label={`Remove ${email}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && dirty && save()}
          placeholder="Job title (e.g. Site Foreman)"
          className="profile-input flex-1"
        />
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-md px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: GREEN }}
        >
          {saving ? "…" : savedAt ? "Saved" : "Save"}
        </button>
      </div>
    </li>
  );
}

/* ---------------- Lead Inbox ---------------- */

const leadStatuses: QuoteRequestStatus[] = ["new", "contacted", "closed"];

function LeadInboxTab() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<QuoteRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToQuoteRequests((items) => {
      setRequests(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteQuoteRequest(pendingDelete.id);
      setPendingDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const newCount = requests.filter((r) => r.status === "new").length;

  return (
    <Card>
      {pendingDelete && (
        <ConfirmDialog
          title="Delete lead?"
          message={`Remove the quote request from "${pendingDelete.name}"? This can't be undone.`}
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          busy={deleting}
          onCancel={() => !deleting && setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
      <SectionTitle>
        Lead Inbox ({requests.length}
        {newCount > 0 ? ` · ${newCount} new` : ""})
      </SectionTitle>
      <p className="mt-1 text-sm text-gray-500">
        Quote requests submitted from the homepage contact form.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No leads yet. Submissions from the homepage will appear here.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className={`rounded-xl border border-gray-100 p-4 ${
                r.status === "new" ? "border-l-4 border-l-brand-primary" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  {r.phone && (
                    <a
                      href={`tel:${r.phone.replace(/\D/g, "")}`}
                      className="mt-0.5 flex items-center gap-1 text-sm text-brand-primary hover:underline"
                    >
                      <Phone size={14} />
                      {r.phone}
                    </a>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {fmtDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={r.status}
                    onChange={(e) =>
                      updateQuoteRequestStatus(
                        r.id,
                        e.target.value as QuoteRequestStatus
                      )
                    }
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold capitalize outline-none focus:border-gray-900"
                  >
                    {leadStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPendingDelete(r)}
                    className="text-gray-400 transition hover:text-red-500"
                    aria-label="Delete lead"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------- Analytics (owner demo dashboard) ---------------- */

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "primary" | "accent" | "amber";
}) {
  const border =
    accent === "amber"
      ? "border-l-amber-500"
      : accent === "accent"
        ? "border-l-brand-accent"
        : "border-l-brand-primary";
  return (
    <div
      className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm border-l-4 ${border}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function HorizontalBar({
  label,
  count,
  max,
  color = GREEN,
}: {
  label: string;
  count: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium capitalize text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{count}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function FunnelStep({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center flex-1 min-w-[5rem]">
      <div
        className="flex h-16 w-full items-center justify-center rounded-lg text-lg font-black text-white shadow-sm"
        style={{
          backgroundColor: color,
          opacity: count > 0 ? 1 : 0.35,
        }}
      >
        {count}
      </div>
      <p className="mt-2 text-center text-xs font-semibold capitalize text-gray-600">
        {label}
      </p>
      <p className="text-[10px] text-gray-400">{pct}% of leads</p>
    </div>
  );
}

function MoneyBar({
  label,
  amount,
  max,
  color = GREEN,
}: {
  label: string;
  amount: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{fmtAnalyticsMoney(amount)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function AnalyticsDashboard({
  metrics,
  ticketTotal,
  user,
}: {
  metrics: AnalyticsMetrics;
  ticketTotal: number;
  user: { displayName: string | null; email: string | null };
}) {
  const barColors = [
    GREEN,
    "#6366f1",
    "#8b5cf6",
    "#059669",
    "#64748b",
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="New leads"
          value={metrics.newLeads}
          hint={
            metrics.leadsRecent7d > 0
              ? `${metrics.leadsRecent7d} received in the last 7 days`
              : "Homepage requests awaiting contact"
          }
          accent="primary"
        />
        <StatCard
          label="Open tickets"
          value={metrics.openTickets}
          hint="Open or in progress"
          accent="primary"
        />
        <StatCard
          label="Needs attention"
          value={metrics.needsAttention}
          hint="Unread customer messages"
          accent="amber"
        />
        <StatCard
          label="Leads this month"
          value={metrics.leadsThisMonth}
          hint="All homepage quote requests"
          accent="accent"
        />
        <StatCard
          label="Signed-up clients"
          value={metrics.signedUpClients}
          hint="Accounts created on your site"
          accent="primary"
        />
        <StatCard
          label="Jobs this week"
          value={metrics.jobsThisWeek}
          hint="Scheduled on the calendar"
          accent="accent"
        />
        <StatCard
          label="Active jobs"
          value={metrics.activeJobs ?? 0}
          hint={`${metrics.totalJobs ?? 0} total job records`}
          accent="primary"
        />
        <StatCard
          label="New jobs (7 days)"
          value={metrics.newJobsThisWeek ?? 0}
          hint={`${metrics.linkedScheduleThisWeek ?? 0} linked schedule entries this week`}
          accent="accent"
        />
        <StatCard
          label="Google rating"
          value={metrics.googleReviews.averageRating.toFixed(1)}
          hint={`${metrics.googleReviews.fiveStarPercent}% five-star reviews`}
          accent="primary"
        />
        <StatCard
          label="Google reviews"
          value={metrics.googleReviews.totalReviews}
          hint={`${metrics.googleReviews.reviewsThisMonth} new this month (demo)`}
          accent="accent"
        />
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
          Financial & quotes
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Expenses this month"
            value={fmtAnalyticsMoney(metrics.expenseAmountThisMonth)}
            hint={`${metrics.expensesThisMonth} entries logged`}
            accent="primary"
          />
          <StatCard
            label="Saved quotes"
            value={metrics.savedQuotesTotal}
            hint={`${metrics.savedQuotesThisMonth} saved this month`}
            accent="accent"
          />
          <StatCard
            label="Open purchase orders"
            value={metrics.purchaseOrdersOpen}
            hint={`${metrics.purchaseOrdersTotal} total POs`}
            accent="primary"
          />
          <StatCard
            label="Job budgets set"
            value={metrics.jobBudgetsSet}
            hint="Jobs with budget tracking in Project Ops"
            accent="accent"
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
          CRM
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="CRM pipeline"
            value={metrics.crmLeadsTotal}
            hint="Leads in CRM pipeline"
            accent="primary"
          />
          <StatCard
            label="Estimates sent"
            value={metrics.crmEstimatesSent}
            hint={`${metrics.crmEstimatesTotal} total estimates`}
            accent="accent"
          />
          <StatCard
            label="Proposals accepted"
            value={metrics.crmProposalsAccepted}
            hint={`${metrics.crmProposalsTotal} total proposals`}
            accent="primary"
          />
          <StatCard
            label="CRM reminders"
            value={metrics.crmRemindersDue}
            hint={
              metrics.crmRemindersOverdue > 0
                ? `${metrics.crmRemindersOverdue} overdue`
                : "Due today or earlier"
            }
            accent={metrics.crmRemindersOverdue > 0 ? "amber" : "accent"}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
          Project ops
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Change orders pending"
            value={metrics.changeOrdersPending}
            hint={`${metrics.changeOrdersTotal} total change orders`}
            accent="amber"
          />
          <StatCard
            label="Approved CO value"
            value={fmtAnalyticsMoney(metrics.changeOrdersApprovedValue)}
            hint="Sum of approved change orders"
            accent="primary"
          />
          <StatCard
            label="Project documents"
            value={metrics.projectDocumentsTotal}
            hint="Drawings, permits, contracts, and more"
            accent="accent"
          />
          <StatCard
            label="Tools checked out"
            value={metrics.toolsOutNow}
            hint={
              metrics.toolsOverdue > 0
                ? `${metrics.toolsOverdue} overdue returns`
                : `${metrics.subcontractorsTotal} subcontractors on file`
            }
            accent={metrics.toolsOverdue > 0 ? "amber" : "primary"}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
          Team & inventory
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Call notes"
            value={metrics.callNotesTotal}
            hint={`${metrics.callNotesThisWeek} logged in the last 7 days`}
            accent="primary"
          />
          <StatCard
            label="Time off pending"
            value={metrics.timeOffPending}
            hint="Awaiting owner approval"
            accent="amber"
          />
          <StatCard
            label="Inventory SKUs"
            value={metrics.inventoryItemsTotal}
            hint={
              metrics.inventoryLowStock > 0
                ? `${metrics.inventoryLowStock} at or below reorder level`
                : "Tracked in inventory"
            }
            accent={metrics.inventoryLowStock > 0 ? "amber" : "accent"}
          />
          <StatCard
            label="Subs payment overdue"
            value={metrics.subcontractorsPaymentOverdue}
            hint={`${metrics.subcontractorsTotal} subcontractors on file`}
            accent={
              metrics.subcontractorsPaymentOverdue > 0 ? "amber" : "primary"
            }
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Lead funnel</SectionTitle>
          <p className="mt-1 text-sm text-gray-500">
            Homepage quote requests by status ({metrics.funnelTotal} total)
          </p>
          {metrics.funnelTotal === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              No leads yet. Submit the contact form on the homepage to see data
              here.
            </p>
          ) : (
            <div className="mt-6 flex gap-3">
              <FunnelStep
                label="New"
                count={metrics.funnelNew}
                total={metrics.funnelTotal}
                color="#2563eb"
              />
              <div className="flex items-center pt-4 text-gray-300">→</div>
              <FunnelStep
                label="Contacted"
                count={metrics.funnelContacted}
                total={metrics.funnelTotal}
                color="#6366f1"
              />
              <div className="flex items-center pt-4 text-gray-300">→</div>
              <FunnelStep
                label="Closed"
                count={metrics.funnelClosed}
                total={metrics.funnelTotal}
                color="#059669"
              />
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Tickets by status</SectionTitle>
          <p className="mt-1 text-sm text-gray-500">
            Pricing tickets across your pipeline ({ticketTotal} total)
          </p>
          {ticketTotal === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              No tickets yet. Customers can open one from the homepage after
              signing in.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {metrics.ticketCounts.map(({ status, count }, i) => (
                <HorizontalBar
                  key={status}
                  label={status}
                  count={count}
                  max={metrics.ticketMax}
                  color={barColors[i % barColors.length]}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>CRM pipeline</SectionTitle>
          <p className="mt-1 text-sm text-gray-500">
            Leads by stage ({metrics.crmLeadsTotal} in CRM)
          </p>
          {metrics.crmLeadsTotal === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              No CRM leads yet. Import from Lead Inbox or add leads in the CRM tab.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {metrics.crmPipelineCounts.map(({ label, count }, i) => (
                <HorizontalBar
                  key={label}
                  label={label}
                  count={count}
                  max={metrics.crmPipelineMax}
                  color={barColors[i % barColors.length]}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Expenses by category</SectionTitle>
          <p className="mt-1 text-sm text-gray-500">
            Spending this month ({fmtAnalyticsMoney(metrics.expenseAmountThisMonth)})
          </p>
          {metrics.expensesByCategory.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              No expenses logged this month yet.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {metrics.expensesByCategory.map(({ category, total }, i) => (
                <MoneyBar
                  key={category}
                  label={category}
                  amount={total}
                  max={metrics.expenseCategoryMax}
                  color={barColors[i % barColors.length]}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Change orders</SectionTitle>
          <p className="mt-1 text-sm text-gray-500">
            Status breakdown ({metrics.changeOrdersTotal} total)
          </p>
          {metrics.changeOrdersTotal === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              No change orders yet. Create them in Project Ops.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {metrics.changeOrderCounts.map(({ label, count }, i) => (
                <HorizontalBar
                  key={label}
                  label={label}
                  count={count}
                  max={metrics.changeOrderMax}
                  color={barColors[i % barColors.length]}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Jobs by postal code</SectionTitle>
          <p className="mt-1 text-sm text-gray-500">
            Where active work is concentrated ({metrics.totalJobs ?? 0} jobs)
          </p>
          {(metrics.jobsByPostalCode ?? []).length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              No jobs yet. Create jobs in the Jobs tab with a postal code.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {(metrics.jobsByPostalCode ?? []).map(({ postalCode, count }, i) => (
                <HorizontalBar
                  key={postalCode}
                  label={postalCode}
                  count={count}
                  max={metrics.postalCodeMax ?? 1}
                  color={barColors[i % barColors.length]}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionTitle>Google Reviews</SectionTitle>
            <p className="mt-1 text-sm text-gray-500">
              Auto-synced from Google Business Profile in production — demo data
              shown here.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Demo · not connected
            </span>
            <GoogleReviewsPanelTrigger
              userName={user.displayName}
              userEmail={user.email}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Overall rating
            </p>
            <p className="mt-2 text-4xl font-black text-gray-900">
              {metrics.googleReviews.averageRating}
              <span className="ml-1 text-lg font-semibold text-amber-400">
                ★
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Based on {metrics.googleReviews.totalReviews} Google reviews
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Rating breakdown
            </p>
            <div className="space-y-2">
              {metrics.googleReviews.ratingBreakdown.map(({ stars, count }) => (
                <HorizontalBar
                  key={stars}
                  label={`${stars} star`}
                  count={count}
                  max={metrics.googleReviews.totalReviews}
                  color={stars >= 4 ? "#f59e0b" : "#94a3b8"}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs text-gray-400">
          When live, new Google reviews sync on a schedule and appear on your
          homepage automatically. Reply from{" "}
          <span className="font-medium text-gray-500">See individual reviews</span>{" "}
          to post responses back to Google.
        </p>
      </Card>
    </>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "overview" | "report";
  onChange: (view: "overview" | "report") => void;
}) {
  return (
    <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      <button
        type="button"
        onClick={() => onChange("overview")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          view === "overview"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Overview
      </button>
      <button
        type="button"
        onClick={() => onChange("report")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          view === "report"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Report
      </button>
    </div>
  );
}

function AnalyticsTab({
  user,
  onViewChange,
}: {
  user: { displayName: string | null; email: string | null };
  onViewChange?: (view: "overview" | "report") => void;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [leads, setLeads] = useState<QuoteRequest[]>([]);
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [callNotes, setCallNotes] = useState<CallNote[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [jobBudgets, setJobBudgets] = useState<Record<string, JobBudget>>({});
  const [toolCheckouts, setToolCheckouts] = useState<ToolCheckout[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [crmEstimates, setCrmEstimates] = useState<CrmEstimate[]>([]);
  const [crmReminders, setCrmReminders] = useState<CrmReminder[]>([]);
  const [crmProposals, setCrmProposals] = useState<CrmProposal[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<AnalyticsWeeklySnapshot[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<"live" | string>("live");
  const [analyticsView, setAnalyticsView] = useState<"overview" | "report">(
    "overview"
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setView = (view: "overview" | "report") => {
    setAnalyticsView(view);
    onViewChange?.(view);
  };

  useEffect(() => {
    onViewChange?.(analyticsView);
  }, [analyticsView, onViewChange]);

  const currentWeekId = getWeekId();
  const SOURCE_COUNT = 20;

  useEffect(() => {
    let ready = 0;
    const markReady = () => {
      ready += 1;
      if (ready >= SOURCE_COUNT) setLoading(false);
    };

    const u1 = subscribeToAllTickets((t) => {
      setTickets(t);
      markReady();
    });
    const u2 = subscribeToQuoteRequests((r) => {
      setLeads(r);
      markReady();
    });
    const u3 = subscribeToAllUsers((u) => {
      setUsers(u);
      markReady();
    });
    const u4 = subscribeToScheduleItems((s) => {
      setSchedule(s);
      markReady();
    });
    const u5 = subscribeToJobs((j) => {
      setJobs(j);
      markReady();
    });
    const u6 = subscribeToExpenses((list) => {
      setExpenses(list);
      markReady();
    });
    const u7 = subscribeToSavedQuotes((list) => {
      setSavedQuotes(list);
      markReady();
    });
    const u8 = subscribeToCallNotes((list) => {
      setCallNotes(list);
      markReady();
    });
    const u9 = subscribeToInventoryItems((list) => {
      setInventory(list);
      markReady();
    });
    const u10 = subscribeToPurchaseOrders((list) => {
      setPurchaseOrders(list);
      markReady();
    });
    const u11 = subscribeToChangeOrders((list) => {
      setChangeOrders(list);
      markReady();
    });
    const u12 = subscribeToProjectDocuments((list) => {
      setProjectDocuments(list);
      markReady();
    });
    const u13 = subscribeToJobBudgets((map) => {
      setJobBudgets(map);
      markReady();
    });
    const u14 = subscribeToToolCheckouts((list) => {
      setToolCheckouts(list);
      markReady();
    });
    const u15 = subscribeToSubcontractors((list) => {
      setSubcontractors(list);
      markReady();
    });
    const u16 = subscribeToCrmLeads((list) => {
      setCrmLeads(list);
      markReady();
    });
    const u17 = subscribeToCrmEstimates((list) => {
      setCrmEstimates(list);
      markReady();
    });
    const u18 = subscribeToCrmReminders((list) => {
      setCrmReminders(list);
      markReady();
    });
    const u19 = subscribeToCrmProposals((list) => {
      setCrmProposals(list);
      markReady();
    });
    const u20 = subscribeToTimeOffRequests((list) => {
      setTimeOffRequests(list);
      markReady();
    });
    const u21 = subscribeToWeeklyAnalyticsSnapshots(setSnapshots);

    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
      u8();
      u9();
      u10();
      u11();
      u12();
      u13();
      u14();
      u15();
      u16();
      u17();
      u18();
      u19();
      u20();
      u21();
    };
  }, []);

  const liveMetrics = useMemo(
    () =>
      computeAnalyticsMetrics(tickets, leads, users, schedule, jobs, {
        expenses,
        savedQuotes,
        callNotes,
        inventory,
        purchaseOrders,
        changeOrders,
        projectDocuments,
        jobBudgets: Object.values(jobBudgets),
        toolCheckouts,
        subcontractors,
        crmLeads,
        crmEstimates,
        crmReminders,
        crmProposals,
        timeOffRequests,
      }),
    [
      tickets,
      leads,
      users,
      schedule,
      jobs,
      expenses,
      savedQuotes,
      callNotes,
      inventory,
      purchaseOrders,
      changeOrders,
      projectDocuments,
      jobBudgets,
      toolCheckouts,
      subcontractors,
      crmLeads,
      crmEstimates,
      crmReminders,
      crmProposals,
      timeOffRequests,
    ]
  );

  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveWeeklyAnalyticsSnapshot(
        snapshotFromMetrics(currentWeekId, liveMetrics)
      ).catch(() => {});
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [loading, currentWeekId, liveMetrics]);

  const viewingLive = selectedWeek === "live";
  const historical =
    !viewingLive
      ? snapshots.find((s) => s.weekId === selectedWeek)
      : undefined;
  const displayMetrics: AnalyticsMetrics | null = viewingLive
    ? liveMetrics
    : historical ?? null;
  const normalizedMetrics = displayMetrics
    ? normalizeAnalyticsMetrics(displayMetrics)
    : null;
  const ticketTotal = normalizedMetrics
    ? normalizedMetrics.ticketCounts.reduce((n, x) => n + x.count, 0)
    : 0;

  const pastWeeks = snapshots.filter((s) => s.weekId !== currentWeekId);

  return (
    <div className={analyticsView === "report" ? "space-y-4" : "space-y-6"}>
      {analyticsView === "overview" ? (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionTitle>Analytics</SectionTitle>
              <p className="mt-1 text-sm text-gray-500">
                Live overview of leads, tickets, jobs, CRM, expenses, project ops,
                inventory, and team activity. Metrics for the current week are saved
                automatically so you can review past weeks.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <ViewToggle view={analyticsView} onChange={setView} />
              <label htmlFor="analytics-week" className="sr-only">
                Week
              </label>
              <select
                id="analytics-week"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full min-w-[14rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 sm:w-auto"
              >
                <option value="live">
                  This week (live) — {formatWeekLabel(currentWeekId)}
                </option>
                {pastWeeks.map((s) => (
                  <option key={s.weekId} value={s.weekId}>
                    {s.weekLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ViewToggle view={analyticsView} onChange={setView} />
        </div>
      )}

      {analyticsView === "overview" && !viewingLive && historical && (
        <div className="rounded-2xl border border-indigo-100 border-l-4 border-l-indigo-500 bg-indigo-50/40 p-6 shadow-sm">
          <p className="text-sm font-semibold text-indigo-900">
            Historical snapshot — {historical.weekLabel}
          </p>
          <p className="mt-1 text-xs text-indigo-700/80">
            Saved{" "}
            {new Date(historical.savedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            . Select &ldquo;This week (live)&rdquo; to return to real-time data.
          </p>
        </div>
      )}

      {analyticsView === "overview" && !viewingLive && !historical && (
        <Card>
          <p className="text-sm text-gray-500">
            No saved data for that week yet.
          </p>
        </Card>
      )}

      {loading ? (
        <Card>
          <p className="text-sm text-gray-500">Loading analytics…</p>
        </Card>
      ) : analyticsView === "report" ? (
        <AnalyticsReport
          expenses={expenses}
          jobs={jobs}
          crmLeads={crmLeads}
          changeOrders={changeOrders}
          homepageLeads={leads}
          tickets={tickets}
          snapshots={snapshots}
        />
      ) : normalizedMetrics ? (
        <AnalyticsDashboard
          metrics={normalizedMetrics}
          ticketTotal={ticketTotal}
          user={user}
        />
      ) : null}
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsTab({ role }: { role: Role }) {
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState(theme);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const isOwner = role === "owner";

  useEffect(() => {
    setDraft(theme);
  }, [theme]);

  const applyPreset = (primaryColor: string, accentColor: string) => {
    setDraft((d) => ({ ...d, primaryColor, accentColor }));
  };

  const save = () => {
    if (!isOwner) return;
    setSaving(true);
    setTheme({ ...draft, tagline: theme.tagline });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
    setSaving(false);
  };

  const dirty =
    draft.primaryColor !== theme.primaryColor ||
    draft.accentColor !== theme.accentColor ||
    draft.companyName !== theme.companyName;

  return (
    <Card>
      <SectionTitle>Portal Settings</SectionTitle>
      <p className="mt-1 text-sm text-gray-500">
        {isOwner
          ? "Customize colors and branding for the employee portal only — ideal for live client demos. The public website always stays Summit Build Co. blue & white. Saved locally in this browser."
          : "View the current portal branding. Only the owner can change these settings. The public website is not affected."}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Company name</span>
            <input
              value={draft.companyName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, companyName: e.target.value }))
              }
              disabled={!isOwner}
              className="profile-input mt-1.5"
              placeholder="Summit Build Co."
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Primary color</span>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={draft.primaryColor}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, primaryColor: e.target.value }))
                  }
                  disabled={!isOwner}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <input
                  value={draft.primaryColor}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, primaryColor: e.target.value }))
                  }
                  disabled={!isOwner}
                  className="profile-input flex-1 font-mono text-xs"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Accent color</span>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={draft.accentColor}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, accentColor: e.target.value }))
                  }
                  disabled={!isOwner}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <input
                  value={draft.accentColor}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, accentColor: e.target.value }))
                  }
                  disabled={!isOwner}
                  className="profile-input flex-1 font-mono text-xs"
                />
              </div>
            </label>
          </div>

          {isOwner && (
            <div>
              <p className="text-sm font-medium text-gray-700">Color presets</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      applyPreset(preset.primaryColor, preset.accentColor)
                    }
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-gray-200"
                      style={{
                        background: `linear-gradient(135deg, ${preset.primaryColor} 50%, ${preset.accentColor} 50%)`,
                      }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isOwner && (
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: GREEN }}
            >
              {saving ? "Saving…" : savedAt ? "Saved!" : "Save settings"}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Portal preview
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
            <div
              className="h-1"
              style={{ backgroundColor: draft.primaryColor }}
            />
            <div className="p-5">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-black text-white"
                  style={{ backgroundColor: draft.primaryColor }}
                >
                  {companyInitials(draft.companyName)}
                </span>
                <span className="font-bold">{draft.companyName}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <span
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: draft.primaryColor }}
                >
                  Primary button
                </span>
                <span
                  className="rounded-md border-2 px-3 py-1.5 text-xs font-semibold"
                  style={{
                    borderColor: draft.accentColor,
                    color: draft.accentColor,
                  }}
                >
                  Accent button
                </span>
              </div>
              <div
                className="mt-4 rounded-lg p-3 text-xs text-white"
                style={{
                  background: `linear-gradient(135deg, ${draft.primaryColor}, ${draft.accentColor})`,
                }}
              >
                Gradient section
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
