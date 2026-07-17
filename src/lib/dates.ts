import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/** Local calendar date as YYYY-MM-DD (for storage). */
export function todayIso() {
  return isoFromDate(new Date());
}

export function isoFromDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function parseIsoDate(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : null;
}

/** Add days to a YYYY-MM-DD string; returns YYYY-MM-DD. */
export function addDaysIso(dateStr: string, days: number) {
  const d = parseIsoDate(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

/** Display when the field is closed — e.g. Jul 17, 2026 */
export function formatDisplayDate(iso: string) {
  const d = parseIsoDate(iso);
  if (!d) return "";
  return format(d, "MMM d, yyyy");
}

/** Display while typing — MM/DD/YYYY */
export function formatEditDate(iso: string) {
  const d = parseIsoDate(iso);
  if (!d) return "";
  return format(d, "MM/dd/yyyy");
}

const TYPED_DATE_FORMATS = [
  "MM/dd/yyyy",
  "M/d/yyyy",
  "MM-dd-yyyy",
  "M-d-yyyy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "yyyy-MM-dd",
];

/** Parse free-typed date text into YYYY-MM-DD. Empty string clears. */
export function parseTypedDate(text: string): string | null | "" {
  const t = text.trim();
  if (!t) return "";

  const digits = t.replace(/\D/g, "");
  if (digits.length === 8) {
    const mm = digits.slice(0, 2);
    const dd = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    const d = parse(`${mm}/${dd}/${yyyy}`, "MM/dd/yyyy", new Date());
    if (isValid(d)) return isoFromDate(d);
  }

  for (const pattern of TYPED_DATE_FORMATS) {
    const d = parse(t, pattern, new Date());
    if (isValid(d)) return isoFromDate(d);
  }
  return null;
}

export function calendarDays(viewMonth: Date) {
  const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function isDateInRange(iso: string, min?: string, max?: string) {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

export function monthLabel(d: Date) {
  return format(d, "MMMM yyyy");
}

export function isTodayDate(d: Date) {
  return isSameDay(d, new Date());
}

export function isSameMonthDate(a: Date, b: Date) {
  return isSameMonth(a, b);
}

/** HH:mm (24h) → 2:30 PM */
export function formatDisplayTime(value: string) {
  const parsed = parseTimeValue(value);
  if (!parsed) return "";
  const { hour12, minute, period } = parsed;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/** HH:mm for editing */
export function formatEditTime(value: string) {
  return formatDisplayTime(value);
}

export function parseTimeValue(value: string): {
  hour24: number;
  hour12: number;
  minute: number;
  period: "AM" | "PM";
} | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour24 = Number(m[1]);
  const minute = Number(m[2]);
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return null;
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { hour24, hour12, minute, period };
}

export function toTimeValue(hour12: number, minute: number, period: "AM" | "PM") {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const TYPED_TIME_FORMATS = ["h:mm a", "h:mma", "HH:mm", "H:mm"];

export function parseTypedTime(text: string): string | null | "" {
  const t = text.trim();
  if (!t) return "";

  for (const pattern of TYPED_TIME_FORMATS) {
    const d = parse(t, pattern, new Date());
    if (isValid(d)) {
      return format(d, "HH:mm");
    }
  }

  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(t);
  if (match) {
    const h = Number(match[1]);
    const min = match[2] ? Number(match[2]) : 0;
    const ap = match[3]?.toUpperCase() as "AM" | "PM" | undefined;
    if (min < 0 || min > 59) return null;
    if (ap) {
      if (h < 1 || h > 12) return null;
      return toTimeValue(h, min, ap === "PM" ? "PM" : "AM");
    }
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    }
  }

  return null;
}

export { addMonths };
