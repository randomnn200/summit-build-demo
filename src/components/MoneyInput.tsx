"use client";

import { formatMoneyInput } from "../lib/formatMoneyInput";

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onChange: (value: string) => void;
  /** Optional label rendered above the field */
  label?: string;
  /** Use when the field sits inside an existing `<label>` */
  hideLabel?: boolean;
};

export default function MoneyInput({
  value,
  onChange,
  label,
  hideLabel = false,
  className = "profile-input money-input",
  id,
  placeholder = "$0.00",
  ...props
}: MoneyInputProps) {
  const inputId =
    id ??
    (label && !hideLabel
      ? `money-${label.replace(/\s+/g, "-").toLowerCase()}`
      : undefined);

  const input = (
    <input
      {...props}
      id={inputId}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(formatMoneyInput(e.target.value))}
      placeholder={placeholder}
      className={className}
    />
  );

  if (label && !hideLabel) {
    return (
      <label htmlFor={inputId} className="block">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="mt-1">{input}</div>
      </label>
    );
  }

  return input;
}
