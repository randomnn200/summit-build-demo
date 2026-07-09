import { moneyInputFromNumber, parseMoneyInput } from "./formatMoneyInput";

export const QUOTE_PROJECT_TYPES = [
  "Kitchen Remodel",
  "Bathroom Remodel",
  "Whole-Home Remodel",
  "Room Addition",
  "Deck / Outdoor",
  "Commercial Build-Out",
  "New Construction",
  "Repair / Service",
  "Other",
] as const;

export type QuoteProjectType = (typeof QUOTE_PROJECT_TYPES)[number];

export const LABOR_TIER_OPTIONS = [
  {
    id: "general",
    label: "General labor",
    rate: 42,
    hint: "Helpers, cleanup, basic tasks — ~$30/hr base + burden",
  },
  {
    id: "skilled",
    label: "Skilled tradesperson",
    rate: 52,
    hint: "Carpenters, finish work — ~$38/hr base + burden",
  },
  {
    id: "lead",
    label: "Lead / foreman",
    rate: 68,
    hint: "Supervision, complex work — ~$50/hr base + burden",
  },
  {
    id: "custom",
    label: "Custom rate",
    rate: 52,
    hint: "Enter your loaded hourly cost below",
  },
] as const;

export type LaborTierId = (typeof LABOR_TIER_OPTIONS)[number]["id"];

/** Loaded hourly rate = wages + payroll tax, GL, workers comp, benefits (~1.35–1.5× base pay). */
export const DEFAULT_QUOTE_DEFAULTS = {
  crewSize: 2,
  daysOnSite: 5,
  hoursPerDay: 8,
  laborTier: "skilled" as LaborTierId,
  loadedLaborRate: 52,
  materialsCost: 3500,
  materialsMarkupPercent: 18,
  subcontractorCost: 0,
  subcontractorMarkupPercent: 12,
  permitFees: 250,
  equipmentRental: 0,
  travelMiles: 0,
  travelRatePerMile: 0.7,
  dumpsterDisposal: 450,
  overheadPercent: 12,
  contingencyPercent: 10,
  profitPercent: 15,
};

export interface QuoteEstimatorInput {
  customerName: string;
  projectName: string;
  projectType: QuoteProjectType;
  scopeNotes: string;
  crewSize: number;
  daysOnSite: number;
  hoursPerDay: number;
  loadedLaborRate: number;
  materialsCost: number;
  materialsMarkupPercent: number;
  subcontractorCost: number;
  subcontractorMarkupPercent: number;
  permitFees: number;
  equipmentRental: number;
  travelMiles: number;
  travelRatePerMile: number;
  dumpsterDisposal: number;
  overheadPercent: number;
  contingencyPercent: number;
  profitPercent: number;
}

export interface QuoteBreakdownLine {
  label: string;
  amount: number;
  detail?: string;
}

export interface QuoteEstimateResult {
  laborCost: number;
  laborHours: number;
  materialsWithMarkup: number;
  materialsMarkupAmount: number;
  subsWithMarkup: number;
  subsMarkupAmount: number;
  travelCost: number;
  directCosts: number;
  overheadAmount: number;
  subtotalBeforeContingency: number;
  contingencyAmount: number;
  subtotalBeforeProfit: number;
  profitAmount: number;
  suggestedTotal: number;
  lowRange: number;
  highRange: number;
  profitMarginPercent: number;
  effectiveHourlyToClient: number;
  lines: QuoteBreakdownLine[];
}

