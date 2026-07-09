"use client";

import { formatPhone } from "../lib/formatPhone";

type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

export default function PhoneInput({
  value,
  onChange,
  className = "profile-input",
  placeholder = "(555) 555-5555",
  ...props
}: PhoneInputProps) {
  return (
    <input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      placeholder={placeholder}
      className={className}
    />
  );
}
