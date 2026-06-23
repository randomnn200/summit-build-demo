"use client";

import {
  DEMO_GOOGLE_PLACE,
  DEMO_GOOGLE_REVIEWS,
  getGoogleReviewMetrics,
  reviewInitials,
} from "../lib/googleReviewsDemo";

function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
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

export default function GoogleReviewsSection() {
  const metrics = getGoogleReviewMetrics();
  const featured = DEMO_GOOGLE_REVIEWS.slice(0, 3);

  return (
    <section id="google-reviews" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="section-surface overflow-hidden px-8 py-12 md:px-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                <GoogleMark className="h-4 w-4" />
                Google Reviews
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                Pulled automatically from{" "}
                <span className="text-brand-primary">Google</span>
              </h2>
              <p className="mt-3 text-gray-600">
                In production, your site syncs with Google Business Profile so
                new reviews appear here without manual updates — building trust
                with real, verified feedback.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ReviewStars count={5} />
                <span className="text-lg font-black text-gray-900">
                  {metrics.averageRating}
                </span>
                <span className="text-sm text-gray-500">
                  · {metrics.totalReviews} Google reviews
                </span>
              </div>
            </div>

            <div className="w-full max-w-sm shrink-0 rounded-2xl border border-dashed border-brand-primary/30 bg-brand-primary/5 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                  <GoogleMark />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Google Business Profile
                  </p>
                  <p className="text-xs text-gray-500">{DEMO_GOOGLE_PLACE.name}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="font-medium text-gray-700">
                  Demo mode — sync not connected
                </span>
              </div>
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-400"
                title="Available when Google Business Profile is connected in production"
              >
                Connect Google (production)
              </button>
              <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                Uses Google Places API · refreshes on a schedule · no copy-paste
                needed
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {featured.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                      {reviewInitials(review.author)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {review.author}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {review.relativeDate}
                      </p>
                    </div>
                  </div>
                  <GoogleMark className="h-4 w-4 shrink-0 opacity-70" />
                </div>
                <ReviewStars count={review.rating} />
                <p className="mt-2 text-sm leading-relaxed text-gray-700 line-clamp-4">
                  {review.text}
                </p>
                <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  Posted on Google
                </p>
              </article>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            Sample reviews shown for demo purposes · live sites display your
            actual Google rating and latest feedback
          </p>
        </div>
      </div>
    </section>
  );
}
