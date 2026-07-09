import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  ChangeOrderStatus,
  CheckoutStatus,
  CostCategory,
  DocumentCategory,
  DocumentStatus,
  InvoiceStatus,
  SubPaymentStatus,
} from "../constructionOps";

function omitUndefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

const sortByCreatedDesc = <T extends { createdAt: { seconds: number } | null }>(
  items: T[]
) => items.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

// —— Change orders ——
export interface ChangeOrderInput {
  jobId: string;
  jobTitle: string;
  title: string;
  description: string;
  laborCost: number;
  materialsCost: number;
  otherCost: number;
  status: ChangeOrderStatus;
  invoiceStatus: InvoiceStatus;
  attachmentNotes: string;
  externalLinks: string;
  requestedBy: string;
  requestedByEmail: string | null;
}

export interface ChangeOrder extends ChangeOrderInput {
  id: string;
  approvedBy?: string | null;
  approvedAt?: number | null;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToChangeOrders = (onChange: (items: ChangeOrder[]) => void) =>
  onSnapshot(collection(db, "changeOrders"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChangeOrder, "id">) }))
      )
    );
  });

export const addChangeOrder = (data: ChangeOrderInput) =>
  addDoc(
    collection(db, "changeOrders"),
    omitUndefined({
      ...data,
      approvedBy: null,
      approvedAt: null,
      createdAt: serverTimestamp(),
    })
  );

export const updateChangeOrder = (
  id: string,
  data: Partial<
    ChangeOrderInput & { approvedBy?: string | null; approvedAt?: number | null }
  >
) => updateDoc(doc(db, "changeOrders", id), omitUndefined(data));

export const deleteChangeOrder = (id: string) =>
  deleteDoc(doc(db, "changeOrders", id));

// —— Project documents ——
export interface DocumentActivity {
  at: number;
  by: string;
  action: string;
}

export interface ProjectDocumentInput {
  jobId: string;
  jobTitle: string;
  name: string;
  category: DocumentCategory;
  version: number;
  externalUrl: string;
  notes: string;
  status: DocumentStatus;
  uploadedBy: string;
}

export interface ProjectDocument extends ProjectDocumentInput {
  id: string;
  activityLog: DocumentActivity[];
  createdAt: { seconds: number; nanoseconds: number } | null;
  updatedAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToProjectDocuments = (
  onChange: (items: ProjectDocument[]) => void
) =>
  onSnapshot(collection(db, "projectDocuments"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ProjectDocument, "id">),
        }))
      )
    );
  });

export const addProjectDocument = (data: ProjectDocumentInput) =>
  addDoc(
    collection(db, "projectDocuments"),
    omitUndefined({
      ...data,
      activityLog: [
        { at: Date.now(), by: data.uploadedBy, action: "Uploaded v1" },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

export const updateProjectDocument = (
  id: string,
  data: Partial<ProjectDocumentInput>,
  activity?: DocumentActivity
) => {
  const patch: Partial<ProjectDocumentInput> & {
    updatedAt: ReturnType<typeof serverTimestamp>;
    activityLog?: ReturnType<typeof arrayUnion>;
  } = {
    ...omitUndefined(data),
    updatedAt: serverTimestamp(),
  };
  if (activity) patch.activityLog = arrayUnion(activity);
  return updateDoc(doc(db, "projectDocuments", id), patch);
};

export const deleteProjectDocument = (id: string) =>
  deleteDoc(doc(db, "projectDocuments", id));

// —— Job budgets & cost entries ——
export interface JobBudgetInput {
  budgetLabor: number;
  budgetMaterials: number;
  budgetEquipment: number;
  budgetOther: number;
  notes: string;
  updatedBy: string;
}

export interface JobBudget extends JobBudgetInput {
  jobId: string;
  updatedAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToJobBudgets = (
  onChange: (budgets: Record<string, JobBudget>) => void
) =>
  onSnapshot(collection(db, "jobBudgets"), (snap) => {
    const map: Record<string, JobBudget> = {};
    for (const d of snap.docs) {
      map[d.id] = { jobId: d.id, ...(d.data() as Omit<JobBudget, "jobId">) };
    }
    onChange(map);
  });

export const saveJobBudget = (jobId: string, data: JobBudgetInput) =>
  setDoc(
    doc(db, "jobBudgets", jobId),
    omitUndefined({ ...data, updatedAt: serverTimestamp() }),
    { merge: true }
  );

export interface JobCostEntryInput {
  jobId: string;
  jobTitle: string;
  category: CostCategory;
  amount: number;
  description: string;
  date: string;
  enteredBy: string;
  enteredByEmail: string | null;
}

export interface JobCostEntry extends JobCostEntryInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToJobCostEntries = (
  onChange: (items: JobCostEntry[]) => void
) =>
  onSnapshot(collection(db, "jobCostEntries"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<JobCostEntry, "id">),
        }))
      )
    );
  });

