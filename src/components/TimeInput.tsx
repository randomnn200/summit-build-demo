"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  formatDisplayTime,
  formatEditTime,
  parseTypedTime,
} from "../lib/dates";
import {
  formatTimeInput,
  isCompleteTimeInput,
} from "../lib/formatTimeInput";
import { PickerPopover } from "./picker/PickerPopover";
import TimePickerPanel from "./picker/TimePickerPanel";

type TimeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hideLabel?: boolean;
  placeholder?: string;
};

export default function TimeInput({
  value,
  onChange,
  label,
  hideLabel = false,
  className = "",
  id,
  placeholder = "Select time",
  disabled,
  required,
  ...props
}: TimeInputProps) {
  const autoId = useId();
  const inputId = id ?? (label && !hideLabel ? `time-${autoId}` : undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const applyFormattedDraft = (raw: string) => {
    const formatted = formatTimeInput(raw);
    setDraft(formatted);
    if (isCompleteTimeInput(formatted)) {
      const parsed = parseTypedTime(formatted);
      if (parsed) onChange(parsed);
    }
  };

  const commitDraft = () => {
    const parsed = parseTypedTime(draft);
    if (parsed === null) {
      setDraft(value ? formatEditTime(value) : "");
    } else {
      onChange(parsed);
      setDraft(parsed ? formatEditTime(parsed) : "");
    }
    setFocused(false);
  };

  const displayValue = focused
    ? draft
    : value
      ? formatDisplayTime(value)
      : "";

  const field = (
    <div
      ref={containerRef}
      className={`date-field-wrap relative ${className}`.trim()}
    >
      {required && (
        <input
          tabIndex={-1}
          value={value}
          onChange={() => {}}
          required
          className="pointer-events-none absolute opacity-0"
          aria-hidden
        />
      )}
      <div
        className={`date-field time-field ${open ? "date-field-open" : ""} ${focused ? "date-field-focused" : ""} ${disabled ? "date-field-disabled" : ""}`.trim()}
      >
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            inputRef.current?.blur();
          }}
          className="date-field-trigger"
          aria-label="Open time picker"
          aria-expanded={open}
        >
          <Clock3 className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <input
          {...props}
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={displayValue}
          placeholder={focused ? "H:MM AM" : placeholder}
          onFocus={() => {
            setFocused(true);
            setDraft(value ? formatEditTime(value) : "");
          }}
          onChange={(e) => applyFormattedDraft(e.target.value)}
          onBlur={() => commitDraft()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
              inputRef.current?.blur();
            }
            if (e.key === "Escape") {
              setOpen(false);
              setDraft(value ? formatEditTime(value) : "");
              setFocused(false);
              inputRef.current?.blur();
            }
          }}
          className="date-field-text"
          aria-label={label ?? placeholder}
        />
      </div>

      <PickerPopover open={open && !disabled}>
        <TimePickerPanel
          value={value}
          onChange={(time) => {
            onChange(time);
            setDraft(time ? formatEditTime(time) : "");
          }}
          onClose={() => setOpen(false)}
        />
      </PickerPopover>
    </div>
  );

  if (label && !hideLabel) {
    return (
      <label htmlFor={inputId} className="date-field-label block">
        <span className="date-field-label-text">{label}</span>
        <div className="mt-1.5">{field}</div>
      </label>
    );
  }

  return field;
}
