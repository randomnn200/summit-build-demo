"use client";

import { useId, useMemo, useState } from "react";
import { LayoutDashboard, Printer } from "lucide-react";
import { EXPENSE_CATEGORIES } from "../lib/expenses";
import { JOB_STATUSES, JOB_STATUS_LABELS } from "../lib/jobs";
import { fmtAnalyticsMoney } from "../lib/analyticsMetrics";
import type { AnalyticsWeeklySnapshot } from "../lib/analyticsMetrics";
import {
  computeReportData,
  DEFAULT_REPORT_FILTERS,
  PBI_COLORS,
  reportPeriodLabel,
  type ReportFilters,
  type ReportPeriod,
  type ReportSlice,
  type ReportTrendPoint,
} from "../lib/analyticsReport";
import type {
  Expense,
  Job,
  QuoteRequest,
  Ticket,
} from "../lib/firebase/firebaseUtils";
import type { ChangeOrder } from "../lib/firebase/constructionOpsFirestore";
import type { CrmLead } from "../lib/firebase/crmFirestore";
import { SearchableSelect } from "./ops/opsShared";

function DonutChart({
  slices,
  total,
  size = 160,
}: {
  slices: ReportSlice[];
  total: number;
  size?: number;
}) {
  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400"
        style={{ width: size, height: size }}
      >
        No data
      </div>
    );
  }
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -90;
  const paths = slices.map((slice) => {
    const pct = slice.value / total;
    const sweep = pct * 360;
    const start = angle;
    angle += sweep;
    const end = angle;
    const large = sweep > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos((Math.PI * start) / 180);
    const y1 = cy + r * Math.sin((Math.PI * start) / 180);
    const x2 = cx + r * Math.cos((Math.PI * end) / 180);
    const y2 = cy + r * Math.sin((Math.PI * end) / 180);
    if (pct >= 0.999) {
      return (
        <circle key={slice.label} cx={cx} cy={cy} r={r} fill={slice.color} />
      );
    }
    return (
      <path
        key={slice.label}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={slice.color}
      />
    );
  });
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="drop-shadow-sm">
        {paths}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#1e293b" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-2xl font-black">{total}</span>
        <span className="text-[10px] uppercase tracking-wide text-gray-400">
          Total
        </span>
      </div>
    </div>
  );
}

