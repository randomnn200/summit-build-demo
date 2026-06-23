"use client";

import { useEffect, useMemo, useState } from "react";
import { Send, Star } from "lucide-react";
import {
  cloneDemoReviews,
  DEMO_GOOGLE_PLACE,
  getGoogleReviewMetrics,
  reviewInitials,
  type GoogleReview,
} from "../lib/googleReviewsDemo";
import {
  saveGoogleReviewReply,
  subscribeToGoogleReviewReplies,
  type GoogleReviewReplyRecord,
} from "../lib/firebase/firebaseUtils";

type Filter = "all" | "needs-reply" | "replied";

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

function ReviewStars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`text-sm ${i < count ? "text-amber-400" : "text-gray-200"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewReplyEditor({
  review,
  onSave,
  saving,
}: {
  review: GoogleReview;
  onSave: (id: string, reply: string) => Promise<void>;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(review.ownerReply ?? "");
  const [editing, setEditing] = useState(!review.ownerReply);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(review.ownerReply ?? "");
    setEditing(!review.ownerReply);
  }, [review.id, review.ownerReply]);

  const post = async () => {
    const text = draft.trim();
    if (!text || saving) return;
    await onSave(review.id, text);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (review.ownerReply && !editing) {
    return (
      <div className="mt-4 rounded-lg border border-brand-primary/15 bg-brand-primary/5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
            Your reply · saved (demo sync to Google in production)
          </p>
          <button
            type="button"
            onClick={() => {
              setDraft(review.ownerReply ?? "");
              setEditing(true);
            }}
            className="text-[10px] font-semibold text-gray-500 hover:text-brand-primary"
          >
            Edit
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-700">{review.ownerReply}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {review.ownerReply ? "Edit reply" : "Reply on Google"}
      </label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder="Write a public response… (posts to Google in production)"
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={post}
          disabled={!draft.trim() || saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          {saving ? "Saving…" : review.ownerReply ? "Update reply" : "Post reply"}
        </button>
        {review.ownerReply && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
        {saved && (
          <span className="text-xs font-medium text-emerald-600">Reply saved</span>
        )}
      </div>
    </div>
  );
}

export function GoogleReviewsInbox({
  userName,
  userEmail,
  compact,
}: {
  userName: string | null;
  userEmail: string | null;
  compact?: boolean;
}) {
  const metrics = getGoogleReviewMetrics();
  const [replyMap, setReplyMap] = useState<
    Record<string, GoogleReviewReplyRecord>
  >({});
  const [filter, setFilter] = useState<Filter>("needs-reply");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToGoogleReviewReplies(setReplyMap);
  }, []);

  const reviews = useMemo(() => {
    return cloneDemoReviews().map((r) => {
      const saved = replyMap[r.id]?.reply;
      return {
        ...r,
        ownerReply: saved ?? r.ownerReply ?? null,
      };
    });
  }, [replyMap]);

  const filtered = useMemo(() => {
    if (filter === "needs-reply") {
      return reviews.filter((r) => !r.ownerReply);
    }
    if (filter === "replied") {
      return reviews.filter((r) => r.ownerReply);
    }
    return reviews;
  }, [reviews, filter]);

  const needsReplyCount = reviews.filter((r) => !r.ownerReply).length;

  const saveReply = async (id: string, reply: string) => {
    setSavingId(id);
    try {
      await saveGoogleReviewReply(
        id,
        reply,
        userName || userEmail || "Owner",
        userEmail
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className={compact ? "" : "space-y-6"}>
      {!compact && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                <GoogleMark className="h-5 w-5" />
                Google Reviews
              </h2>
              <p className="mt-1 text-sm text-gray-500">{DEMO_GOOGLE_PLACE.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <ReviewStars count={5} />
                <span className="font-bold text-gray-900">
                  {metrics.averageRating}
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">
                  {metrics.totalReviews} on Google
                </span>
                {needsReplyCount > 0 && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="font-semibold text-amber-700">
                      {needsReplyCount} need a reply
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Demo reviews shown here. In production, reviews sync from Google
            Business Profile and replies post back via the API.
          </p>
        </div>
      )}

      <div
        className={
          compact
            ? "flex shrink-0 gap-2 border-b border-gray-100 px-0 py-3"
            : "flex flex-wrap gap-2"
        }
      >
        {(
          [
            ["all", "All"],
            ["needs-reply", `Needs reply (${needsReplyCount})`],
            ["replied", "Replied"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filter === key
                ? "bg-brand-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={compact ? "space-y-4" : "space-y-4"}>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">
            {filter === "needs-reply"
              ? "All caught up — every review has a reply."
              : "No reviews in this filter."}
          </p>
        ) : (
          filtered.map((review) => (
            <article
              key={review.id}
              className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-primary shadow-sm">
                  {reviewInitials(review.author)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{review.author}</p>
                      <p className="text-xs text-gray-400">{review.relativeDate}</p>
                    </div>
                    <GoogleMark className="h-4 w-4 shrink-0 opacity-60" />
                  </div>
                  <ReviewStars count={review.rating} />
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    {review.text}
                  </p>
                  <ReviewReplyEditor
                    review={review}
                    onSave={saveReply}
                    saving={savingId === review.id}
                  />
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export default function GoogleReviewsTab({
  userName,
  userEmail,
}: {
  userName: string | null;
  userEmail: string | null;
}) {
  return (
    <GoogleReviewsInbox userName={userName} userEmail={userEmail} />
  );
}
