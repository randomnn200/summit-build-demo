"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Briefcase, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/hooks/useAuth";
import { formatPhone } from "../lib/formatPhone";
import {
  emptyProfile,
  ensureUserRecord,
  getUserProfile,
  resolveRole,
  saveUserProfile,
  type Role,
  type UserProfile,
} from "../lib/firebase/firebaseUtils";

const GREEN = "#006847";
const RED = "#CE1126";

const roleLabels: Record<Role, string> = {
  owner: "Owner",
  employee: "Employee",
  customer: "Customer",
};

export default function ProfileMenu() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  const [role, setRole] = useState<Role>("customer");
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [assignedTitle, setAssignedTitle] = useState("");
  const [ready, setReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const handleLogin = async () => {
    setSigningIn(true);
    setSignInError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      const err = e as { code?: string };
      if (
        err.code === "auth/operation-not-allowed" ||
        err.code === "auth/configuration-not-found"
      ) {
        setSignInError("Google sign-in isn't enabled in Firebase yet.");
      } else if (err.code === "auth/unauthorized-domain") {
        setSignInError("Add localhost to Firebase authorized domains.");
      } else if (
        err.code !== "auth/popup-closed-by-user" &&
        err.code !== "auth/cancelled-popup-request"
      ) {
        setSignInError("Sign-in failed. Try again.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const load = useCallback(async () => {
    if (!user) return;
    setReady(false);
    setLoadError(null);
    try {
      await ensureUserRecord(user.uid, user.email, user.displayName);
      const [{ role, config }, existing] = await Promise.all([
        resolveRole(user.email),
        getUserProfile(user.uid),
      ]);
      setRole(role);
      const email = (user.email || "").toLowerCase();
      setAssignedTitle(config.employeeTitles?.[email] || "");
      setProfile({
        ...emptyProfile,
        displayName: existing?.displayName || user.displayName || "",
        city: existing?.city || "",
        title: existing?.title || "",
        phone: existing?.phone || "",
        contactEmail: existing?.contactEmail || user.email || "",
        bio: existing?.bio || "",
      });
    } catch (e) {
      console.error("Failed to load profile/role", e);
      const err = e as { code?: string; message?: string };
      if (err.code === "permission-denied") {
        setLoadError(
          "Firestore denied access. Check your security rules, then refresh."
        );
      } else if (err.code === "unavailable" || err.code === "failed-precondition") {
        setLoadError(
          "Couldn't reach Firestore. Make sure the database is created."
        );
      } else {
        setLoadError(err.code || err.message || "Couldn't load your profile.");
      }
    } finally {
      setReady(true);
    }
  }, [user]);

  useEffect(() => {
    if (user) load();
    else {
      setReady(false);
      setOpen(false);
    }
  }, [user, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={handleLogin}
          disabled={authLoading || signingIn}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google logo"
            className="h-4 w-4"
          />
          {signingIn ? "Signing in…" : "Log in / Sign up"}
        </button>
        {signInError && (
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-gray-100 bg-white p-3 text-sm font-medium shadow-xl" style={{ color: RED }}>
            {signInError}
          </div>
        )}
      </div>
    );
  }

  if (ready && loadError) {
    return (
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:bg-red-50"
          style={{ borderColor: RED, color: RED }}
        >
          Profile (setup issue)
        </button>
        {open && (
          <div className="absolute right-0 z-50 mt-2 w-72 max-w-[92vw] rounded-xl border border-gray-100 bg-white p-4 shadow-2xl">
            <p className="text-sm font-semibold" style={{ color: RED }}>
              Profile couldn&apos;t load
            </p>
            <p className="mt-1 text-sm text-gray-600">{loadError}</p>
            <button
              onClick={load}
              className="mt-3 w-full rounded-md px-3 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // Profile is available to every signed-in user (customer-facing).
  if (!ready) return null;

  const setField = (key: keyof UserProfile, value: string) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveUserProfile(user.uid, user.email, profile);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (e) {
      console.error("Failed to save profile", e);
    } finally {
      setSaving(false);
    }
  };

  const isStaff = role === "owner" || role === "employee";
  const initial = (profile.displayName || user.email || "U")[0].toUpperCase();

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 shadow-sm transition hover:bg-gray-50"
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="You" className="h-7 w-7 rounded-full" />
        ) : (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: GREEN }}
          >
            {initial}
          </span>
        )}
        <span className="hidden text-sm font-semibold text-gray-700 sm:inline">
          {profile.displayName || "Profile"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[92vw] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex h-1.5 w-full">
            <div className="flex-1" style={{ backgroundColor: GREEN }} />
            <div className="flex-1 bg-white" />
            <div className="flex-1" style={{ backgroundColor: RED }} />
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold leading-tight">
                  {profile.displayName || user.displayName || "Your profile"}
                </p>
                {assignedTitle && (
                  <p className="text-xs font-semibold" style={{ color: GREEN }}>
                    {assignedTitle}
                  </p>
                )}
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: role === "owner" ? RED : GREEN }}
              >
                <ShieldCheck size={12} />
                {roleLabels[role]}
              </span>
            </div>

            {isStaff && (
              <Link
                href="/portal"
                onClick={() => setOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: RED }}
              >
                <Briefcase size={16} />
                Open Employee Portal
              </Link>
            )}

            <div className="mt-4 space-y-3">
              <Field label="Display name">
                <input
                  value={profile.displayName}
                  onChange={(e) => setField("displayName", e.target.value)}
                  placeholder="Your name"
                  className="profile-input"
                />
              </Field>
              <Field label="City">
                <input
                  value={profile.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="City"
                  className="profile-input"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setField("phone", formatPhone(e.target.value))}
                  placeholder="(555) 555-5555"
                  className="profile-input"
                />
              </Field>
              <Field label="Contact email">
                <input
                  value={profile.contactEmail}
                  onChange={(e) => setField("contactEmail", e.target.value)}
                  placeholder="you@example.com"
                  className="profile-input"
                />
              </Field>
              <Field label="Bio">
                <textarea
                  value={profile.bio}
                  onChange={(e) => setField("bio", e.target.value)}
                  rows={2}
                  placeholder="A little about you…"
                  className="profile-input resize-none"
                />
              </Field>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {saving ? "Saving…" : savedAt ? "Saved ✓" : "Save profile"}
            </button>

            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
