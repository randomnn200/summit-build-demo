"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ClipboardList,
  Contact,
  Home,
  Mail,
  MapPin,
  LogOut,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../lib/hooks/useAuth";
import { useRole } from "../lib/hooks/useRole";
import { formatPhone } from "../lib/formatPhone";
import {
  addCallNote,
  addEmployee,
  addScheduleItem,
  addTicketResponse,
  deleteCallNote,
  deleteScheduleItem,
  getAllUsers,
  getCallNotes,
  getScheduleItems,
  companyTicketState,
  getUserProfile,
  isEnvOwner,
  markTicketViewedByCompany,
  removeEmployee,
  roleForEmail,
  setEmployeeTitle,
  setUserRole,
  subscribeToAllTickets,
  subscribeToTicket,
  ticketStatuses,
  updateTicketStatus,
  type CallNote,
  type Role,
  type RolesConfig,
  type ScheduleItem,
  type StoredUser,
  type Ticket,
  type TicketResponse,
  type UserProfile,
} from "../lib/firebase/firebaseUtils";

const GREEN = "#006847";
const RED = "#CE1126";

type Tab = "tickets" | "clients" | "calls" | "schedule" | "users" | "team";

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
  const [tab, setTab] = useState<Tab>("tickets");

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
    { id: "calls", label: "Call Notes", icon: <Phone size={16} /> },
    { id: "schedule", label: "Schedule", icon: <CalendarClock size={16} /> },
    { id: "users", label: "Users", icon: <Users size={16} />, ownerOnly: true },
    { id: "team", label: "Team", icon: <Users size={16} />, ownerOnly: true },
  ];

  return (
    <PortalShell
      user={{ email: user.email, role }}
      onSignOut={signOut}
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

      {tab === "tickets" && <TicketsTab currentUserName={user.displayName} />}
      {tab === "clients" && <ClientsTab currentUserName={user.displayName} />}
      {tab === "calls" && <CallNotesTab createdByName={user.displayName} />}
      {tab === "schedule" && <ScheduleTab />}
      {tab === "users" && role === "owner" && (
        <UsersTab config={config} setConfig={setConfig} />
      )}
      {tab === "team" && role === "owner" && (
        <TeamTab config={config} setConfig={setConfig} />
      )}
    </PortalShell>
  );
}

/* ---------------- Shell & gates ---------------- */

function PortalShell({
  children,
  user,
  onSignOut,
}: {
  children: React.ReactNode;
  user?: { email: string | null; role: string };
  onSignOut?: () => void;
}) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="flex h-1.5 w-full">
        <div className="flex-1" style={{ backgroundColor: GREEN }} />
        <div className="flex-1 bg-white" />
        <div className="flex-1" style={{ backgroundColor: RED }} />
      </div>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-black text-white"
              style={{ backgroundColor: GREEN }}
            >
              IC
            </span>
            <div>
              <p className="text-sm font-extrabold leading-tight">
                Employee Portal
              </p>
              <p className="text-xs text-gray-500">Illegal Construction Co.</p>
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
        <div className="flex h-1.5 w-full">
          <div className="flex-1" style={{ backgroundColor: GREEN }} />
          <div className="flex-1 bg-white" />
          <div className="flex-1" style={{ backgroundColor: RED }} />
        </div>
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

function TicketsTab({ currentUserName }: { currentUserName: string | null }) {
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
          onClose={() => setActive(null)}
          onChanged={() => {}}
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
  onClose,
  onChanged,
}: {
  ticket: Ticket;
  currentUserName: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState<Ticket>(ticket);

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

  const contactName = profile?.displayName || ticket.userName || "Customer";
  const contactEmail = profile?.contactEmail || ticket.userEmail || "";
  const phone = profile?.phone || "";
  const city = profile?.city || "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={() => !sending && onClose()}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-1.5 w-full shrink-0">
          <div className="flex-1" style={{ backgroundColor: GREEN }} />
          <div className="flex-1 bg-white" />
          <div className="flex-1" style={{ backgroundColor: RED }} />
        </div>
        <div className="overflow-y-auto p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{ticket.projectType}</h3>
              <p className="text-xs text-gray-400">
                Budget: {ticket.budget} · Opened {fmtDate(ticket.createdAt)}
              </p>
            </div>
            <button
              onClick={() => !sending && onClose()}
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

        {/* Reply box */}
        <div className="shrink-0 border-t border-gray-100 p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              placeholder="Respond to the customer…"
              className="profile-input resize-none"
            />
            <button
              onClick={send}
              disabled={sending || !reply.trim()}
              className="flex items-center gap-1 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: GREEN }}
            >
              <Send size={16} />
              {sending ? "…" : "Send"}
            </button>
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
              className="max-w-[80%] rounded-2xl px-3 py-2 text-sm"
              style={
                r.from === "company"
                  ? { backgroundColor: GREEN, color: "white" }
                  : { backgroundColor: "#f3f4f6", color: "#111827" }
              }
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                {r.from === "company"
                  ? r.authorName || "Illegal Construction Co."
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

function ClientsTab({ currentUserName }: { currentUserName: string | null }) {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [active, setActive] = useState<Ticket | null>(null);

  useEffect(() => {
    let mounted = true;
    getAllUsers()
      .then((u) => mounted && setUsers(u))
      .catch((e) => console.error(e));
    const unsub = subscribeToAllTickets((t) => {
      setTickets(t);
      setActive((cur) => (cur ? t.find((x) => x.id === cur.id) ?? cur : cur));
      setLoading(false);
    });
    return () => {
      mounted = false;
      unsub();
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
          onClose={() => setActive(null)}
          onChanged={() => {}}
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
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(555) 555-5555"
              className="profile-input"
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
        <SectionTitle>Call Notes ({notes.length})</SectionTitle>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No call notes yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notes.map((n) => (
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

/* ---------------- Schedule ---------------- */

function ScheduleTab() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    assignee: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getScheduleItems());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      await addScheduleItem(form);
      setForm({ title: "", date: "", time: "", location: "", assignee: "", notes: "" });
      await load();
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
      load();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <SectionTitle>Schedule a Job</SectionTitle>
        <form onSubmit={onAdd} className="mt-4 space-y-3">
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Job / appointment title"
            className="profile-input"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="profile-input"
            />
            <input
              type="time"
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
              className="profile-input"
            />
          </div>
          <input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Location / address"
            className="profile-input"
          />
          <input
            value={form.assignee}
            onChange={(e) => set("assignee", e.target.value)}
            placeholder="Assigned to"
            className="profile-input"
          />
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
        <SectionTitle>Upcoming ({items.length})</SectionTitle>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Nothing scheduled.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((i) => (
              <li key={i.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{i.title}</p>
                    <p className="text-xs font-medium" style={{ color: GREEN }}>
                      {i.date} {i.time && `· ${i.time}`}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(i.id)}
                    className="text-gray-400 transition hover:text-red-500"
                    aria-label="Delete schedule item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                  {i.location && <p>📍 {i.location}</p>}
                  {i.assignee && <p>👷 {i.assignee}</p>}
                  {i.notes && <p className="text-gray-700">{i.notes}</p>}
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