export function projectTypeDefaults(type: QuoteProjectType): Partial<QuoteEstimatorInput> {
  switch (type) {
    case "Kitchen Remodel":
      return {
        daysOnSite: 14,
        crewSize: 3,
        materialsCost: 12000,
        permitFees: 350,
        dumpsterDisposal: 550,
      };
    case "Bathroom Remodel":
      return {
        daysOnSite: 8,
        crewSize: 2,
        materialsCost: 6500,
        permitFees: 200,
        dumpsterDisposal: 350,
      };
    case "Whole-Home Remodel":
      return {
        daysOnSite: 45,
        crewSize: 4,
        materialsCost: 45000,
        permitFees: 800,
        dumpsterDisposal: 1200,
        subcontractorCost: 8000,
      };
    case "Room Addition":
      return {
        daysOnSite: 25,
        crewSize: 4,
        materialsCost: 22000,
        permitFees: 600,
        dumpsterDisposal: 800,
        subcontractorCost: 3500,
      };
    case "Deck / Outdoor":
      return {
        daysOnSite: 6,
        crewSize: 2,
        materialsCost: 4800,
        permitFees: 150,
        dumpsterDisposal: 300,
      };
    case "Commercial Build-Out":
      return {
        daysOnSite: 20,
        crewSize: 4,
        materialsCost: 18000,
        permitFees: 500,
        subcontractorCost: 6000,
      };
    case "New Construction":
      return {
        daysOnSite: 90,
        crewSize: 5,
        materialsCost: 85000,
        permitFees: 2500,
        subcontractorCost: 25000,
        equipmentRental: 1200,
      };
    case "Repair / Service":
      return {
        daysOnSite: 1,
        crewSize: 1,
        materialsCost: 150,
        permitFees: 0,
        dumpsterDisposal: 0,
      };
    default:
      return {};
  }
}

export function computeQuoteEstimate(input: QuoteEstimatorInput): QuoteEstimateResult {
  const laborHours = input.crewSize * input.daysOnSite * input.hoursPerDay;
  const laborCost = laborHours * input.loadedLaborRate;

  const materialsMarkupAmount =
    input.materialsCost * (input.materialsMarkupPercent / 100);
  const materialsWithMarkup = input.materialsCost + materialsMarkupAmount;

  const subsMarkupAmount =
    input.subcontractorCost * (input.subcontractorMarkupPercent / 100);
  const subsWithMarkup = input.subcontractorCost + subsMarkupAmount;

  const travelCost = input.travelMiles * input.travelRatePerMile;

  const directCosts =
    laborCost +
    materialsWithMarkup +
    subsWithMarkup +
    input.permitFees +
    input.equipmentRental +
    travelCost +
    input.dumpsterDisposal;

  const overheadAmount = directCosts * (input.overheadPercent / 100);
  const subtotalBeforeContingency = directCosts + overheadAmount;

  const contingencyAmount =
    subtotalBeforeContingency * (input.contingencyPercent / 100);
  const subtotalBeforeProfit = subtotalBeforeContingency + contingencyAmount;

  const profitAmount = subtotalBeforeProfit * (input.profitPercent / 100);
  const suggestedTotal = subtotalBeforeProfit + profitAmount;

  const lowRange = suggestedTotal * 0.92;
  const highRange = suggestedTotal * 1.08;

  const profitMarginPercent =
    suggestedTotal > 0 ? (profitAmount / suggestedTotal) * 100 : 0;

  const effectiveHourlyToClient =
    laborHours > 0
      ? (suggestedTotal - input.materialsCost - input.subcontractorCost) /
        laborHours
      : 0;

  const lines: QuoteBreakdownLine[] = [
    {
      label: "Labor",
      amount: laborCost,
      detail: `${laborHours} crew-hrs × ${fmt(input.loadedLaborRate)}/hr loaded`,
    },
    {
      label: "Materials",
      amount: materialsWithMarkup,
      detail: `${fmt(input.materialsCost)} cost + ${input.materialsMarkupPercent}% markup`,
    },
  ];

  if (input.subcontractorCost > 0) {
    lines.push({
      label: "Subcontractors",
      amount: subsWithMarkup,
      detail: `${fmt(input.subcontractorCost)} + ${input.subcontractorMarkupPercent}% markup`,
    });
  }

  if (input.permitFees > 0) {
    lines.push({ label: "Permits & fees", amount: input.permitFees });
  }
  if (input.equipmentRental > 0) {
    lines.push({ label: "Equipment rental", amount: input.equipmentRental });
  }
  if (travelCost > 0) {
    lines.push({
      label: "Travel",
      amount: travelCost,
      detail: `${input.travelMiles} mi × ${fmt(input.travelRatePerMile)}/mi`,
    });
  }
  if (input.dumpsterDisposal > 0) {
    lines.push({ label: "Dumpster / disposal", amount: input.dumpsterDisposal });
  }

  lines.push(
    {
      label: "Overhead",
      amount: overheadAmount,
      detail: `${input.overheadPercent}% — office, insurance, vehicles, admin`,
    },
    {
      label: "Contingency",
      amount: contingencyAmount,
      detail: `${input.contingencyPercent}% — unknowns, change orders buffer`,
    },
    {
      label: "Profit",
      amount: profitAmount,
      detail: `${input.profitPercent}% target margin`,
    }
  );

  return {
    laborCost,
    laborHours,
    materialsWithMarkup,
    materialsMarkupAmount,
    subsWithMarkup,
    subsMarkupAmount,
    travelCost,
    directCosts,
    overheadAmount,
    subtotalBeforeContingency,
    contingencyAmount,
    subtotalBeforeProfit,
    profitAmount,
    suggestedTotal,
    lowRange,
    highRange,
    profitMarginPercent,
    effectiveHourlyToClient,
    lines,
  };
}

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function parseQuoteForm(form: Record<string, string>): QuoteEstimatorInput {
  const num = (key: string, fallback = 0) => {
    const v = Number(form[key]);
    return Number.isFinite(v) ? v : fallback;
  };
  const money = (key: string, fallback = 0) => {
    const v = parseMoneyInput(form[key] ?? "");
    return Number.isFinite(v) ? v : fallback;
  };

  return {
    customerName: form.customerName.trim(),
    projectName: form.projectName.trim(),
    projectType: (form.projectType as QuoteProjectType) || "Other",
    scopeNotes: form.scopeNotes.trim(),
    crewSize: Math.max(1, num("crewSize", 2)),
    daysOnSite: Math.max(0.5, num("daysOnSite", 5)),
    hoursPerDay: Math.max(1, Math.min(12, num("hoursPerDay", 8))),
    loadedLaborRate: Math.max(1, money("loadedLaborRate", 52)),
    materialsCost: Math.max(0, money("materialsCost", 0)),
    materialsMarkupPercent: Math.max(0, num("materialsMarkupPercent", 18)),
    subcontractorCost: Math.max(0, money("subcontractorCost", 0)),
    subcontractorMarkupPercent: Math.max(0, num("subcontractorMarkupPercent", 12)),
    permitFees: Math.max(0, money("permitFees", 0)),
    equipmentRental: Math.max(0, money("equipmentRental", 0)),
    travelMiles: Math.max(0, num("travelMiles", 0)),
    travelRatePerMile: Math.max(0, money("travelRatePerMile", 0.7)),
    dumpsterDisposal: Math.max(0, money("dumpsterDisposal", 0)),
    overheadPercent: Math.max(0, num("overheadPercent", 12)),
    contingencyPercent: Math.max(0, num("contingencyPercent", 10)),
    profitPercent: Math.max(0, num("profitPercent", 15)),
  };
}

