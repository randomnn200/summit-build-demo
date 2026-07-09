export const CRM_PIPELINE_STAGES = [
  "new",
  "contacted",
  "estimate_sent",
  "proposal_sent",
  "follow_up",
  "won",
  "lost",
] as const;
export type CrmPipelineStage = (typeof CRM_PIPELINE_STAGES)[number];

export const CRM_STAGE_LABELS: Record<CrmPipelineStage, string> = {
  new: "New lead",
  contacted: "Contacted",
  estimate_sent: "Estimate sent",
  proposal_sent: "Proposal sent",
  follow_up: "Follow-up",
  won: "Won",
  lost: "Lost",
};

export const CRM_STAGE_COLORS: Record<CrmPipelineStage, string> = {
  new: "#2563eb",
  contacted: "#6366f1",
  estimate_sent: "#8b5cf6",
  proposal_sent: "#a855f7",
  follow_up: "#f59e0b",
  won: "#059669",
  lost: "#64748b",
};

export const CRM_LEAD_SOURCES = [
  "Homepage",
  "Referral",
  "Phone call",
  "Walk-in",
  "Repeat client",
  "Other",
] as const;
export type CrmLeadSource = (typeof CRM_LEAD_SOURCES)[number];

export const ESTIMATE_STATUSES = ["draft", "sent", "accepted", "declined"] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

export const PROPOSAL_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    name: "First follow-up",
    subject: "Following up on your project — {{company}}",
    body: `Hi {{name}},

Thanks for reaching out to {{company}}. I wanted to follow up on your inquiry and see if you had any questions about next steps.

We're happy to schedule a walkthrough at your convenience.

Best,
{{sender}}`,
  },
  {
    name: "Estimate ready",
    subject: "Your estimate from {{company}}",
    body: `Hi {{name}},

Your estimate for {{project}} is ready. The ballpark range is {{amount}}.

Let me know if you'd like to review the details or adjust the scope.

Thanks,
{{sender}}`,
  },
  {
    name: "Proposal sent",
    subject: "Proposal for {{project}} — {{company}}",
    body: `Hi {{name}},

Please find our proposal for {{project}} attached/summary below. Total: {{amount}}.

This proposal is valid until {{valid_until}}. Reply to this email or call us to move forward.

{{sender}}`,
  },
] as const;

export function fillCrmTemplate(
  text: string,
  vars: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export function isReminderDue(dueDate: string, completed: boolean) {
  if (completed || !dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate <= today;
}

export function isReminderOverdue(dueDate: string, completed: boolean) {
  if (completed || !dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

export function daysInStage(sinceMs: number | null | undefined) {
  if (!sinceMs) return 0;
  return Math.floor((Date.now() - sinceMs) / 86400000);
}
