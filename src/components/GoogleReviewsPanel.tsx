"use client";

import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import {
  DEMO_GOOGLE_PLACE,
  getGoogleReviewMetrics,
} from "../lib/googleReviewsDemo";
import { GoogleReviewsInbox } from "./GoogleReviewsTab";

function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleReviewsPanel({
  open,
  onClose,
  userName,
  userEmail,
}: {
  open: boolean;
  onClose: () => void;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const metrics = getGoogleReviewMetrics();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-reviews-panel-title"
      >
        <div className="brand-bar shrink-0" />
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <GoogleMark className="h-5 w-5" />
              <h2
                id="google-reviews-panel-title"
                className="text-lg font-black text-gray-900"
              >
                Google Reviews
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">{DEMO_GOOGLE_PLACE.name}</p>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-bold">{metrics.averageRating}</span> ·{" "}
              {metrics.totalReviews} total on Google
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <GoogleReviewsInbox
            userName={userName ?? null}
            userEmail={userEmail ?? null}
            compact
          />
        </div>

        <footer className="shrink-0 border-t border-gray-100 bg-gray-50 px-5 py-3 text-center text-[11px] text-gray-400">
          Replies are saved to your portal. Production would sync to Google.
        </footer>
      </aside>
    </div>
  );
}

export function GoogleReviewsPanelTrigger({
  className = "",
  userName,
  userEmail,
}: {
  className?: string;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-lg border border-brand-primary/25 bg-brand-primary/5 px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/10 ${className}`}
      >
        <MessageSquare className="h-4 w-4" />
        See individual reviews
      </button>
      <GoogleReviewsPanel
        open={open}
        onClose={() => setOpen(false)}
        userName={userName}
        userEmail={userEmail}
      />
    </>
  );
}
