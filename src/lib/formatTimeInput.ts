/** Auto-format digits into H:MM AM/PM as the user types. */
export function formatTimeInput(value: string): string {
  const periodMatch = value.trim().match(/(am|pm|a|p)\.?m?\.?\s*$/i);
  let period = "";
  if (periodMatch) {
    const token = periodMatch[1].toLowerCase();
    period = token.startsWith("p") ? "PM" : "AM";
  }

  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (!digits && !period) return "";

  let clock = "";
  if (digits.length <= 2) {
    clock = digits;
  } else if (digits.length === 3) {
    clock = `${digits.slice(0, 1)}:${digits.slice(1)}`;
  } else {
    clock = `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  if (period) return clock ? `${clock} ${period}` : period;
  return clock;
}

/** True when input looks like a complete time. */
export function isCompleteTimeInput(formatted: string) {
  const t = formatted.trim();
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(t)) return true;
  return /^\d{2}:\d{2}$/.test(t);
}
