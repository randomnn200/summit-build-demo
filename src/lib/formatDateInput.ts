/** Auto-format digits into MM/DD/YYYY as the user types. */
export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);

  if (digits.length > 4) return `${mm}/${dd}/${yyyy}`;
  if (digits.length > 2) return `${mm}/${dd}`;
  if (digits.length > 0) return mm;
  return "";
}

/** True when the formatted string is a complete MM/DD/YYYY value. */
export function isCompleteDateInput(formatted: string) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(formatted);
}
