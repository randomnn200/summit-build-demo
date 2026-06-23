export const EXPENSE_CATEGORIES = [
  "Food",
  "Gas",
  "Vehicle",
  "Materials & Supplies",
  "Tools",
  "Subcontractors",
  "Permits & Fees",
  "Office & Admin",
  "Insurance",
  "Utilities",
  "Lodging",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Maps legacy category labels saved before rename. */
export function normalizeExpenseCategory(value: string): ExpenseCategory {
  if (value === "Food & Meals") return "Food";
  if (value === "Gas & Fuel") return "Gas";
  if (value === "Vehicle & Mileage") return "Vehicle";
  if (value === "Tools & Equipment") return "Tools";
  if (EXPENSE_CATEGORIES.includes(value as ExpenseCategory)) {
    return value as ExpenseCategory;
  }
  return "Other";
}

export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Food: "🍽️",
  Gas: "⛽",
  Vehicle: "🚗",
  "Materials & Supplies": "🧱",
  Tools: "🔧",
  Subcontractors: "👷",
  "Permits & Fees": "📋",
  "Office & Admin": "📎",
  Insurance: "🛡️",
  Utilities: "💡",
  Lodging: "🏨",
  Other: "📦",
};

export const EXPENSE_DESCRIPTION_EXAMPLES: Record<ExpenseCategory, string> = {
  Food: "e.g. $24 lunch for crew at job site",
  Gas: "e.g. $50 on gas for Truck 1",
  Vehicle: "e.g. $18 tolls and mileage for Riverside job",
  "Materials & Supplies": "e.g. $120 on lumber at Home Depot",
  Tools: "e.g. $45 drill bits for framing",
  Subcontractors: "e.g. $800 electrician deposit for Miller job",
  "Permits & Fees": "e.g. $150 building permit for kitchen remodel",
  "Office & Admin": "e.g. $32 printer ink for office",
  Insurance: "e.g. $420 monthly liability premium",
  Utilities: "e.g. $95 shop electric bill",
  Lodging: "e.g. $110 hotel for out-of-town job",
  Other: "e.g. $40 miscellaneous supplies",
};

export function expenseDescription(exp: {
  description?: string;
  vendor?: string;
}) {
  return (exp.description ?? exp.vendor ?? "").trim();
}

export function isThisMonth(dateStr: string) {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
}

export function categoryColor(category: ExpenseCategory) {
  const map: Record<ExpenseCategory, string> = {
    Food: "#f59e0b",
    Gas: "#6366f1",
    Vehicle: "#8b5cf6",
    "Materials & Supplies": "#2563eb",
    Tools: "#64748b",
    Subcontractors: "#059669",
    "Permits & Fees": "#0d9488",
    "Office & Admin": "#94a3b8",
    Insurance: "#0891b2",
    Utilities: "#ca8a04",
    Lodging: "#db2777",
    Other: "#78716c",
  };
  return map[category];
}
