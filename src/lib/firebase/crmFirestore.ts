import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  CrmLeadSource,
  CrmPipelineStage,
  EstimateStatus,
  ProposalStatus,
} from "../crm";

function omitUndefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

const sortByCreatedDesc = <T extends { createdAt: { seconds: number } | null }>(
  items: T[]
) => items.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

// —— CRM Leads (pipeline) ——
export interface CrmLeadInput {
  name: string;
  phone: string;
  email: string;
  source: CrmLeadSource;
  stage: CrmPipelineStage;
  projectType: string;
  estimatedValue: number;
  notes: string;
  quoteRequestId: string | null;
  nextFollowUp: string;
  assignedTo: string;
  assignedEmail: string | null;
  createdBy: string;
}

export interface CrmLead extends CrmLeadInput {
  id: string;
  stageChangedAt: number;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToCrmLeads = (onChange: (leads: CrmLead[]) => void) =>
  onSnapshot(collection(db, "crmLeads"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CrmLead, "id">) }))
      )
    );
  });

export const addCrmLead = (data: CrmLeadInput) =>
  addDoc(
    collection(db, "crmLeads"),
    omitUndefined({
      ...data,
      quoteRequestId: data.quoteRequestId ?? null,
      assignedEmail: data.assignedEmail ?? null,
      stageChangedAt: Date.now(),
      createdAt: serverTimestamp(),
    })
  );

export const updateCrmLead = (id: string, data: Partial<CrmLeadInput>) => {
  const patch: Partial<CrmLeadInput> & { stageChangedAt?: number } = omitUndefined(data);
  if (data.stage) patch.stageChangedAt = Date.now();
  return updateDoc(doc(db, "crmLeads", id), patch);
};

export const deleteCrmLead = (id: string) => deleteDoc(doc(db, "crmLeads", id));

// —— Estimates ——
export interface CrmEstimateInput {
  leadId: string;
  leadName: string;
  title: string;
  amount: number;
  lowAmount: number;
  highAmount: number;
  status: EstimateStatus;
  validUntil: string;
  notes: string;
  createdBy: string;
}

export interface CrmEstimate extends CrmEstimateInput {
  id: string;
  sentAt: number | null;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToCrmEstimates = (onChange: (items: CrmEstimate[]) => void) =>
  onSnapshot(collection(db, "crmEstimates"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CrmEstimate, "id">) }))
      )
    );
  });

export const addCrmEstimate = (data: CrmEstimateInput) =>
  addDoc(
    collection(db, "crmEstimates"),
    omitUndefined({
      ...data,
      sentAt: data.status === "sent" ? Date.now() : null,
      createdAt: serverTimestamp(),
    })
  );

export const updateCrmEstimate = (id: string, data: Partial<CrmEstimateInput>) => {
  const patch = omitUndefined(data) as Partial<CrmEstimateInput> & { sentAt?: number | null };
  if (data.status === "sent") patch.sentAt = Date.now();
  return updateDoc(doc(db, "crmEstimates", id), patch);
};

export const deleteCrmEstimate = (id: string) =>
  deleteDoc(doc(db, "crmEstimates", id));

// —— Reminders ——
export interface CrmReminderInput {
  leadId: string;
  leadName: string;
  dueDate: string;
  message: string;
  assigneeName: string;
  assigneeEmail: string | null;
  createdBy: string;
}

export interface CrmReminder extends CrmReminderInput {
  id: string;
  completed: boolean;
  completedAt: number | null;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToCrmReminders = (onChange: (items: CrmReminder[]) => void) =>
  onSnapshot(collection(db, "crmReminders"), (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CrmReminder, "id">),
    }));
    items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    onChange(items);
  });

export const addCrmReminder = (data: CrmReminderInput) =>
  addDoc(
    collection(db, "crmReminders"),
    omitUndefined({
      ...data,
      assigneeEmail: data.assigneeEmail ?? null,
      completed: false,
      completedAt: null,
      createdAt: serverTimestamp(),
    })
  );

export const completeCrmReminder = (id: string) =>
  updateDoc(doc(db, "crmReminders", id), {
    completed: true,
    completedAt: Date.now(),
  });

export const deleteCrmReminder = (id: string) =>
  deleteDoc(doc(db, "crmReminders", id));

// —— Email templates ——
export interface CrmEmailTemplateInput {
  name: string;
  subject: string;
  body: string;
  createdBy: string;
}

export interface CrmEmailTemplate extends CrmEmailTemplateInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToCrmEmailTemplates = (
  onChange: (items: CrmEmailTemplate[]) => void
) =>
  onSnapshot(collection(db, "crmEmailTemplates"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CrmEmailTemplate, "id">),
        }))
      )
    );
  });

export const addCrmEmailTemplate = (data: CrmEmailTemplateInput) =>
  addDoc(
    collection(db, "crmEmailTemplates"),
    omitUndefined({ ...data, createdAt: serverTimestamp() })
  );

export const updateCrmEmailTemplate = (
  id: string,
  data: Partial<CrmEmailTemplateInput>
) => updateDoc(doc(db, "crmEmailTemplates", id), omitUndefined(data));

export const deleteCrmEmailTemplate = (id: string) =>
  deleteDoc(doc(db, "crmEmailTemplates", id));

// —— Proposals ——
export interface CrmProposalInput {
  leadId: string;
  leadName: string;
  estimateId: string | null;
  title: string;
  amount: number;
  status: ProposalStatus;
  validUntil: string;
  scopeNotes: string;
  createdBy: string;
}

export interface CrmProposal extends CrmProposalInput {
  id: string;
  sentAt: number | null;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToCrmProposals = (onChange: (items: CrmProposal[]) => void) =>
  onSnapshot(collection(db, "crmProposals"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CrmProposal, "id">) }))
      )
    );
  });

export const addCrmProposal = (data: CrmProposalInput) =>
  addDoc(
    collection(db, "crmProposals"),
    omitUndefined({
      ...data,
      estimateId: data.estimateId ?? null,
      sentAt: data.status === "sent" ? Date.now() : null,
      createdAt: serverTimestamp(),
    })
  );

export const updateCrmProposal = (id: string, data: Partial<CrmProposalInput>) => {
  const patch = omitUndefined(data) as Partial<CrmProposalInput> & { sentAt?: number | null };
  if (data.status === "sent") patch.sentAt = Date.now();
  return updateDoc(doc(db, "crmProposals", id), patch);
};

export const deleteCrmProposal = (id: string) =>
  deleteDoc(doc(db, "crmProposals", id));
