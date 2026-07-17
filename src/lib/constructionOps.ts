export const CHANGE_ORDER_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
] as const;
export type ChangeOrderStatus = (typeof CHANGE_ORDER_STATUSES)[number];

export const INVOICE_STATUSES = ["not_invoiced", "invoiced", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const CHANGE_ORDER_STATUS_LABELS: Record<ChangeOrderStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  not_invoiced: "Not invoiced",
  invoiced: "Invoiced",
  paid: "Paid",
};

export const DOCUMENT_CATEGORIES = [
  "drawings",
  "permits",
  "contracts",
  "rfis",
  "meeting_notes",
  "inspections",
  "photos",
  "other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  drawings: "Drawings",
  permits: "Permits",
  contracts: "Contracts",
  rfis: "RFIs",
  meeting_notes: "Meeting notes",
  inspections: "Inspection reports",
  photos: "Photos",
  other: "Other",
};

export const DOCUMENT_STATUSES = ["draft", "approved", "superseded"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const COST_CATEGORIES = [
  "labor",
  "materials",
  "equipment",
  "subcontractor",
  "other",
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  labor: "Labor",
  materials: "Materials",
  equipment: "Equipment",
  subcontractor: "Subcontractors",
  other: "Other",
};

export const SUB_PAYMENT_STATUSES = ["current", "pending", "overdue"] as const;
export type SubPaymentStatus = (typeof SUB_PAYMENT_STATUSES)[number];

export const CHECKOUT_STATUSES = ["out", "returned", "overdue", "maintenance"] as const;
export type CheckoutStatus = (typeof CHECKOUT_STATUSES)[number];

export function changeOrderTotal(co: {
  laborCost: number;
  materialsCost: number;
  otherCost: number;
}) {
  return co.laborCost + co.materialsCost + co.otherCost;
}

export function daysUntil(dateStr: string) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export function isExpiringSoon(dateStr: string, withinDays = 30) {
  const d = daysUntil(dateStr);
  return d != null && d >= 0 && d <= withinDays;
}

export function isExpired(dateStr: string) {
  const d = daysUntil(dateStr);
  return d != null && d < 0;
}

export function jobHealthPercent(budget: number, actual: number) {
  if (budget <= 0) return actual > 0 ? 0 : 100;
  return Math.max(0, Math.min(100, ((budget - actual) / budget) * 100));
}

export function jobHealthLabel(budget: number, actual: number) {
  if (budget <= 0) return "no_budget";
  const ratio = actual / budget;
  if (ratio <= 0.85) return "healthy";
  if (ratio <= 1) return "watch";
  return "over";
}

// —— RFIs ——
export const RFI_STATUSES = ["open", "pending", "closed"] as const;
export type RfiStatus = (typeof RFI_STATUSES)[number];

export const RFI_STATUS_LABELS: Record<RfiStatus, string> = {
  open: "Open",
  pending: "Pending response",
  closed: "Closed",
};

export function generateRfiNumber(jobId: string, existingCount: number) {
  const seq = String(existingCount + 1).padStart(3, "0");
  return `RFI-${jobId}-${seq}`;
}

// —— Daily reports ——
export const WEATHER_OPTIONS = [
  "Clear",
  "Partly cloudy",
  "Cloudy",
  "Rain",
  "Snow",
  "Windy",
  "Extreme heat",
  "Other",
] as const;

// —— Punch list ——
export const PUNCH_STATUSES = ["open", "in_progress", "complete"] as const;
export type PunchStatus = (typeof PUNCH_STATUSES)[number];

export const PUNCH_STATUS_LABELS: Record<PunchStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  complete: "Complete",
};

// —— Permits & inspections ——
export const PERMIT_STATUSES = ["pending", "active", "expired", "closed"] as const;
export type PermitStatus = (typeof PERMIT_STATUSES)[number];

export const PERMIT_STATUS_LABELS: Record<PermitStatus, string> = {
  pending: "Pending",
  active: "Active",
  expired: "Expired",
  closed: "Closed",
};

export const INSPECTION_RESULTS = ["scheduled", "passed", "failed", "cancelled"] as const;
export type InspectionResult = (typeof INSPECTION_RESULTS)[number];

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = {
  scheduled: "Scheduled",
  passed: "Passed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export interface OpsActivityEntry {
  at: number;
  by: string;
  action: string;
}
