"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { PickerPopover } from "../picker/PickerPopover";
import type { ChangeOrder } from "../../lib/firebase/constructionOpsFirestore";
import type { Job } from "../../lib/firebase/firebaseUtils";
import {
  CHANGE_ORDER_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  changeOrderTotal,
} from "../../lib/constructionOps";

export const GREEN = "var(--brand-primary)";
export const RED = "var(--brand-accent)";

export function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function fmtDate(ts: { seconds: number } | null) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  searchText?: string;
  meta?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  required,
  placeholder = "— Select —",
  searchPlaceholder = "Search…",
  className = "",
  buttonClassName = "profile-input",
  compact = false,
  tone = "light",
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const hasEmptyOption = options.some((o) => o.value === "");

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const haystack = `${o.label} ${o.searchText ?? ""} ${o.value} ${o.meta ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, search]);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    } else {
      setSearch("");
    }
  }, [open]);

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

  const selectValue = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const triggerLabel = selected?.label ?? placeholder;
  const isDark = tone === "dark";
  const selectedTextClass = isDark ? "text-white" : "text-gray-900";
  const placeholderTextClass = isDark ? "text-slate-300" : "text-gray-400";
  const chevronClass = isDark ? "text-slate-300" : "text-gray-400";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 text-left transition-all duration-200 ${
          compact ? "rounded border px-1 py-0.5 text-[10px] font-semibold" : ""
        } ${open ? "ring-2 ring-[rgb(var(--brand-primary-rgb)/0.12)]" : ""} ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={`truncate ${selected ? selectedTextClass : placeholderTextClass} ${
            compact ? "capitalize" : ""
          }`}
        >
          {triggerLabel}
        </span>
        <ChevronDown
          className={`shrink-0 transition-transform duration-200 ${chevronClass} ${open ? "rotate-180" : ""} ${
            compact ? "h-3 w-3" : "h-4 w-4"
          }`}
        />
      </button>
      <PickerPopover open={open} className="w-full min-w-[12rem] p-0">
        <div className="picker-menu w-full">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-gray-200/80 py-2 pl-8 pr-2 text-sm outline-none transition-all duration-200 focus:border-[rgb(var(--brand-primary-rgb)/0.45)] focus:ring-2 focus:ring-[rgb(var(--brand-primary-rgb)/0.1)]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <ul
            className={`max-h-48 overflow-y-auto py-1 ${compact ? "text-xs" : "text-sm"}`}
            role="listbox"
          >
            {!required && !hasEmptyOption && (
              <li>
                <button
                  type="button"
                  onClick={() => selectValue("")}
                  className="picker-menu-item text-gray-400"
                >
                  {placeholder}
                </button>
              </li>
            )}
            {options.length === 0 ? (
              <li className="px-3 py-2 text-gray-400">No options available</li>
            ) : filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-gray-400">No matches found</li>
            ) : (
              filteredOptions.map((o) => (
                <li key={o.value || "__empty__"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === o.value}
                    onClick={() => selectValue(o.value)}
                    className={`picker-menu-item ${value === o.value ? "picker-menu-item-selected" : "text-gray-800"} ${compact ? "capitalize" : ""}`}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.meta && (
                      <span className="ml-auto shrink-0 truncate text-xs text-gray-400">
                        {o.meta}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </PickerPopover>
    </div>
  );
}

export type InlineSelectOption = {
  value: string;
  label: string;
  color?: string;
};

/** Compact dropdown for small fixed lists (status, invoice, etc.) — no search bar. */
export function InlineSelect({
  options,
  value,
  onChange,
  className = "",
}: {
  options: InlineSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-w-[9rem] items-center justify-between gap-2 rounded-xl border border-gray-200/70 bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md ${open ? "ring-2 ring-[rgb(var(--brand-primary-rgb)/0.12)]" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {selected?.color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
          )}
          <span className="truncate">{selected?.label ?? "Select"}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <PickerPopover open={open} align="end" className="min-w-full p-0">
        <ul className="picker-menu min-w-full py-1" role="listbox">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={value === o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`picker-menu-item text-xs ${value === o.value ? "picker-menu-item-selected" : "text-gray-800"}`}
              >
                {o.color && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: o.color }}
                  />
                )}
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      </PickerPopover>
    </div>
  );
}

export function JobSelect({
  jobs,
  value,
  onChange,
  required,
  placeholder = "— Select job —",
  className = "",
}: {
  jobs: Job[];
  value: string;
  onChange: (jobId: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const options = useMemo<SelectOption[]>(
    () =>
      jobs.map((j) => ({
        value: j.jobId,
        label: `#${j.jobId} · ${j.title}`,
        searchText: `${j.jobId} ${j.title} ${j.clientName}`,
        meta: j.clientName || undefined,
      })),
    [jobs]
  );

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      searchPlaceholder="Search by # or name…"
      className={className}
    />
  );
}

