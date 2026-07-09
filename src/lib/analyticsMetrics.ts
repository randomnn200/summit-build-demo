import { CRM_PIPELINE_STAGES, CRM_STAGE_LABELS, isReminderDue, isReminderOverdue } from "./crm";
import { changeOrderTotal } from "./constructionOps";
import { isThisMonth as isExpenseThisMonth } from "./expenses";
import { isLowStock } from "./inventory";
import { companyTicketState, ticketStatuses } from "./firebase/firebaseUtils";
import type {
  CallNote,
  Expense,
  InventoryItem,
  Job,
  PurchaseOrder,
  QuoteRequest,
  SavedQuote,
  ScheduleItem,
  StoredUser,
  Ticket,
  TimeOffRequest,
} from "./firebase/firebaseUtils";
import type {
  ChangeOrder,
  JobBudget,
  ProjectDocument,
  Subcontractor,
  ToolCheckout,
} from "./firebase/constructionOpsFirestore";
import type {
  CrmEstimate,
  CrmLead,
  CrmProposal,
  CrmReminder,
} from "./firebase/crmFirestore";
import type { GoogleReviewMetrics } from "./googleReviewsDemo";
import { getGoogleReviewMetrics } from "./googleReviewsDemo";

export type { GoogleReviewMetrics };

export interface CountBar {
  label: string;
  count: number;
}

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
  // Expenses & quotes
  expensesThisMonth: number;
  expenseAmountThisMonth: number;
  expensesByCategory: { category: string; total: number }[];
  expenseCategoryMax: number;
  savedQuotesTotal: number;
  savedQuotesThisMonth: number;
  // Inventory & POs
  inventoryItemsTotal: number;
  inventoryLowStock: number;
  purchaseOrdersOpen: number;
  purchaseOrdersTotal: number;
  // Call notes & time off
  callNotesTotal: number;
  callNotesThisWeek: number;
  timeOffPending: number;
  // Project ops
  changeOrdersTotal: number;
  changeOrdersPending: number;
  changeOrdersApprovedValue: number;
  changeOrderCounts: CountBar[];
  changeOrderMax: number;
  projectDocumentsTotal: number;
  subcontractorsTotal: number;
  subcontractorsPaymentOverdue: number;
  toolsOutNow: number;
  toolsOverdue: number;
  jobBudgetsSet: number;
  // CRM
  crmLeadsTotal: number;
  crmPipelineCounts: CountBar[];
  crmPipelineMax: number;
  crmEstimatesTotal: number;
  crmEstimatesSent: number;
  crmProposalsTotal: number;
  crmProposalsAccepted: number;
  crmRemindersDue: number;
  crmRemindersOverdue: number;
}

export interface AnalyticsWeeklySnapshot extends AnalyticsMetrics {
  weekId: string;
  weekLabel: string;
  savedAt: number;
}

export interface AnalyticsExtras {
  expenses?: Expense[];
  savedQuotes?: SavedQuote[];
  callNotes?: CallNote[];
  inventory?: InventoryItem[];
  purchaseOrders?: PurchaseOrder[];
  changeOrders?: ChangeOrder[];
  projectDocuments?: ProjectDocument[];
  jobBudgets?: JobBudget[];
  toolCheckouts?: ToolCheckout[];
  subcontractors?: Subcontractor[];
  crmLeads?: CrmLead[];
  crmEstimates?: CrmEstimate[];
  crmReminders?: CrmReminder[];
  crmProposals?: CrmProposal[];
  timeOffRequests?: TimeOffRequest[];
}

function isWithinDays(ts: { seconds: number } | null | undefined, days: number) {
  if (!ts?.seconds) return false;
  const cutoff = Date.now() / 1000 - days * 86400;
  return ts.seconds >= cutoff;
}

