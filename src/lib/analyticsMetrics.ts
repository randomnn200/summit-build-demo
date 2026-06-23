import { companyTicketState, ticketStatuses } from "./firebase/firebaseUtils";
import type {
  Job,
  QuoteRequest,
  ScheduleItem,
  StoredUser,
  Ticket,
} from "./firebase/firebaseUtils";
import type { GoogleReviewMetrics } from "./googleReviewsDemo";
import { getGoogleReviewMetrics } from "./googleReviewsDemo";

export type { GoogleReviewMetrics };

export interface AnalyticsMetrics {
  newLeads: number;
  leadsRecent7d: number;
  openTickets: number;
  needsAttention: number;
  leadsThisMonth: number;
  signedUpClients: number;
  jobsThisWeek: number;
  totalJobs: number;
  activeJobs: number;
  newJobsThisWeek: number;
  linkedScheduleThisWeek: number;
  funnelNew: number;
  funnelContacted: number;
  funnelClosed: number;
  funnelTotal: number;
  ticketCounts: { status: string; count: number }[];
  ticketMax: number;
  jobsByPostalCode: { postalCode: string; count: number }[];
  postalCodeMax: number;
  googleReviews: GoogleReviewMetrics;
}

export interface AnalyticsWeeklySnapshot extends AnalyticsMetrics {
  weekId: string;
  weekLabel: string;
  savedAt: number;
}

function isWithinDays(
  ts: { seconds: number } | null | undefined,
  days: number
) {
  if (!ts?.seconds) return false;
  const cutoff = Date.now() / 1000 - days * 86400;
  return ts.seconds >= cutoff;
}

function isThisMonth(ts: { seconds: number } | null | undefined) {
  if (!ts?.seconds) return false;
  const d = new Date(ts.seconds * 1000);
  const now = new Date();
  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
}

function isDateThisWeek(dateStr: string) {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T12:00:00`);
  const start = weekStartDate(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

/** Monday-based week start (local time). */
export function weekStartDate(d = new Date()): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

export function getWeekId(d = new Date()): string {
  return weekStartDate(d).toISOString().slice(0, 10);
}

export function formatWeekLabel(weekId: string): string {
  const start = new Date(`${weekId}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endFmt = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt(start)} – ${endFmt}`;
}

export function computeAnalyticsMetrics(
  tickets: Ticket[],
  leads: QuoteRequest[],
  users: StoredUser[],
  schedule: ScheduleItem[],
  jobs: Job[] = []
): AnalyticsMetrics {
  const newLeads = leads.filter((l) => l.status === "new").length;
  const leadsRecent7d = leads.filter((l) => isWithinDays(l.createdAt, 7)).length;
  const openTickets = tickets.filter(
    (t) => t.status === "open" || t.status === "in progress"
  ).length;
  const needsAttention = tickets.filter(
    (t) => companyTicketState(t) === "attention"
  ).length;
  const leadsThisMonth = leads.filter((l) => isThisMonth(l.createdAt)).length;
  const jobsThisWeek = schedule.filter((s) => isDateThisWeek(s.date)).length;
  const linkedScheduleThisWeek = schedule.filter(
    (s) => isDateThisWeek(s.date) && s.jobId
  ).length;
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const newJobsThisWeek = jobs.filter((j) =>
    isWithinDays(j.createdAt, 7)
  ).length;
  const funnelNew = leads.filter((l) => l.status === "new").length;
  const funnelContacted = leads.filter((l) => l.status === "contacted").length;
  const funnelClosed = leads.filter((l) => l.status === "closed").length;
  const funnelTotal = leads.length;
  const ticketCounts = ticketStatuses.map((status) => ({
    status,
    count: tickets.filter(
      (t) => t.status.toLowerCase() === status.toLowerCase()
    ).length,
  }));
  const ticketMax = Math.max(1, ...ticketCounts.map((x) => x.count));

  const postalCounts = new Map<string, number>();
  for (const j of jobs) {
    const code = j.postalCode?.trim();
    if (!code) continue;
    postalCounts.set(code, (postalCounts.get(code) ?? 0) + 1);
  }
  const jobsByPostalCode = Array.from(postalCounts.entries())
    .map(([postalCode, count]) => ({ postalCode, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const postalCodeMax = Math.max(1, ...jobsByPostalCode.map((x) => x.count));

  return {
    newLeads,
    leadsRecent7d,
    openTickets,
    needsAttention,
    leadsThisMonth,
    signedUpClients: users.length,
    jobsThisWeek,
    totalJobs,
    activeJobs,
    newJobsThisWeek,
    linkedScheduleThisWeek,
    funnelNew,
    funnelContacted,
    funnelClosed,
    funnelTotal,
    ticketCounts,
    ticketMax,
    jobsByPostalCode,
    postalCodeMax,
    googleReviews: getGoogleReviewMetrics(),
  };
}

export function snapshotFromMetrics(
  weekId: string,
  metrics: AnalyticsMetrics
): AnalyticsWeeklySnapshot {
  return {
    ...metrics,
    weekId,
    weekLabel: formatWeekLabel(weekId),
    savedAt: Date.now(),
  };
}
