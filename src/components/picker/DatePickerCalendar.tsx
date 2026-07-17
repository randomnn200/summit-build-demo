"use client";

import { useState } from "react";
import { isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  calendarDays,
  formatDisplayDate,
  isDateInRange,
  isSameMonthDate,
  isTodayDate,
  isoFromDate,
  monthLabel,
  parseIsoDate,
} from "../../lib/dates";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePickerCalendar({
  value,
  onChange,
  min,
  max,
  onClose,
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  onClose?: () => void;
}) {
  const selected = parseIsoDate(value);
  const [viewMonth, setViewMonth] = useState(
    () => selected ?? parseIsoDate(min ?? "") ?? new Date()
  );

  const days = calendarDays(viewMonth);

  const pick = (d: Date) => {
    const iso = isoFromDate(d);
    if (!isDateInRange(iso, min, max)) return;
    onChange(iso);
    onClose?.();
  };

  return (
    <div className="picker-calendar">
      <div className="picker-calendar-header">
        <button
          type="button"
          className="picker-icon-btn"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="picker-calendar-title">{monthLabel(viewMonth)}</p>
        <button
          type="button"
          className="picker-icon-btn"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="picker-calendar-weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d} className="picker-calendar-weekday">
            {d}
          </span>
        ))}
      </div>

      <div className="picker-calendar-grid">
        {days.map((day) => {
          const iso = isoFromDate(day);
          const inMonth = isSameMonthDate(day, viewMonth);
          const selectedDay = selected ? isSameDay(day, selected) : false;
          const today = isTodayDate(day);
          const disabled = !isDateInRange(iso, min, max);

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => pick(day)}
              className={`picker-day ${selectedDay ? "picker-day-selected" : ""} ${today ? "picker-day-today" : ""} ${!inMonth ? "picker-day-outside" : ""} ${disabled ? "picker-day-disabled" : ""}`}
              aria-label={formatDisplayDate(iso)}
              aria-pressed={selectedDay}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="picker-calendar-footer">
        <button
          type="button"
          className="picker-footer-btn"
          onClick={() => {
            const today = isoFromDate(new Date());
            if (isDateInRange(today, min, max)) {
              onChange(today);
              onClose?.();
            }
          }}
        >
          Today
        </button>
        {value && (
          <button
            type="button"
            className="picker-footer-btn picker-footer-btn-muted"
            onClick={() => {
              onChange("");
              onClose?.();
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
