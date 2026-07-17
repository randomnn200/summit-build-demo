import type { Role } from "./firebase/firebaseUtils";

export type PortalTab =
  | "tickets"
  | "clients"
  | "leads"
  | "crm"
  | "calls"
  | "jobs"
  | "ops"
  | "schedule"
  | "inventory"
  | "expenses"
  | "quotes"
  | "reviews"
  | "analytics"
  | "users"
  | "team"
  | "settings";

const OWNER_ONLY_TABS: PortalTab[] = [
  "clients",
  "leads",
  "crm",
  "calls",
  "quotes",
  "reviews",
  "analytics",
  "users",
  "team",
];

const SUPERINTENDENT_TABS: PortalTab[] = ["jobs", "ops", "inventory"];

const ALL_STAFF_TABS: PortalTab[] = [
  "tickets",
  "schedule",
  "expenses",
  "settings",
];

export function isStaffRole(role: Role): boolean {
  return role === "owner" || role === "superintendent" || role === "employee";
}

export function isSuperintendentOrAbove(role: Role): boolean {
  return role === "owner" || role === "superintendent";
}

export function isOwnerRole(role: Role): boolean {
  return role === "owner";
}

/** Owner or superintendent — team calendars, assign work (not financial admin). */
export function canManageFieldSchedule(role: Role): boolean {
  return isSuperintendentOrAbove(role);
}

export function canAccessPortalTab(role: Role, tab: PortalTab): boolean {
  if (role === "owner") return true;
  if (OWNER_ONLY_TABS.includes(tab)) return false;
  if (SUPERINTENDENT_TABS.includes(tab)) return role === "superintendent";
  if (ALL_STAFF_TABS.includes(tab)) return isStaffRole(role);
  return false;
}

export function defaultPortalTab(role: Role): PortalTab {
  if (role === "employee") return "schedule";
  if (role === "superintendent") return "ops";
  return "tickets";
}

export const roleLabels: Record<Role, string> = {
  owner: "Owner",
  superintendent: "Superintendent",
  employee: "Employee",
  customer: "Customer",
};

export function roleBadgeColor(role: Role): string {
  switch (role) {
    case "owner":
      return "var(--brand-accent)";
    case "superintendent":
      return "#d97706";
    case "employee":
      return "var(--brand-primary)";
    default:
      return "#64748b";
  }
}

/** Emails that can appear on crew schedule pickers. */
export function staffScheduleEmails(config: {
  employeeEmails: string[];
  superintendentEmails?: string[];
  ownerEmails: string[];
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of [
    ...config.ownerEmails,
    ...(config.superintendentEmails ?? []),
    ...config.employeeEmails,
  ]) {
    const e = email.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(email);
  }
  return out;
}
