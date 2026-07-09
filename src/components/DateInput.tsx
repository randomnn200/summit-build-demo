"use client";

type DateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
  /** Optional label rendered above the field */
  label?: string;
  /** Use when the field sits inside an existing `<label>` */
  hideLabel?: boolean;
};

export default function DateInput({
  value,
  onChange,
  label,
  hideLabel = false,
  className = "profile-input date-input",
  id,
  ...props
}: DateInputProps) {
  const inputId =
    id ??
    (label && !hideLabel
      ? `date-${label.replace(/\s+/g, "-").toLowerCase()}`
      : undefined);

  const input = (
    <input
      {...props}
      id={inputId}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
