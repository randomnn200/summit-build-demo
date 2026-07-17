"use client";

import { useMemo } from "react";
import {
  formatDisplayTime,
  parseTimeValue,
  toTimeValue,
} from "../../lib/dates";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export default function TimePickerPanel({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (time: string) => void;
  onClose?: () => void;
}) {
  const parsed = parseTimeValue(value) ?? {
    hour12: 9,
    minute: 0,
    period: "AM" as const,
  };

  const setParts = (hour12: number, minute: number, period: "AM" | "PM") => {
    onChange(toTimeValue(hour12, minute, period));
  };

  const preview = useMemo(
    () => formatDisplayTime(toTimeValue(parsed.hour12, parsed.minute, parsed.period)),
    [parsed.hour12, parsed.minute, parsed.period]
  );

  return (
    <div className="picker-time">
      <p className="picker-time-preview">{preview || "Select time"}</p>

      <div className="picker-time-section">
        <p className="picker-time-label">Hour</p>
        <div className="picker-time-grid picker-time-grid-hours">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setParts(h, parsed.minute, parsed.period)}
              className={`picker-chip ${parsed.hour12 === h ? "picker-chip-selected" : ""}`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="picker-time-section">
        <p className="picker-time-label">Minute</p>
        <div className="picker-time-grid">
          {MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setParts(parsed.hour12, m, parsed.period);
                onClose?.();
              }}
              className={`picker-chip ${parsed.minute === m ? "picker-chip-selected" : ""}`}
            >
              {String(m).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>

      <div className="picker-time-ampm">
        {(["AM", "PM"] as const).map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => setParts(parsed.hour12, parsed.minute, period)}
            className={`picker-ampm-btn ${parsed.period === period ? "picker-ampm-btn-selected" : ""}`}
          >
            {period}
          </button>
        ))}
      </div>

      {value && (
        <button
          type="button"
          className="picker-footer-btn picker-footer-btn-muted mt-2 w-full"
          onClick={() => {
            onChange("");
            onClose?.();
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
