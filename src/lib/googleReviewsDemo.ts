/** Demo-only Google Reviews data — production would sync via Google Business Profile / Places API. */

export interface GoogleReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  relativeDate: string;
  /** Owner reply synced to Google in production */
  ownerReply?: string | null;
}

export interface GoogleReviewMetrics {
  averageRating: number;
  totalReviews: number;
  reviewsThisMonth: number;
  fiveStarPercent: number;
  ratingBreakdown: { stars: 5 | 4 | 3 | 2 | 1; count: number }[];
}

export const DEMO_GOOGLE_PLACE = {
  name: "Summit Build Co.",
  placeId: "ChIJdemo-place-id",
  mapsUrl: "https://maps.google.com",
};

export const DEMO_GOOGLE_REVIEWS: GoogleReview[] = [
  {
    id: "g1",
    author: "Michael Torres",
    rating: 5,
    text: "Outstanding work on our deck and patio. Showed up on time every day and the final result exceeded expectations.",
    relativeDate: "1 week ago",
  },
  {
    id: "g2",
    author: "Jennifer Walsh",
    rating: 5,
    text: "Professional from estimate to completion. They handled permits and kept our neighbors informed during the build.",
    relativeDate: "2 weeks ago",
    ownerReply:
      "Thank you, Jennifer! It was a pleasure working with you and your family on the addition.",
  },
  {
    id: "g3",
    author: "David Okonkwo",
    rating: 5,
    text: "Best contractor we've used. Clear pricing, responsive team, and quality craftsmanship throughout.",
    relativeDate: "3 weeks ago",
  },
  {
    id: "g4",
    author: "Amanda Reyes",
    rating: 4,
    text: "Great kitchen remodel. One minor punch-list item took an extra visit but they resolved it quickly.",
    relativeDate: "1 month ago",
    ownerReply:
      "Thanks Amanda — glad we could wrap up that last detail for you. Enjoy the new kitchen!",
  },
  {
    id: "g5",
    author: "Chris Hoffman",
    rating: 5,
    text: "Built our office expansion ahead of schedule. Would recommend to any local business owner.",
    relativeDate: "1 month ago",
    ownerReply:
      "Appreciate the recommendation, Chris. Wishing your team all the best in the new space!",
  },
  {
    id: "g6",
    author: "Patricia Nguyen",
    rating: 5,
    text: "Honest, organized, and skilled. They treated our home with respect and left the site clean daily.",
    relativeDate: "2 months ago",
  },
  {
    id: "g7",
    author: "Tom Bradley",
    rating: 3,
    text: "Good work overall on the bathroom update, but communication slowed down near the end of the project.",
    relativeDate: "2 months ago",
  },
  {
    id: "g8",
    author: "Elena Vasquez",
    rating: 5,
    text: "They transformed our dated living room into something we are proud to show guests. Highly recommend.",
    relativeDate: "3 months ago",
    ownerReply:
      "Elena, thank you for trusting us with your home. We're thrilled you love the results!",
  },
  {
    id: "g9",
    author: "Greg & Sue Palmer",
    rating: 5,
    text: "Roof replacement was done in two days with zero mess left behind. Fair quote and friendly crew.",
    relativeDate: "3 months ago",
  },
  {
    id: "g10",
    author: "Nina Kowalski",
    rating: 4,
    text: "Solid commercial tenant improvement. A few scheduling changes but the team stayed flexible.",
    relativeDate: "4 months ago",
    ownerReply:
      "Thanks Nina — we know timelines matter for commercial clients and appreciate your patience.",
  },
  {
    id: "g11",
    author: "Ryan Foster",
    rating: 2,
    text: "Project took longer than the original estimate. Quality was fine but we expected clearer updates.",
    relativeDate: "5 months ago",
  },
  {
    id: "g12",
    author: "Lisa Harmon",
    rating: 5,
    text: "From design consult to final walkthrough, every step felt organized and professional.",
    relativeDate: "6 months ago",
  },
];

const RATING_BREAKDOWN = [
  { stars: 5 as const, count: 108 },
  { stars: 4 as const, count: 14 },
  { stars: 3 as const, count: 3 },
  { stars: 2 as const, count: 1 },
  { stars: 1 as const, count: 1 },
];

export function getGoogleReviewMetrics(): GoogleReviewMetrics {
  const totalReviews = RATING_BREAKDOWN.reduce((n, r) => n + r.count, 0);
  const fiveStar = RATING_BREAKDOWN.find((r) => r.stars === 5)?.count ?? 0;
  return {
    averageRating: 4.9,
    totalReviews,
    reviewsThisMonth: 8,
    fiveStarPercent: Math.round((fiveStar / totalReviews) * 100),
    ratingBreakdown: RATING_BREAKDOWN,
  };
}

export function cloneDemoReviews(): GoogleReview[] {
  return DEMO_GOOGLE_REVIEWS.map((r) => ({ ...r }));
}

export function reviewInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