export const addJobCostEntry = (data: JobCostEntryInput) =>
  addDoc(
    collection(db, "jobCostEntries"),
    omitUndefined({ ...data, createdAt: serverTimestamp() })
  );

export const deleteJobCostEntry = (id: string) =>
  deleteDoc(doc(db, "jobCostEntries", id));

// —— Subcontractors ——
export interface SubcontractorInput {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  trade: string;
  insuranceExpiry: string;
  licenseExpiry: string;
  licenseNumber: string;
  assignedJobIds: string[];
  paymentStatus: SubPaymentStatus;
  performanceNotes: string;
  contractNotes: string;
  createdBy: string;
}

export interface Subcontractor extends SubcontractorInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToSubcontractors = (
  onChange: (items: Subcontractor[]) => void
) =>
  onSnapshot(collection(db, "subcontractors"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Subcontractor, "id">),
        }))
      )
    );
  });

export const addSubcontractor = (data: SubcontractorInput) =>
  addDoc(
    collection(db, "subcontractors"),
    omitUndefined({ ...data, createdAt: serverTimestamp() })
  );

export const updateSubcontractor = (id: string, data: Partial<SubcontractorInput>) =>
  updateDoc(doc(db, "subcontractors", id), omitUndefined(data));

export const deleteSubcontractor = (id: string) =>
  deleteDoc(doc(db, "subcontractors", id));

// —— Tool checkout ——
export interface ToolCheckoutInput {
  toolName: string;
  toolSku: string;
  inventoryItemId: string | null;
  checkedOutTo: string;
  checkedOutEmail: string;
  dueDate: string;
  status: CheckoutStatus;
  conditionOut: string;
  conditionIn: string;
  maintenanceNotes: string;
  jobId: string | null;
  jobTitle: string;
  notes: string;
}

export interface ToolCheckout extends ToolCheckoutInput {
  id: string;
  checkedOutAt: { seconds: number; nanoseconds: number } | null;
  returnedAt?: number | null;
}

export const subscribeToToolCheckouts = (onChange: (items: ToolCheckout[]) => void) =>
  onSnapshot(collection(db, "toolCheckouts"), (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ToolCheckout, "id">),
    }));
    items.sort(
      (a, b) => (b.checkedOutAt?.seconds ?? 0) - (a.checkedOutAt?.seconds ?? 0)
    );
    onChange(items);
  });

export const addToolCheckout = (data: ToolCheckoutInput) =>
  addDoc(
    collection(db, "toolCheckouts"),
    omitUndefined({
      ...data,
      returnedAt: null,
      checkedOutAt: serverTimestamp(),
    })
  );

export const updateToolCheckout = (
  id: string,
  data: Partial<
    ToolCheckoutInput & { returnedAt?: number | null; status?: CheckoutStatus }
  >
) => updateDoc(doc(db, "toolCheckouts", id), omitUndefined(data));

export const deleteToolCheckout = (id: string) =>
  deleteDoc(doc(db, "toolCheckouts", id));