export function printChangeOrderPdf(co: ChangeOrder, companyName: string) {
  const total = changeOrderTotal(co);
  const html = `<!DOCTYPE html><html><head><title>Change Order ${co.id.slice(0, 8)}</title>
<style>body{font-family:system-ui,sans-serif;padding:40px;max-width:720px;margin:0 auto}
h1{font-size:22px}table{width:100%;border-collapse:collapse;margin:16px 0}
td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}
.total{font-size:18px;font-weight:bold}</style></head><body>
<h1>Change Order</h1>
<p><strong>${companyName}</strong></p>
<p>Job #${co.jobId} — ${co.jobTitle}</p>
<p><strong>${co.title}</strong></p>
<p>${co.description.replace(/\n/g, "<br>")}</p>
<table><tr><th>Item</th><th>Amount</th></tr>
<tr><td>Labor</td><td>${fmtMoney(co.laborCost)}</td></tr>
<tr><td>Materials</td><td>${fmtMoney(co.materialsCost)}</td></tr>
<tr><td>Other</td><td>${fmtMoney(co.otherCost)}</td></tr>
<tr><td><strong>Total</strong></td><td class="total">${fmtMoney(total)}</td></tr></table>
<p>Status: ${CHANGE_ORDER_STATUS_LABELS[co.status]}</p>
<p>Invoice: ${INVOICE_STATUS_LABELS[co.invoiceStatus]}</p>
${co.attachmentNotes ? `<p><strong>Attachments:</strong> ${co.attachmentNotes}</p>` : ""}
${co.externalLinks ? `<p><strong>Links:</strong> ${co.externalLinks}</p>` : ""}
<p style="color:#666;font-size:12px;margin-top:40px">Requested by ${co.requestedBy} · ${new Date().toLocaleDateString()}</p>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export function printPunchListPdf(
  items: {
    location: string;
    description: string;
    assignedSubName: string;
    dueDate: string;
    status: string;
  }[],
  jobTitle: string,
  jobId: string,
  companyName: string
) {
  const rows = items
    .map(
      (p) =>
        `<tr><td>${p.location}</td><td>${p.description}</td><td>${p.assignedSubName || "—"}</td><td>${p.dueDate || "—"}</td><td>${p.status}</td></tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><title>Punch List — Job ${jobId}</title>
<style>body{font-family:system-ui,sans-serif;padding:40px;max-width:900px;margin:0 auto}
h1{font-size:22px}table{width:100%;border-collapse:collapse;margin:16px 0}
td,th{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5}</style></head><body>
<h1>Punch List</h1>
<p><strong>${companyName}</strong></p>
<p>Job #${jobId} — ${jobTitle}</p>
<table><tr><th>Location</th><th>Item</th><th>Assigned</th><th>Due</th><th>Status</th></tr>${rows}</table>
<p style="color:#666;font-size:12px;margin-top:40px">Generated ${new Date().toLocaleDateString()}</p>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export function rfiNotificationEmail(rfi: {
  rfiNumber: string;
  subject: string;
  assignedTo: string;
  dueDate: string;
  jobId: string;
  jobTitle: string;
}) {
  const subject = encodeURIComponent(`RFI ${rfi.rfiNumber} — Response requested`);
  const body = encodeURIComponent(
    `Hi ${rfi.assignedTo},\n\nPlease respond to ${rfi.rfiNumber} for Job #${rfi.jobId} (${rfi.jobTitle}).\n\nSubject: ${rfi.subject}\nDue: ${rfi.dueDate || "ASAP"}\n\nThank you.`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}
