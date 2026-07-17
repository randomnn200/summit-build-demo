"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  ClipboardCheck,
  DollarSign,
  FileStack,
  FileText,
  HardHat,
  HelpCircle,
  Package,
  Sun,
  Wrench,
} from "lucide-react";
import { subscribeToJobs, type Job } from "../lib/firebase/firebaseUtils";
import ChangeOrdersPanel from "./ops/ChangeOrdersPanel";
import ProjectDocumentsPanel from "./ops/ProjectDocumentsPanel";
import JobCostsPanel from "./ops/JobCostsPanel";
import SubcontractorsPanel from "./ops/SubcontractorsPanel";
import ToolCheckoutPanel from "./ops/ToolCheckoutPanel";
import RfiPanel from "./ops/RfiPanel";
import DailyReportsPanel from "./ops/DailyReportsPanel";
import PunchListPanel from "./ops/PunchListPanel";
import PermitsInspectionsPanel from "./ops/PermitsInspectionsPanel";
import ProjectPurchaseOrdersPanel from "./ops/ProjectPurchaseOrdersPanel";

type OpsSection =
  | "change_orders"
  | "documents"
  | "job_costs"
  | "subcontractors"
  | "tool_checkout"
  | "rfis"
  | "daily_reports"
  | "punch_list"
  | "permits_inspections"
  | "purchase_orders";

const SECTIONS: {
  id: OpsSection;
  label: string;
  icon: React.ReactNode;
  blurb: string;
}[] = [
  {
    id: "change_orders",
    label: "Change orders",
    icon: <FileText className="h-4 w-4" />,
    blurb: "Document extra work, track approval, invoice status, and PDFs.",
  },
  {
    id: "rfis",
    label: "RFIs",
    icon: <HelpCircle className="h-4 w-4" />,
    blurb: "Auto-numbered RFIs, assignees, due dates, drawing links, and history.",
  },
  {
    id: "daily_reports",
    label: "Daily reports",
    icon: <Sun className="h-4 w-4" />,
    blurb: "Superintendent field reports — weather, crew, work, delays, safety.",
  },
  {
    id: "punch_list",
    label: "Punch list",
    icon: <ClipboardCheck className="h-4 w-4" />,
    blurb: "Near-completion items, sub assignments, photos, PDF export.",
  },
  {
    id: "permits_inspections",
    label: "Permits & inspections",
    icon: <ClipboardList className="h-4 w-4" />,
    blurb: "Permit numbers, expiration reminders, inspection pass/fail tracking.",
  },
  {
    id: "purchase_orders",
    label: "Material POs",
    icon: <Package className="h-4 w-4" />,
    blurb: "Supplier directory, approval workflow, delivery & quantity tracking.",
  },
  {
    id: "documents",
    label: "Documents",
    icon: <FileStack className="h-4 w-4" />,
    blurb: "Drawings, permits, contracts — one place per job.",
  },
  {
    id: "job_costs",
    label: "Job costs",
    icon: <DollarSign className="h-4 w-4" />,
    blurb: "Budget vs. actual, profit, and project health.",
  },
  {
    id: "subcontractors",
    label: "Subcontractors",
    icon: <HardHat className="h-4 w-4" />,
    blurb: "Insurance, licenses, assignments, and compliance reminders.",
  },
  {
    id: "tool_checkout",
    label: "Tool checkout",
    icon: <Wrench className="h-4 w-4" />,
    blurb: "Who has what tool, due dates, returns, and maintenance.",
  },
];

export default function ProjectOpsTab({
  userName,
  userEmail,
  companyName,
}: {
  userName: string | null;
  userEmail: string | null;
  companyName: string;
}) {
  const [section, setSection] = useState<OpsSection>("change_orders");
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => subscribeToJobs(setJobs), []);

  const meta = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-gray-900">Project operations</h2>
        <p className="mt-1 text-sm text-gray-500">
          RFIs, daily reports, punch lists, permits, material POs, change orders,
          documents, job costing, subs, and tool accountability.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition"
            style={
              section === s.id
                ? { backgroundColor: "var(--brand-primary)", color: "white" }
                : { backgroundColor: "white", color: "#374151" }
            }
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">{meta.blurb}</p>

      {section === "change_orders" && (
        <ChangeOrdersPanel
          jobs={jobs}
          userName={userName}
          userEmail={userEmail}
          companyName={companyName}
        />
      )}
      {section === "rfis" && (
        <RfiPanel jobs={jobs} userName={userName} />
      )}
      {section === "daily_reports" && (
        <DailyReportsPanel
          jobs={jobs}
          userName={userName}
          userEmail={userEmail}
        />
      )}
      {section === "punch_list" && (
        <PunchListPanel
          jobs={jobs}
          userName={userName}
          companyName={companyName}
        />
      )}
      {section === "permits_inspections" && (
        <PermitsInspectionsPanel jobs={jobs} userName={userName} />
      )}
      {section === "purchase_orders" && (
        <ProjectPurchaseOrdersPanel
          jobs={jobs}
          userName={userName}
          userEmail={userEmail}
        />
      )}
      {section === "documents" && (
        <ProjectDocumentsPanel jobs={jobs} userName={userName} />
      )}
      {section === "job_costs" && (
        <JobCostsPanel
          jobs={jobs}
          userName={userName}
          userEmail={userEmail}
        />
      )}
      {section === "subcontractors" && (
        <SubcontractorsPanel jobs={jobs} userName={userName} />
      )}
      {section === "tool_checkout" && (
        <ToolCheckoutPanel
          jobs={jobs}
          userName={userName}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
