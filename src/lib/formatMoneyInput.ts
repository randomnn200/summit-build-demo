/**
 * Formats a string into USD currency as the user types:
 * "123456" -> "$123,456", "1234.5" -> "$1,234.5".
 */
export function formatMoneyInput(value: string): string {
  let cleaned = value.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot >= 0) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "");
  }

  const hasDot = firstDot >= 0;
  const [rawInt = "", rawDec = ""] = hasDot ? cleaned.split(".") : [cleaned, ""];
  const decPart = rawDec.slice(0, 2);

  if (!rawInt && !decPart && !hasDot) return "";

  const intForFormat = rawInt || (hasDot ? "0" : "");
  if (!intForFormat && !hasDot) return "";

  const formattedInt =
    intForFormat
      .replace(/^0+(?=\d)/, "")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",") ||
    (intForFormat === "0" || hasDot ? "0" : "");

  if (!formattedInt && !hasDot) return "";

  if (hasDot) return `$${formattedInt || "0"}.${decPart}`;
  return `$${formattedInt}`;
}

/** Parse a formatted or plain money string to a number. */
export function parseMoneyInput(value: string): number {
  const n = parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Format a numeric amount for use in a money input's value. */
export function moneyInputFromNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  const str =
    n % 1 === 0
      ? String(Math.round(n))
      : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return formatMoneyInput(str);
}

export const MONEY_FORM_KEYS = [
  "loadedLaborRate",
  "materialsCost",
  "subcontractorCost",
  "permitFees",
  "equipmentRental",
  "travelRatePerMile",
  "dumpsterDisposal",
] as const;

export function normalizeMoneyFormFields(
  form: Record<string, string>
): Record<string, string> {
  const out = { ...form };
  for (const key of MONEY_FORM_KEYS) {
    if (out[key]) {
      out[key] = moneyInputFromNumber(parseMoneyInput(out[key]));
    }
  }
  return out;
}