function isThisMonth(ts: { seconds: number } | null | undefined) {
  if (!ts?.seconds) return false;
  const d = new Date(ts.seconds * 1000);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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

export function fmtAnalyticsMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const EMPTY_METRICS: AnalyticsMetrics = {
  newLeads: 0,
  leadsRecent7d: 0,
  openTickets: 0,
  needsAttention: 0,
  leadsThisMonth: 0,
  signedUpClients: 0,
  jobsThisWeek: 0,
  totalJobs: 0,
  activeJobs: 0,
  newJobsThisWeek: 0,
  linkedScheduleThisWeek: 0,
  funnelNew: 0,
  funnelContacted: 0,
  funnelClosed: 0,
  funnelTotal: 0,
  ticketCounts: ticketStatuses.map((status) => ({ status, count: 0 })),
  ticketMax: 1,
  jobsByPostalCode: [],
  postalCodeMax: 1,
  googleReviews: getGoogleReviewMetrics(),
  expensesThisMonth: 0,
  expenseAmountThisMonth: 0,
  expensesByCategory: [],
  expenseCategoryMax: 1,
  savedQuotesTotal: 0,
  savedQuotesThisMonth: 0,
  inventoryItemsTotal: 0,
  inventoryLowStock: 0,
  purchaseOrdersOpen: 0,
  purchaseOrdersTotal: 0,
  callNotesTotal: 0,
  callNotesThisWeek: 0,
  timeOffPending: 0,
  changeOrdersTotal: 0,
  changeOrdersPending: 0,
  changeOrdersApprovedValue: 0,
  changeOrderCounts: [],
  changeOrderMax: 1,
  projectDocumentsTotal: 0,
  subcontractorsTotal: 0,
  subcontractorsPaymentOverdue: 0,
  toolsOutNow: 0,
  toolsOverdue: 0,
  jobBudgetsSet: 0,
  crmLeadsTotal: 0,
  crmPipelineCounts: [],
  crmPipelineMax: 1,
  crmEstimatesTotal: 0,
  crmEstimatesSent: 0,
  crmProposalsTotal: 0,
  crmProposalsAccepted: 0,
  crmRemindersDue: 0,
  crmRemindersOverdue: 0,
};

export function normalizeAnalyticsMetrics(
  partial: Partial<AnalyticsMetrics> | null | undefined
): AnalyticsMetrics {
  if (!partial) return { ...EMPTY_METRICS };
  return {
    ...EMPTY_METRICS,
    ...partial,
    ticketCounts: partial.ticketCounts ?? EMPTY_METRICS.ticketCounts,
    jobsByPostalCode: partial.jobsByPostalCode ?? [],
    expensesByCategory: partial.expensesByCategory ?? [],
    changeOrderCounts: partial.changeOrderCounts ?? [],
    crmPipelineCounts: partial.crmPipelineCounts ?? [],
    googleReviews: partial.googleReviews ?? getGoogleReviewMetrics(),
  };
}

export function computeAnalyticsMetrics(
  tickets: Ticket[],
  leads: QuoteRequest[],
  users: StoredUser[],
  schedule: ScheduleItem[],
  jobs: Job[] = [],
  extras: AnalyticsExtras = {}
): AnalyticsMetrics {
  const {
    expenses = [],
    savedQuotes = [],
    callNotes = [],
    inventory = [],
    purchaseOrders = [],
    changeOrders = [],
    projectDocuments = [],
    jobBudgets = [],
    toolCheckouts = [],
    subcontractors = [],
    crmLeads = [],
    crmEstimates = [],
    crmReminders = [],
    crmProposals = [],
    timeOffRequests = [],
  } = extras;

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
  const newJobsThisWeek = jobs.filter((j) => isWithinDays(j.createdAt, 7)).length;

  const funnelNew = leads.filter((l) => l.status === "new").length;
  const funnelContacted = leads.filter((l) => l.status === "contacted").length;
  const funnelClosed = leads.filter((l) => l.status === "closed").length;
  const funnelTotal = leads.length;

  const ticketCounts = ticketStatuses.map((status) => ({
    status,
    count: tickets.filter((t) => t.status.toLowerCase() === status.toLowerCase())
      .length,
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

  const monthExpenses = expenses.filter((e) => isExpenseThisMonth(e.date));
  const expensesThisMonth = monthExpenses.length;
  const expenseAmountThisMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const categoryTotals = new Map<string, number>();
  for (const e of monthExpenses) {
    categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount);
  }
  const expensesByCategory = Array.from(categoryTotals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const expenseCategoryMax = Math.max(1, ...expensesByCategory.map((x) => x.total));

  const savedQuotesTotal = savedQuotes.length;
  const savedQuotesThisMonth = savedQuotes.filter((q) =>
    isThisMonth(q.createdAt)
  ).length;

  const inventoryItemsTotal = inventory.length;
  const inventoryLowStock = inventory.filter((i) =>
    isLowStock(i.quantity, i.reorderLevel)
  ).length;

  const purchaseOrdersTotal = purchaseOrders.length;
  const purchaseOrdersOpen = purchaseOrders.filter(
    (p) => p.status !== "received" && p.status !== "cancelled"
  ).length;

  const callNotesTotal = callNotes.length;
  const callNotesThisWeek = callNotes.filter((n) =>
    isWithinDays(n.createdAt, 7)
  ).length;

  const timeOffPending = timeOffRequests.filter((r) => r.status === "pending").length;

  const changeOrdersTotal = changeOrders.length;
  const changeOrdersPending = changeOrders.filter(
    (co) => co.status === "pending_approval"
  ).length;
  const changeOrdersApprovedValue = changeOrders
    .filter((co) => co.status === "approved")
    .reduce((s, co) => s + changeOrderTotal(co), 0);
  const changeOrderCounts: CountBar[] = [
    { label: "Pending", count: changeOrdersPending },
    {
      label: "Approved",
      count: changeOrders.filter((co) => co.status === "approved").length,
    },
    {
      label: "Draft",
      count: changeOrders.filter((co) => co.status === "draft").length,
    },
    {
      label: "Rejected",
      count: changeOrders.filter((co) => co.status === "rejected").length,
    },
  ];
  const changeOrderMax = Math.max(1, ...changeOrderCounts.map((x) => x.count));

  const projectDocumentsTotal = projectDocuments.length;
  const subcontractorsTotal = subcontractors.length;
  const subcontractorsPaymentOverdue = subcontractors.filter(
    (s) => s.paymentStatus === "overdue"
  ).length;
  const toolsOutNow = toolCheckouts.filter((t) => t.status === "out").length;
  const toolsOverdue = toolCheckouts.filter((t) => t.status === "overdue").length;
  const jobBudgetsSet = jobBudgets.length;

  const crmLeadsTotal = crmLeads.length;
  const crmPipelineCounts = CRM_PIPELINE_STAGES.map((stage) => ({
    label: CRM_STAGE_LABELS[stage],
    count: crmLeads.filter((l) => l.stage === stage).length,
  }));
  const crmPipelineMax = Math.max(1, ...crmPipelineCounts.map((x) => x.count));

  const crmEstimatesTotal = crmEstimates.length;
  const crmEstimatesSent = crmEstimates.filter(
    (e) => e.status === "sent" || e.status === "accepted"
  ).length;
  const crmProposalsTotal = crmProposals.length;
  const crmProposalsAccepted = crmProposals.filter(
    (p) => p.status === "accepted"
  ).length;
  const crmRemindersDue = crmReminders.filter(
    (r) => isReminderDue(r.dueDate, r.completed)
  ).length;
  const crmRemindersOverdue = crmReminders.filter(
    (r) => isReminderOverdue(r.dueDate, r.completed)
  ).length;

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
    expensesThisMonth,
    expenseAmountThisMonth,
    expensesByCategory,
    expenseCategoryMax,
    savedQuotesTotal,
    savedQuotesThisMonth,
    inventoryItemsTotal,
    inventoryLowStock,
    purchaseOrdersOpen,
    purchaseOrdersTotal,
    callNotesTotal,
    callNotesThisWeek,
    timeOffPending,
    changeOrdersTotal,
    changeOrdersPending,
    changeOrdersApprovedValue,
    changeOrderCounts,
    changeOrderMax,
    projectDocumentsTotal,
    subcontractorsTotal,
    subcontractorsPaymentOverdue,
    toolsOutNow,
    toolsOverdue,
    jobBudgetsSet,
    crmLeadsTotal,
    crmPipelineCounts,
    crmPipelineMax,
    crmEstimatesTotal,
    crmEstimatesSent,
    crmProposalsTotal,
    crmProposalsAccepted,
    crmRemindersDue,
    crmRemindersOverdue,
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
