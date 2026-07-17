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

// —— RFIs ——
export interface RfiInput {
  jobId: string;
  jobTitle: string;
  rfiNumber: string;
  subject: string;
  question: string;
  assignedTo: string;
  assignedEmail: string | null;
  dueDate: string;
  status: import("../constructionOps").RfiStatus;
  drawingLinks: string;
  createdBy: string;
}

export interface Rfi extends RfiInput {
  id: string;
  activityLog: import("../constructionOps").OpsActivityEntry[];
  createdAt: { seconds: number; nanoseconds: number } | null;
  updatedAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToRfis = (onChange: (items: Rfi[]) => void) =>
  onSnapshot(collection(db, "rfis"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Rfi, "id">) }))
      )
    );
  });

export const addRfi = (data: RfiInput) =>
  addDoc(
    collection(db, "rfis"),
    omitUndefined({
      ...data,
      activityLog: [
        { at: Date.now(), by: data.createdBy, action: `Created ${data.rfiNumber}` },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

export const updateRfi = (
  id: string,
  data: Partial<RfiInput>,
  activity?: import("../constructionOps").OpsActivityEntry
) => {
  const patch: Partial<RfiInput> & {
    updatedAt: ReturnType<typeof serverTimestamp>;
    activityLog?: ReturnType<typeof arrayUnion>;
  } = {
    ...omitUndefined(data),
    updatedAt: serverTimestamp(),
  };
  if (activity) patch.activityLog = arrayUnion(activity);
  return updateDoc(doc(db, "rfis", id), patch);
};

export const deleteRfi = (id: string) => deleteDoc(doc(db, "rfis", id));

// —— Daily reports ——
export interface DailyReportInput {
  jobId: string;
  jobTitle: string;
  reportDate: string;
  weather: string;
  crewOnSite: string;
  workCompleted: string;
  delays: string;
  visitors: string;
  safetyIncidents: string;
  photoLinks: string;
  notes: string;
  submittedBy: string;
  submittedByEmail: string | null;
}

export interface DailyReport extends DailyReportInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToDailyReports = (onChange: (items: DailyReport[]) => void) =>
  onSnapshot(collection(db, "dailyReports"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<DailyReport, "id">),
        }))
      )
    );
  });

export const addDailyReport = (data: DailyReportInput) =>
  addDoc(
    collection(db, "dailyReports"),
    omitUndefined({ ...data, createdAt: serverTimestamp() })
  );

export const deleteDailyReport = (id: string) =>
  deleteDoc(doc(db, "dailyReports", id));

// —— Punch list ——
export interface PunchListItemInput {
  jobId: string;
  jobTitle: string;
  location: string;
  description: string;
  assignedSubId: string | null;
  assignedSubName: string;
  dueDate: string;
  status: import("../constructionOps").PunchStatus;
  photoLinks: string;
  createdBy: string;
}

export interface PunchListItem extends PunchListItemInput {
  id: string;
  completedAt: number | null;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToPunchListItems = (
  onChange: (items: PunchListItem[]) => void
) =>
  onSnapshot(collection(db, "punchListItems"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PunchListItem, "id">),
        }))
      )
    );
  });

export const addPunchListItem = (data: PunchListItemInput) =>
  addDoc(
    collection(db, "punchListItems"),
    omitUndefined({
      ...data,
      completedAt: null,
      createdAt: serverTimestamp(),
    })
  );

export const updatePunchListItem = (
  id: string,
  data: Partial<PunchListItemInput & { completedAt?: number | null }>
) => updateDoc(doc(db, "punchListItems", id), omitUndefined(data));

export const deletePunchListItem = (id: string) =>
  deleteDoc(doc(db, "punchListItems", id));

// —— Permits ——
export interface PermitInput {
  jobId: string;
  jobTitle: string;
  permitNumber: string;
  permitType: string;
  issuedDate: string;
  expirationDate: string;
  status: import("../constructionOps").PermitStatus;
  notes: string;
  createdBy: string;
}

export interface Permit extends PermitInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToPermits = (onChange: (items: Permit[]) => void) =>
  onSnapshot(collection(db, "permits"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Permit, "id">) }))
      )
    );
  });

export const addPermit = (data: PermitInput) =>
  addDoc(
    collection(db, "permits"),
    omitUndefined({ ...data, createdAt: serverTimestamp() })
  );

export const updatePermit = (id: string, data: Partial<PermitInput>) =>
  updateDoc(doc(db, "permits", id), omitUndefined(data));

export const deletePermit = (id: string) => deleteDoc(doc(db, "permits", id));

// —— Inspections ——
export interface InspectionInput {
  jobId: string;
  jobTitle: string;
  permitId: string | null;
  inspectionType: string;
  scheduledDate: string;
  result: import("../constructionOps").InspectionResult;
  inspectorNotes: string;
  createdBy: string;
}

export interface Inspection extends InspectionInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToInspections = (onChange: (items: Inspection[]) => void) =>
  onSnapshot(collection(db, "inspections"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Inspection, "id">),
        }))
      )
    );
  });

export const addInspection = (data: InspectionInput) =>
  addDoc(
    collection(db, "inspections"),
    omitUndefined({ ...data, createdAt: serverTimestamp() })
  );

export const updateInspection = (id: string, data: Partial<InspectionInput>) =>
  updateDoc(doc(db, "inspections", id), omitUndefined(data));

export const deleteInspection = (id: string) =>
  deleteDoc(doc(db, "inspections", id));

// —— Suppliers ——
export interface SupplierInput {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  terms: string;
  notes: string;
  createdBy: string;
}

export interface Supplier extends SupplierInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToSuppliers = (onChange: (items: Supplier[]) => void) =>
  onSnapshot(collection(db, "suppliers"), (snap) => {
    onChange(
      sortByCreatedDesc(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Supplier, "id">),
        }))
      )
    );
  });

export const addSupplier = (data: SupplierInput) =>
  addDoc(
    collection(db, "suppliers"),
    omitUndefined({ ...data, createdAt: serverTimestamp() })
  );

export const updateSupplier = (id: string, data: Partial<SupplierInput>) =>
  updateDoc(doc(db, "suppliers", id), omitUndefined(data));

export const deleteSupplier = (id: string) => deleteDoc(doc(db, "suppliers", id));
