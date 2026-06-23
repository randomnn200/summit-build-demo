"use client";

import { useEffect, useRef, useState } from "react";
import {
  ImageOff,
  Lock,
  LogOut,
  Send,
  Ticket as TicketIcon,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../lib/hooks/useAuth";
import { DEFAULT_THEME } from "../lib/theme";
import { isFirebaseConfigured } from "../lib/firebase/firebase";
import {
  addTicketResponse,
  createTicket,
  deleteTicket,
  hasUnreadCompanyResponse,
  markTicketViewedByCustomer,
  subscribeToTicket,
  subscribeToUserTickets,
  updateTicket,
  type Ticket,
  type TicketResponse,
} from "../lib/firebase/firebaseUtils";

const projectTypes = [
  "Residential Build",
  "Commercial Project",
  "Renovation & Remodel",
  "New Construction",
  "Other / Not Sure",
];

const budgets = [
  "Under $10k",
  "$10k – $50k",
  "$50k – $200k",
  "$200k+",
  "Not sure yet",
];

function formatDate(createdAt: Ticket["createdAt"]) {
  if (!createdAt?.seconds) return "Just now";
  return new Date(createdAt.seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PricingTicket() {
  const theme = DEFAULT_THEME;
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const [projectType, setProjectType] = useState(projectTypes[0]);
  const [budget, setBudget] = useState(budgets[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const handleSignIn = async () => {
    setSignInError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (
        err.code === "auth/operation-not-allowed" ||
        err.code === "auth/configuration-not-found"
      ) {
        setSignInError(
          "Google sign-in isn't enabled yet. In Firebase Console > Authentication, click Get started, then enable Google under Sign-in method and set a support email."
        );
      } else if (err.code === "auth/unauthorized-domain") {
        setSignInError(
          "This domain isn't authorized. Add 'localhost' under Authentication > Settings > Authorized domains."
        );
      } else if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        setSignInError("Sign-in popup was closed before completing. Try again.");
      } else {
        setSignInError(err.code ? `${err.code}` : err.message ?? "Sign-in failed.");
      }
    }
  };

  // Live-subscribe to this customer's tickets so new replies (and the unread
  // notification dot) show up automatically without a refresh.
  useEffect(() => {
    if (!user) {
      setTickets([]);
      return;
    }
    setLoadingTickets(true);
    const unsub = subscribeToUserTickets(user.uid, (t) => {
      setTickets(t);
      setLoadingTickets(false);
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!description.trim()) {
      setError("Please describe your project.");
      return;
    }
    setSubmitting(true);
    try {
      await createTicket({
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        projectType,
        budget,
        description: description.trim(),
      });
      setDescription("");
      setProjectType(projectTypes[0]);
      setBudget(budgets[0]);
    } catch (e) {
      console.error(e);
      setError("Couldn't submit your ticket. Check your Firebase setup and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTicketUpdated = () => {
    // The live subscription refreshes the list automatically.
    setActiveTicket(null);
  };

  return (
    <section id="tickets" className="py-20">
      {activeTicket && (
        <TicketEditModal
          ticket={activeTicket}
          authorName={user?.displayName ?? null}
          onClose={() => setActiveTicket(null)}
          onSaved={handleTicketUpdated}
          onDeleted={handleTicketUpdated}
          onViewed={() => {}}
        />
      )}
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-brand-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-accent"
          >
            <TicketIcon size={14} />
            Pricing Tickets
          </span>
          <h2 className="mt-4 text-4xl font-black tracking-tight">
            Request a <span style={{ color: "var(--brand-primary)" }}>Pricing</span>{" "}
            <span style={{ color: "var(--brand-accent)" }}>Ticket</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Sign in with Google to open a pricing ticket and track its status.
            Our team will follow up with a detailed quote.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          {!isFirebaseConfigured ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
              <Lock className="mx-auto h-9 w-9 text-gray-400" />
              <h3 className="mt-3 text-xl font-bold">Ticketing not set up yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                Add your Firebase config to{" "}
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                  .env.local
                </code>{" "}
                and restart the dev server to enable Google sign-in and pricing
                tickets. Auth + Firestore are free — no billing needed.
              </p>
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
              Loading…
            </div>
          ) : !user ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
              <div className="brand-bar mb-8 max-w-xs mx-auto" />
              <h3 className="text-xl font-bold">Sign in to open a ticket</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
                We use your Google account to keep your tickets tied to you so
                you can check back on them anytime.
              </p>
              <button
                onClick={handleSignIn}
                className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-2.5 font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google logo"
                  className="h-5 w-5"
                />
                Sign in with Google
              </button>
              {signInError && (
                <p
                  className="mx-auto mt-4 max-w-sm text-sm font-medium"
                  style={{ color: "var(--brand-accent)" }}
                >
                  {signInError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Signed-in bar */}
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt="You"
                      className="h-9 w-9 rounded-full"
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full font-bold text-white"
                      style={{ backgroundColor: "var(--brand-primary)" }}
                    >
                      {user.displayName?.[0] ?? "U"}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-semibold leading-tight">
                      {user.displayName ?? "Signed in"}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>

              {/* Ticket form */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
              >
                <h3 className="text-lg font-bold">New Pricing Ticket</h3>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Project type
                    </span>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                    >
                      {projectTypes.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Budget range
                    </span>
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                    >
                      {budgets.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-medium text-gray-700">
                    Describe your project
                  </span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Tell us what you want built (or torn down)…"
                    className="mt-1.5 w-full resize-none rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  />
                </label>

                {/* Grayed-out image upload (disabled to avoid paid storage) */}
                <div className="mt-5">
                  <span className="text-sm font-medium text-gray-700">
                    Reference images
                  </span>
                  <div
                    aria-disabled
                    title="Image uploads are disabled in this practice build"
                    className="mt-1.5 flex cursor-not-allowed flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-100 px-6 py-8 text-center opacity-60 select-none"
                  >
                    <div className="relative">
                      <ImageOff className="h-9 w-9 text-gray-400" />
                      <Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-gray-500" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-gray-500">
                      Image upload disabled
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Turned off to avoid paid Firebase Storage — this is a
                      practice build.
                    </p>
                  </div>
                </div>

                {error && (
                  <p className="mt-4 text-sm font-medium" style={{ color: "var(--brand-accent)" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 w-full rounded-md px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  {submitting ? "Submitting…" : "Submit Ticket"}
                </button>
              </form>

              {/* Existing tickets */}
              <div>
                <h3 className="text-lg font-bold">Your Tickets</h3>
                {loadingTickets ? (
                  <p className="mt-3 text-sm text-gray-500">Loading tickets…</p>
                ) : tickets.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    No tickets yet. Submit one above to get started.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {tickets.map((t) => (
                      <li
                        key={t.id}
                        className="rounded-xl border border-gray-100 border-l-4 border-l-brand-accent bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 font-semibold">
                            {hasUnreadCompanyResponse(t) && (
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full animate-blink"
                                style={{ backgroundColor: "var(--brand-accent)" }}
                                title={`New response from ${theme.companyName}`}
                              />
                            )}
                            {t.projectType}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize text-white"
                            style={{ backgroundColor: "var(--brand-primary)" }}
                          >
                            {t.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {t.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                            <span>Budget: {t.budget}</span>
                            <span>Opened: {formatDate(t.createdAt)}</span>
                          </div>
                          <button
                            onClick={() => setActiveTicket(t)}
                            className="rounded-md border border-brand-primary px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/5"
                          >
                            Open
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TicketEditModal({
  ticket,
  authorName,
  onClose,
  onSaved,
  onDeleted,
  onViewed,
}: {
  ticket: Ticket;
  authorName: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onViewed: () => void;
}) {
  const theme = DEFAULT_THEME;
  const [projectType, setProjectType] = useState(ticket.projectType);
  const [budget, setBudget] = useState(ticket.budget);
  const [description, setDescription] = useState(ticket.description);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [thread, setThread] = useState<TicketResponse[]>(ticket.responses ?? []);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const markedRef = useRef(0);

  // Live-subscribe to this ticket so new company/customer messages appear
  // instantly, and mark as read whenever a newer company response arrives.
  useEffect(() => {
    const unsub = subscribeToTicket(ticket.id, (t) => {
      if (!t) return;
      setThread(t.responses ?? []);
      const companyAt = t.companyLastResponseAt ?? 0;
      if (companyAt >= markedRef.current && companyAt > 0) {
        markedRef.current = companyAt + 1;
        markTicketViewedByCustomer(ticket.id)
          .then(() => onViewed())
          .catch((e) => console.error(e));
      }
    });
    // Clear the dot on open even if there are no company messages yet.
    markTicketViewedByCustomer(ticket.id)
      .then(() => onViewed())
      .catch((e) => console.error(e));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const response: TicketResponse = {
      from: "customer",
      text: reply.trim(),
      authorName,
      at: Date.now(),
    };
    try {
      await addTicketResponse(ticket.id, response);
      setReply("");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const busy = saving || deleting;

  const handleSave = async () => {
    if (!description.trim()) {
      setError("Please describe your project.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateTicket(ticket.id, {
        projectType,
        budget,
        description: description.trim(),
      });
      onSaved();
    } catch (e) {
      console.error(e);
      setError("Couldn't save changes. Try again.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTicket(ticket.id);
      onDeleted();
    } catch (e) {
      console.error(e);
      setError("Couldn't delete the ticket. Try again.");
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brand-bar" />
        <div className="max-h-[80vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">Your Ticket</h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                <span
                  className="rounded-full px-2 py-0.5 font-semibold capitalize text-white"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  {ticket.status}
                </span>
                <span>Opened {formatDate(ticket.createdAt)}</span>
              </div>
            </div>
            <button
              onClick={() => !busy && onClose()}
              className="text-gray-400 transition hover:text-gray-900"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Project type
              </span>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
              >
                {!projectTypes.includes(projectType) && (
                  <option>{projectType}</option>
                )}
                {projectTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Budget range
              </span>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
              >
                {!budgets.includes(budget) && <option>{budget}</option>}
                {budgets.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-medium text-gray-700">
              Describe your project
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1.5 w-full resize-none rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
            />
          </label>

          {/* Conversation with the company */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700">Messages</p>
            {thread.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No messages yet. The team will respond here.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {[...thread]
                  .sort((a, b) => a.at - b.at)
                  .map((r, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        r.from === "customer" ? "justify-end" : "justify-start"
                      }`}
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
                            : "You"}
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
                  ))}
              </div>
            )}
            <div className="mt-3 flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Write a message to the team…"
                className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="flex items-center gap-1 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                <Send size={16} />
                {sending ? "…" : "Send"}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm font-medium" style={{ color: "var(--brand-accent)" }}>
              {error}
            </p>
          )}

          {confirmDelete ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold" style={{ color: "var(--brand-accent)" }}>
                Delete this ticket permanently?
              </p>
              <p className="mt-1 text-xs text-gray-600">
                This can&apos;t be undone.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: "var(--brand-accent)" }}
                >
                  <Trash2 size={16} />
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-white disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="flex items-center gap-1.5 text-sm font-semibold transition hover:underline disabled:opacity-60"
                style={{ color: "var(--brand-accent)" }}
              >
                <Trash2 size={16} />
                Delete ticket
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => !busy && onClose()}
                  disabled={busy}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={busy}
                  className="rounded-md px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