function ColumnChart({
  points,
  max,
  height = 140,
}: {
  points: ReportSlice[];
  max: number;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <p className="flex h-[140px] items-center justify-center text-xs text-gray-400">
        No data for selected filters
      </p>
    );
  }
  return (
    <div className="flex items-end justify-around gap-2" style={{ height }}>
      {points.map((p) => {
        const pct = max > 0 ? (p.value / max) * 100 : 0;
        return (
          <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-gray-600">{p.value}</span>
            <div
              className="w-full max-w-[2.5rem] rounded-t-sm transition-all duration-500"
              style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: p.color }}
            />
            <span className="max-w-full truncate text-center text-[9px] text-gray-500">
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AreaLineChart({
  points,
  max,
  color = PBI_COLORS[0],
  height = 120,
}: {
  points: ReportTrendPoint[];
  max: number;
  color?: string;
  height?: number;
}) {
  const gradId = useId();
  if (points.length === 0) {
    return (
      <p className="flex items-center justify-center text-xs text-gray-400" style={{ height }}>
        No trend data yet
      </p>
    );
  }
  const w = 100;
  const h = 100;
  const pad = 4;
  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (p.value / max) * (h - pad * 2);
    return { x, y, ...p };
  });
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${coords.map((c) => `${c.x},${c.y}`).join(" ")} ${coords[coords.length - 1]?.x ?? 0},${h} ${coords[0]?.x ?? 0},${h}`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradId})`} />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((c) => (
          <circle key={c.label} cx={c.x} cy={c.y} r="2.5" fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-gray-400">
        {points.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/80 p-4 shadow-lg backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className="mt-1 truncate text-2xl font-black text-white"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

function VisualCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 px-4 py-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SlicerGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function AnalyticsReport({
  expenses,
  jobs,
  crmLeads,
  changeOrders,
  homepageLeads,
  tickets,
  snapshots,
}: {
  expenses: Expense[];
  jobs: Job[];
  crmLeads: CrmLead[];
  changeOrders: ChangeOrder[];
  homepageLeads: QuoteRequest[];
  tickets: Ticket[];
  snapshots: AnalyticsWeeklySnapshot[];
}) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);

  const report = useMemo(
    () =>
      computeReportData(
        {
          expenses,
          jobs,
          crmLeads,
          changeOrders,
          homepageLeads,
          tickets,
          snapshots,
        },
        filters
      ),
    [expenses, jobs, crmLeads, changeOrders, homepageLeads, tickets, snapshots, filters]
  );

  const setPeriod = (period: ReportPeriod) =>
    setFilters((f) => ({ ...f, period }));

  return (
    <div className="analytics-report w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 shadow-xl print:border-0 print:shadow-none">
      <div className="bg-[#1b1b1b] px-5 py-4 print:bg-white print:text-black lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#f2c811] print:bg-gray-200">
              <LayoutDashboard className="h-5 w-5 text-[#1b1b1b]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white print:text-gray-900">
                Executive Report
              </h2>
              <p className="text-xs text-slate-400 print:text-gray-500">
                Summit Build Co. · {reportPeriodLabel(filters.period)} · Updated live
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 print:hidden"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-14rem)] w-full flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-200 bg-[#252423] p-4 lg:w-64 xl:w-72 lg:border-b-0 lg:border-r print:hidden">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#f2c811]">
            Slicers
          </p>
          <div className="space-y-5">
            <SlicerGroup label="Time period">
              <div className="flex flex-wrap gap-1 lg:flex-col">
                {(
                  [
                    ["7d", "7 days"],
                    ["30d", "30 days"],
                    ["90d", "90 days"],
                    ["ytd", "YTD"],
                    ["all", "All time"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPeriod(id)}
                    className={`rounded px-3 py-1.5 text-left text-xs font-semibold transition ${
                      filters.period === id
                        ? "bg-[#f2c811] text-[#1b1b1b]"
                        : "text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </SlicerGroup>
            <SlicerGroup label="Expense category">
              <SearchableSelect
                tone="dark"
                options={[
                  { value: "all", label: "All categories" },
                  ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
                ]}
                value={filters.expenseCategory}
                onChange={(v) => setFilters((f) => ({ ...f, expenseCategory: v }))}
                placeholder="All categories"
                searchPlaceholder="Search…"
                buttonClassName="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs font-semibold text-white"
              />
            </SlicerGroup>
            <SlicerGroup label="Job status">
              <SearchableSelect
                tone="dark"
                options={[
                  { value: "all", label: "All statuses" },
                  ...JOB_STATUSES.map((s) => ({
                    value: s,
                    label: JOB_STATUS_LABELS[s],
                  })),
                ]}
                value={filters.jobStatus}
                onChange={(v) => setFilters((f) => ({ ...f, jobStatus: v }))}
                placeholder="All statuses"
                searchPlaceholder="Search…"
                buttonClassName="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs font-semibold text-white"
              />
            </SlicerGroup>
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-[#f3f2f1] p-4 lg:p-6 xl:p-8">
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 2xl:gap-4">
            <KpiTile
              label="Expenses"
              value={fmtAnalyticsMoney(report.kpis.totalExpenses)}
              sub={`${report.kpis.expenseCount} entries`}
              accent="#118DFF"
            />
            <KpiTile
              label="Pipeline value"
              value={fmtAnalyticsMoney(report.kpis.pipelineValue)}
              accent="#E66C37"
            />
            <KpiTile
              label="Approved COs"
              value={fmtAnalyticsMoney(report.kpis.approvedCoValue)}
              accent="#744EC2"
            />
            <KpiTile
              label="Active jobs"
              value={String(report.kpis.activeJobs)}
              accent="#059669"
            />
            <KpiTile
              label="CRM win rate"
              value={`${report.kpis.crmWinRate}%`}
              accent="#D9B300"
            />
            <KpiTile
              label="New leads"
              value={String(report.kpis.newLeads)}
              sub={`${report.kpis.openTickets} open tickets`}
              accent="#E044A7"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12 xl:gap-5">
            <VisualCard title="Expense trend by week" className="md:col-span-2 xl:col-span-7">
              <AreaLineChart
                points={report.expenseTrend}
                max={report.expenseTrendMax}
                color={PBI_COLORS[0]}
                height={140}
              />
            </VisualCard>

            <VisualCard title="CRM pipeline" className="md:col-span-2 xl:col-span-5">
              <div className="flex flex-col items-center gap-6 xl:flex-row xl:justify-around">
                <DonutChart slices={report.crmDonut} total={report.crmDonutTotal} size={180} />
                <ul className="space-y-1.5 text-xs">
                  {report.crmDonut.map((s) => (
                    <li key={s.label} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-gray-600">{s.label}</span>
                      <span className="font-bold text-gray-900">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </VisualCard>

            <VisualCard title="Jobs by status" className="xl:col-span-4">
              <ColumnChart
                points={report.jobsByStatus}
                max={Math.max(1, ...report.jobsByStatus.map((j) => j.value))}
                height={160}
              />
            </VisualCard>

            <VisualCard title="Lead sources" className="xl:col-span-4">
              <ColumnChart
                points={report.leadSources}
                max={report.leadSourcesMax}
                height={160}
              />
            </VisualCard>

            <VisualCard title="Operations volume" className="xl:col-span-4">
              <ColumnChart
                points={report.opsComparison.map((o) => ({
                  label: o.label,
                  value: o.value,
                  color: o.color,
                }))}
                max={report.opsMax}
                height={160}
              />
            </VisualCard>

            <VisualCard title="Weekly snapshot history" className="md:col-span-2 xl:col-span-12">
              <AreaLineChart
                points={report.historyTrend}
                max={report.historyTrendMax}
                color={PBI_COLORS[5]}
                height={120}
              />
              <p className="mt-2 text-[10px] text-gray-400">
                Expense totals from saved weekly analytics snapshots
              </p>
            </VisualCard>

            <VisualCard title="Detail matrix" className="md:col-span-2 xl:col-span-12">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pr-4 font-bold">Section</th>
                      <th className="pb-2 pr-4 font-bold">Metric</th>
                      <th className="pb-2 pr-4 font-bold">Value</th>
                      <th className="pb-2 font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.detailRows.map((row, i) => (
                      <tr
                        key={`${row.section}-${row.metric}`}
                        className={i % 2 === 0 ? "bg-slate-50/80" : ""}
                      >
                        <td className="py-2 pr-4 font-semibold text-slate-600">
                          {row.section}
                        </td>
                        <td className="py-2 pr-4 text-slate-800">{row.metric}</td>
                        <td className="py-2 pr-4 font-black text-slate-900">
                          {row.value}
                        </td>
                        <td className="py-2 text-xs text-slate-500">{row.sub ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </VisualCard>
          </div>
        </div>
      </div>
    </div>
  );
}
