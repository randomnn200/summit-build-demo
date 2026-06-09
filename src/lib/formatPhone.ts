/**
 * Formats a string into a US-style phone number as the user types:
 * "5555555555" -> "(555) 555-5555". Non-digits are ignored and a leading
 * country-code "1" is dropped.
 */
export function formatPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  if (digits.length > 6) return `(${area}) ${prefix}-${line}`;
  if (digits.length > 3) return `(${area}) ${prefix}`;
  if (digits.length > 0) return `(${area}`;
  return "";
}