export function emptyQuoteForm(): Record<string, string> {
  const d = DEFAULT_QUOTE_DEFAULTS;
  return {
    customerName: "",
    projectName: "",
    projectType: "Kitchen Remodel",
    scopeNotes: "",
    laborTier: d.laborTier,
    crewSize: String(d.crewSize),
    daysOnSite: String(d.daysOnSite),
    hoursPerDay: String(d.hoursPerDay),
    loadedLaborRate: moneyInputFromNumber(d.loadedLaborRate),
    materialsCost: moneyInputFromNumber(d.materialsCost),
    materialsMarkupPercent: String(d.materialsMarkupPercent),
    subcontractorCost: moneyInputFromNumber(d.subcontractorCost),
    subcontractorMarkupPercent: String(d.subcontractorMarkupPercent),
    permitFees: moneyInputFromNumber(d.permitFees),
    equipmentRental: moneyInputFromNumber(d.equipmentRental),
    travelMiles: String(d.travelMiles),
    travelRatePerMile: moneyInputFromNumber(d.travelRatePerMile),
    dumpsterDisposal: moneyInputFromNumber(d.dumpsterDisposal),
    overheadPercent: String(d.overheadPercent),
    contingencyPercent: String(d.contingencyPercent),
    profitPercent: String(d.profitPercent),
  };
}
