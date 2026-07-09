"use client";

import { useState } from "react";
import {
  Bell,
  FileCheck,
  FileText,
  Kanban,
  Mail,
} from "lucide-react";
import PipelinePanel from "./crm/PipelinePanel";
import EstimatesPanel from "./crm/EstimatesPanel";
import RemindersPanel from "./crm/RemindersPanel";
import TemplatesPanel from "./crm/TemplatesPanel";
import ProposalsPanel from "./crm/ProposalsPanel";

type CrmSection =
  | "pipeline"
  | "estimates"
  | "reminders"
  | "templates"
  | "proposals";

const SECTIONS: {
  id: CrmSection;
  label: string;
  icon: React.ReactNode;
  blurb: string;
}[] = [
  {
    id: "pipeline",
    label: "Lead pipeline",
    icon: <Kanban className="h-4 w-4" />,
    blurb: "Track every lead from first contact to won or lost — never drop follow-up.",
  },
  {
    id: "estimates",
    label: "Estimates",
    icon: <FileText className="h-4 w-4" />,
    blurb: "Ballpark ranges, sent dates, and status per lead.",
  },
  {
    id: "reminders",
    label: "Reminders",
    icon: <Bell className="h-4 w-4" />,
    blurb: "Due today, overdue, and auto-suggested follow-ups.",
  },
  {
    id: "templates",
    label: "Email templates",
    icon: <Mail className="h-4 w-4" />,
    blurb: "Reusable emails with merge fields — copy or open in your mail app.",
  },
  {
    id: "proposals",
    label: "Proposals",
    icon: <FileCheck className="h-4 w-4" />,
    blurb: "Formal proposals linked to estimates, with print/PDF export.",
  },
];

export default function CrmTab({
  userName,
  userEmail,
  companyName,
}: {
  userName: string | null;
  userEmail: string | null;
  companyName: string;
}) {
  const [section, setSection] = useState<CrmSection>("pipeline");
  const [selectedLeadId, setSelectedLeadId] = useState("");

  const meta = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-gray-900">Contractor CRM</h2>
        <p className="mt-1 text-sm text-gray-500">
          Lead pipeline, estimate tracking, automated reminders, email templates,
          and proposal management — so nothing falls through the cracks.
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

      {section === "pipeline" && (
        <PipelinePanel
          userName={userName}
          userEmail={userEmail}
          onSelectLead={(id) => {
            setSelectedLeadId(id);
            setSection("estimates");
          }}
        />
      )}
      {section === "estimates" && (
        <EstimatesPanel userName={userName} preselectedLeadId={selectedLeadId} />
      )}
      {section === "reminders" && (
        <RemindersPanel userName={userName} userEmail={userEmail} />
      )}
      {section === "templates" && (
        <TemplatesPanel userName={userName} companyName={companyName} />
      )}
      {section === "proposals" && (
        <ProposalsPanel
          userName={userName}
          companyName={companyName}
          preselectedLeadId={selectedLeadId}
        />
      )}
    </div>
  );
}
