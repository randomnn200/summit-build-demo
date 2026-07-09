import { CRM_PIPELINE_STAGES, CRM_STAGE_LABELS } from "./crm";
import { changeOrderTotal } from "./constructionOps";
import { JOB_STATUS_LABELS } from "./jobs";
import type { AnalyticsWeeklySnapshot } from "./analyticsMetrics";
import { fmtAnalyticsMoney, weekStartDate } from "./analyticsMetrics";
import type {
  Expense,
  Job,
  QuoteRequest,
  Ticket,
} from "./firebase/firebaseUtils";
import type { ChangeOrder } from "./firebase/constructionOpsFirestore";
import type { CrmLead } from "./firebase/crmFirestore";

export type ReportPeriod = "7d" | "30d" | "90d" | "ytd" | "all";

export interface ReportFilters {
  period: ReportPeriod;
  expenseCategory: string;
  jobStatus: string;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  period: "30d",
  expenseCategory: "all",
  jobStatus: "all",
};

export interface ReportSlice {
  label: string;
  value: number;
  color: string;
}

export interface ReportTrendPoint {
  label: string;
  value: number;
}

export interface ReportTableRow {
  section: string;
  metric: string;
  value: string;
  sub?: string;
}

export interface ReportData {
  kpis: {
    totalExpenses: number;
    expenseCount: number;
    pipelineValue: number;
    approvedCoValue: number;
    activeJobs: number;
    crmWinRate: number;
    newLeads: number;
    openTickets: number;
  };
  expenseTrend: ReportTrendPoint[];
  expenseTrendMax: number;
  crmDonut: ReportSlice[];
  crmDonutTotal: number;
  jobsByStatus: ReportSlice[];
  leadSources: ReportSlice[];
  leadSourcesMax: number;
  opsComparison: { label: string; value: number; color: string }[];
  opsMax: number;
  historyTrend: ReportTrendPoint[];
  historyTrendMax: number;
  detailRows: ReportTableRow[];
}

const PBI_COLORS = [
  "#118DFF",
  "#12239E",
  "#E66C37",
  "#6B007B",
  "#E044A7",
  "#744EC2",
  "#D9B300",
  "#D64550",
  "#059669",
  "#6366f1",
];

export function reportPeriodLabel(period: ReportPeriod) {
  switch (period) {
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "ytd":
      return "Year to date";
    default:
      return "All time";
  }
}

function periodCutoff(period: ReportPeriod): string | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (period === "all") return null;
  if (period === "ytd") {
    return `${now.getFullYear()}-01-01`;
  }
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start.toISOString().slice(0, 10);
}

function tsCutoff(period: ReportPeriod): number | null {
  const dateStr = periodCutoff(period);
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00`).getTime() / 1000;
}

function inPeriodDate(dateStr: string, period: ReportPeriod) {
  const cutoff = periodCutoff(period);
  if (!cutoff) return true;
  return dateStr >= cutoff;
}

function inPeriodTs(
  ts: { seconds: number } | null | undefined,
  period: ReportPeriod
) {
  const cutoff = tsCutoff(period);
  if (!cutoff || !ts?.seconds) return !cutoff;
  return ts.seconds >= cutoff;
}

function weekKey(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return weekStartDate(d).toISOString().slice(0, 10);
}

function fmtWeekShort(weekId: string) {
  const d = new Date(`${weekId}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function computeReportData(
  input: {
    expenses: Expense[];
    jobs: Job[];
    crmLeads: CrmLead[];
    changeOrders: ChangeOrder[];
    homepageLeads: QuoteRequest[];
    tickets: Ticket[];
    snapshots: AnalyticsWeeklySnapshot[];
  },
  filters: ReportFilters
): ReportData {
  const { period, expenseCategory, jobStatus } = filters;

  let filteredExpenses = input.expenses.filter((e) => inPeriodDate(e.date, period));
  if (expenseCategory !== "all") {
    filteredExpenses = filteredExpenses.filter((e) => e.category === expenseCategory);
  }

  let filteredJobs = input.jobs.filter((j) => inPeriodTs(j.createdAt, period));
  if (jobStatus !== "all") {
    filteredJobs = filteredJobs.filter((j) => j.status === jobStatus);
  }

  const filteredCrm = input.crmLeads.filter((l) => inPeriodTs(l.createdAt, period));
  const filteredCos = input.changeOrders.filter((co) =>
    inPeriodTs(co.createdAt, period)
  );
  const filteredHomeLeads = input.homepageLeads.filter((l) =>
    inPeriodTs(l.createdAt, period)
  );
  const openTickets = input.tickets.filter(
    (t) => t.status === "open" || t.status === "in progress"
  ).length;

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const pipelineValue = filteredCrm
    .filter((l) => l.stage !== "lost")
    .reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  const approvedCoValue = filteredCos
    .filter((co) => co.status === "approved")
    .reduce((s, co) => s + changeOrderTotal(co), 0);
  const activeJobs =
    jobStatus === "all"
      ? input.jobs.filter((j) => j.status === "active").length
      : filteredJobs.filter((j) => j.status === "active").length;
  const won = filteredCrm.filter((l) => l.stage === "won").length;
  const lost = filteredCrm.filter((l) => l.stage === "lost").length;
  const crmWinRate =
    won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const expenseByWeek = new Map<string, number>();
  for (const e of filteredExpenses) {
    const key = weekKey(e.date);
    expenseByWeek.set(key, (expenseByWeek.get(key) ?? 0) + e.amount);
  }
  const expenseTrend = [...expenseByWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([key, value]) => ({ label: fmtWeekShort(key), value }));
  const expenseTrendMax = Math.max(1, ...expenseTrend.map((p) => p.value));

  const crmDonut = CRM_PIPELINE_STAGES.map((stage, i) => ({
    label: CRM_STAGE_LABELS[stage],
    value: filteredCrm.filter((l) => l.stage === stage).length,
    color: PBI_COLORS[i % PBI_COLORS.length],
  })).filter((s) => s.value > 0);
  const crmDonutTotal = crmDonut.reduce((s, x) => s + x.value, 0);

  const statusCounts = new Map<string, number>();
  const jobsForStatus =
    period === "all" && jobStatus === "all"
      ? input.jobs
      : jobStatus !== "all"
        ? input.jobs.filter((j) => j.status === jobStatus)
        : filteredJobs;
  for (const j of jobsForStatus) {
    statusCounts.set(j.status, (statusCounts.get(j.status) ?? 0) + 1);
  }
  const jobsByStatus = [...statusCounts.entries()].map(([status, value], i) => ({
    label: JOB_STATUS_LABELS[status as keyof typeof JOB_STATUS_LABELS] ?? status,
    value,
    color: PBI_COLORS[i % PBI_COLORS.length],
  }));

  const sourceCounts = new Map<string, number>();
  for (const l of filteredCrm) {
    const src = l.source || "Other";
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }
  const leadSources = [...sourceCounts.entries()]
    .map(([label, value], i) => ({
      label,
      value,
      color: PBI_COLORS[i % PBI_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const leadSourcesMax = Math.max(1, ...leadSources.map((s) => s.value));

  const opsComparison = [
    {
      label: "Change orders",
      value: filteredCos.length,
      color: PBI_COLORS[0],
    },
    {
      label: "Pending COs",
      value: filteredCos.filter((co) => co.status === "pending_approval").length,
      color: PBI_COLORS[2],
    },
    {
      label: "CRM leads",
      value: filteredCrm.length,
      color: PBI_COLORS[1],
    },
    {
      label: "Homepage leads",
      value: filteredHomeLeads.length,
      color: PBI_COLORS[4],
    },
  ];
  const opsMax = Math.max(1, ...opsComparison.map((o) => o.value));

  const historyTrend = [...input.snapshots]
    .sort((a, b) => a.weekId.localeCompare(b.weekId))
    .slice(-10)
    .map((s) => ({
      label: fmtWeekShort(s.weekId),
      value: s.expenseAmountThisMonth ?? 0,
    }));
  const historyTrendMax = Math.max(1, ...historyTrend.map((p) => p.value));

  const detailRows: ReportTableRow[] = [
    {
      section: "Financial",
      metric: "Total expenses",
      value: fmtAnalyticsMoney(totalExpenses),
      sub: `${filteredExpenses.length} transactions`,
    },
    {
      section: "Financial",
      metric: "Approved change orders",
      value: fmtAnalyticsMoney(approvedCoValue),
      sub: `${filteredCos.filter((co) => co.status === "approved").length} approved`,
    },
    {
      section: "CRM",
      metric: "Pipeline value",
      value: fmtAnalyticsMoney(pipelineValue),
      sub: `${filteredCrm.length} leads in period`,
    },
    {
      section: "CRM",
      metric: "Win rate",
      value: `${crmWinRate}%`,
      sub: `${won} won · ${lost} lost`,
    },
    {
      section: "Operations",
      metric: "Active jobs",
      value: String(activeJobs),
      sub: `${input.jobs.length} total job records`,
    },
    {
      section: "Operations",
      metric: "Pending change orders",
      value: String(
        filteredCos.filter((co) => co.status === "pending_approval").length
      ),
    },
    {
      section: "Leads",
      metric: "Homepage inquiries",
      value: String(filteredHomeLeads.length),
    },
    {
      section: "Leads",
      metric: "New homepage leads",
      value: String(filteredHomeLeads.filter((l) => l.status === "new").length),
    },
  ];

  return {
    kpis: {
      totalExpenses,
      expenseCount: filteredExpenses.length,
      pipelineValue,
      approvedCoValue,
      activeJobs,
      crmWinRate,
      newLeads: filteredHomeLeads.length + filteredCrm.filter((l) => l.stage === "new").length,
      openTickets,
    },
    expenseTrend,
    expenseTrendMax,
    crmDonut,
    crmDonutTotal,
    jobsByStatus,
    leadSources,
    leadSourcesMax,
    opsComparison,
    opsMax,
    historyTrend,
    historyTrendMax,
    detailRows,
  };
}

export { PBI_COLORS };
