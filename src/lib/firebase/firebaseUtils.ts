import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type {
  InventoryCategory,
  InventoryUnit,
  PurchaseOrderStatus,
} from "../inventory";
import type { ExpenseCategory } from "../expenses";
import { normalizeExpenseCategory } from "../expenses";
import { generateJobNumber, type JobStatus } from "../jobs";

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Pricing ticket functions
export interface TicketInput {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  projectType: string;
  budget: string;
  description: string;
}

export interface TicketResponse {
  from: "company" | "customer";
  text: string;
  authorName: string | null;
  at: number;
}

export interface Ticket extends TicketInput {
  id: string;
  status: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
  responses?: TicketResponse[];
  companyLastResponseAt?: number | null;
  customerViewedAt?: number | null;
  companyViewedAt?: number | null;
  deletionRequested?: boolean;
  deletionRequestedBy?: string | null;
  deletionRequestedAt?: number | null;
}

export const createTicket = (data: TicketInput) =>
  addDoc(collection(db, "tickets"), {
    ...data,
    status: "open",
    createdAt: serverTimestamp(),
  });

export const updateTicket = (
  id: string,
  data: Pick<TicketInput, "projectType" | "budget" | "description">
) => updateDoc(doc(db, "tickets", id), data);

export const deleteTicket = (id: string) => deleteDoc(doc(db, "tickets", id));

export const requestTicketDeletion = (id: string, requestedBy: string) =>
  updateDoc(doc(db, "tickets", id), {
    deletionRequested: true,
    deletionRequestedBy: requestedBy,
    deletionRequestedAt: Date.now(),
  });

export const clearTicketDeletionRequest = (id: string) =>
  updateDoc(doc(db, "tickets", id), {
    deletionRequested: false,
    deletionRequestedBy: null,
    deletionRequestedAt: null,
  });

export const addTicketResponse = async (
  id: string,
  response: TicketResponse
) => {
  const patch =
    response.from === "company"
      ? { responses: arrayUnion(response), companyLastResponseAt: response.at }
      : { responses: arrayUnion(response) };
  await updateDoc(doc(db, "tickets", id), patch);
};

export const markTicketViewedByCustomer = (id: string) =>
  updateDoc(doc(db, "tickets", id), { customerViewedAt: Date.now() });

export const markTicketViewedByCompany = (id: string) =>
  updateDoc(doc(db, "tickets", id), { companyViewedAt: Date.now() });

/**
 * Classifies a ticket from the company's perspective:
 *  - "attention": customer is awaiting a reply and no employee has viewed it yet
 *  - "read": an employee viewed the latest customer message but hasn't replied
 *  - null: not awaiting a reply (company replied last)
 */
export const companyTicketState = (t: Ticket): "attention" | "read" | null => {
  const r = t.responses ?? [];
  let incomingAt: number | null;
  if (r.length === 0) {
    incomingAt = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
  } else {
    const last = [...r].sort((a, b) => a.at - b.at)[r.length - 1];
    incomingAt = last.from === "customer" ? last.at : null;
  }
  if (incomingAt === null) return null;
  const viewed = t.companyViewedAt ?? 0;
  return viewed >= incomingAt && viewed > 0 ? "read" : "attention";
};

/** Live-subscribe to a single ticket. Returns an unsubscribe function. */
export const subscribeToTicket = (
  id: string,
  cb: (ticket: Ticket | null) => void
) =>
  onSnapshot(doc(db, "tickets", id), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Ticket, "id">) }) : null);
  });

/** Live-subscribe to all tickets (employee views). Returns an unsubscribe. */
export const subscribeToAllTickets = (cb: (tickets: Ticket[]) => void) =>
  onSnapshot(collection(db, "tickets"), (snap) => {
    const tickets = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Ticket, "id">),
    }));
    tickets.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    cb(tickets);
  });

/** Live-subscribe to a single customer's tickets. Returns an unsubscribe. */
export const subscribeToUserTickets = (
  userId: string,
  cb: (tickets: Ticket[]) => void
) =>
  onSnapshot(
    query(collection(db, "tickets"), where("userId", "==", userId)),
    (snap) => {
      const tickets = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Ticket, "id">),
      }));
      tickets.sort(
        (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
      );
      cb(tickets);
    }
  );

export const hasUnreadCompanyResponse = (t: Ticket) =>
  !!t.companyLastResponseAt &&
  (!t.customerViewedAt || t.companyLastResponseAt > t.customerViewedAt);

export const getUserTickets = async (userId: string): Promise<Ticket[]> => {
  // Filter by user only (no composite index needed); sort client-side.
  const q = query(collection(db, "tickets"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const tickets = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Ticket, "id">),
  }));
  return tickets.sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  );
};

// User profiles & roles
export interface UserProfile {
  displayName: string;
  city: string;
  title: string;
  phone: string;
  contactEmail: string;
  bio: string;
}

export const emptyProfile: UserProfile = {
  displayName: "",
  city: "",
  title: "",
  phone: "",
  contactEmail: "",
  bio: "",
};

export const getUserProfile = async (
  uid: string
): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

export const saveUserProfile = async (
  uid: string,
  email: string | null,
  data: UserProfile
) => {
  await setDoc(
    doc(db, "users", uid),
    { ...data, email, updatedAt: serverTimestamp() },
    { merge: true }
  );
  // Keep the Firebase Auth display name in sync for a nicer UX.
  if (auth?.currentUser && data.displayName) {
    try {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
    } catch (e) {
      console.error("Could not update auth display name", e);
    }
  }
};

export interface StoredUser extends UserProfile {
  id: string;
  email: string | null;
}

export const getAllUsers = async (): Promise<StoredUser[]> => {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => {
    const data = d.data() as UserProfile & { email?: string | null };
    return {
      id: d.id,
      ...emptyProfile,
      ...data,
      email: data.email ?? null,
    };
  });
};

/**
 * Ensures a user record exists for everyone who signs in (so they appear in
 * the Users list), without clobbering an existing profile.
 */
export const ensureUserRecord = async (
  uid: string,
  email: string | null,
  displayName: string | null
) => {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...emptyProfile,
      displayName: displayName || "",
      email: email ?? null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    await setDoc(
      ref,
      { email: email ?? null, lastLoginAt: serverTimestamp() },
      { merge: true }
    );
  }
};

export type Role = "owner" | "employee" | "customer";

export interface RolesConfig {
  ownerEmails: string[];
  employeeEmails: string[];
  // Owner-managed job titles for employees, keyed by (lowercased) email.
  employeeTitles: Record<string, string>;
}

const normalize = (email: string) => email.trim().toLowerCase();

// Owners defined via env are always owners (deterministic, can't be removed in UI).
const envOwnerEmails = (process.env.NEXT_PUBLIC_OWNER_EMAILS || "")
  .split(",")
  .map(normalize)
  .filter(Boolean);

export const getRolesConfig = async (): Promise<RolesConfig> => {
  const snap = await getDoc(doc(db, "appConfig", "roles"));
  if (snap.exists()) {
    const d = snap.data() as Partial<RolesConfig>;
    return {
      ownerEmails: d.ownerEmails ?? [],
      employeeEmails: d.employeeEmails ?? [],
      employeeTitles: d.employeeTitles ?? {},
    };
  }
  return { ownerEmails: [], employeeEmails: [], employeeTitles: {} };
};

export const setRolesConfig = async (config: RolesConfig) => {
  await setDoc(doc(db, "appConfig", "roles"), config, { merge: true });
};

/**
 * Resolves a user's role. Bootstraps the very first signed-in user as the
 * owner so there's always someone who can grant Employee access.
 */
export const resolveRole = async (
  email: string | null
): Promise<{ role: Role; config: RolesConfig }> => {
  let config = await getRolesConfig();
  const normalizedEmail = email ? normalize(email) : null;

  // Bootstrap an owner only if none are configured anywhere.
  if (
    normalizedEmail &&
    config.ownerEmails.length === 0 &&
    envOwnerEmails.length === 0
  ) {
    config = { ...config, ownerEmails: [normalizedEmail] };
    await setRolesConfig(config);
  }

  const owners = [...envOwnerEmails, ...config.ownerEmails.map(normalize)];

  let role: Role = "customer";
  if (normalizedEmail && owners.includes(normalizedEmail)) {
    role = "owner";
  } else if (
    normalizedEmail &&
    config.employeeEmails.map(normalize).includes(normalizedEmail)
  ) {
    role = "employee";
  }
  return { role, config };
};

export const addEmployee = async (email: string): Promise<RolesConfig> => {
  const config = await getRolesConfig();
  const e = normalize(email);
  if (!e) return config;
  if (config.employeeEmails.map(normalize).includes(e) ||
      config.ownerEmails.map(normalize).includes(e)) {
    return config;
  }
  const updated = {
    ...config,
    employeeEmails: [...config.employeeEmails, e],
  };
  await setRolesConfig(updated);
  return updated;
};

export const removeEmployee = async (email: string): Promise<RolesConfig> => {
  const config = await getRolesConfig();
  const e = normalize(email);
  const employeeTitles = { ...config.employeeTitles };
  delete employeeTitles[e];
  const updated = {
    ...config,
    employeeEmails: config.employeeEmails.filter((x) => normalize(x) !== e),
    employeeTitles,
  };
  await setRolesConfig(updated);
  return updated;
};

// True for emails configured as owners via env (cannot be demoted in the UI).
export const isEnvOwner = (email: string | null) =>
  !!email && envOwnerEmails.includes(normalize(email));

// Set a user's website permission level by email (owner action).
export const setUserRole = async (
  email: string,
  role: Role
): Promise<RolesConfig> => {
  const config = await getRolesConfig();
  const e = normalize(email);
  let ownerEmails = config.ownerEmails.filter((x) => normalize(x) !== e);
  let employeeEmails = config.employeeEmails.filter((x) => normalize(x) !== e);
  if (role === "owner") ownerEmails = [...ownerEmails, e];
  else if (role === "employee") employeeEmails = [...employeeEmails, e];
  const updated = { ...config, ownerEmails, employeeEmails };
  await setRolesConfig(updated);
  return updated;
};

export const roleForEmail = (
  email: string | null,
  config: RolesConfig
): Role => {
  if (!email) return "customer";
  const e = normalize(email);
  if (isEnvOwner(email) || config.ownerEmails.map(normalize).includes(e)) {
    return "owner";
  }
  if (config.employeeEmails.map(normalize).includes(e)) return "employee";
  return "customer";
};

// Only meaningful for employees; owner sets these.
export const setEmployeeTitle = async (
  email: string,
  title: string
): Promise<RolesConfig> => {
  const config = await getRolesConfig();
  const e = normalize(email);
  const updated = {
    ...config,
    employeeTitles: { ...config.employeeTitles, [e]: title },
  };
  await setRolesConfig(updated);
  return updated;
};

// ---- Employee portal data ----

const sortByCreatedDesc = <T extends { createdAt: { seconds: number } | null }>(
  items: T[]
) => items.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

// All tickets (employee/owner view)
export const getAllTickets = async (): Promise<Ticket[]> => {
  const snapshot = await getDocs(collection(db, "tickets"));
  const tickets = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Ticket, "id">),
  }));
  return sortByCreatedDesc(tickets);
};

export const ticketStatuses = [
  "open",
  "in progress",
  "quoted",
  "won",
  "closed",
] as const;

export const updateTicketStatus = (id: string, status: string) =>
  updateDoc(doc(db, "tickets", id), { status });

// Call notes
export interface CallNoteInput {
  customerName: string;
  phone: string;
  summary: string;
  createdByName: string | null;
}

export interface CallNote extends CallNoteInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const addCallNote = (data: CallNoteInput) =>
  addDoc(collection(db, "callNotes"), { ...data, createdAt: serverTimestamp() });

export const getCallNotes = async (): Promise<CallNote[]> => {
  const snapshot = await getDocs(collection(db, "callNotes"));
  const notes = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<CallNote, "id">),
  }));
  return sortByCreatedDesc(notes);
};

export const subscribeToCallNotes = (onChange: (notes: CallNote[]) => void) =>
  onSnapshot(collection(db, "callNotes"), (snapshot) => {
    const notes = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CallNote, "id">),
    }));
    onChange(sortByCreatedDesc(notes));
  });

export const deleteCallNote = (id: string) =>
  deleteDoc(doc(db, "callNotes", id));

// Scheduling
export interface ScheduleInput {
  title: string;
  date: string;
  time: string;
  location: string;
  assignee: string;
  assigneeEmail: string;
  notes: string;
  jobId: string | null;
  clientUid: string | null;
  postalCode: string;
}

export interface ScheduleItem extends ScheduleInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const addScheduleItem = (data: ScheduleInput) =>
  addDoc(
    collection(db, "schedule"),
    omitUndefined({
      ...data,
      jobId: data.jobId ?? null,
      clientUid: data.clientUid ?? null,
      postalCode: data.postalCode?.trim() || null,
      assigneeEmail: data.assigneeEmail?.trim().toLowerCase() || null,
      createdAt: serverTimestamp(),
    })
  );

export const getScheduleItems = async (): Promise<ScheduleItem[]> => {
  const snapshot = await getDocs(collection(db, "schedule"));
  const items = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ScheduleItem, "id">),
  }));
  // Upcoming first by date/time string.
  return items.sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
};

export const deleteScheduleItem = (id: string) =>
  deleteDoc(doc(db, "schedule", id));

export const subscribeToScheduleItems = (
  onChange: (items: ScheduleItem[]) => void
) =>
  onSnapshot(collection(db, "schedule"), (snapshot) => {
    const items = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ScheduleItem, "id">),
    }));
    items.sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    );
    onChange(items);
  });

export const subscribeToAllUsers = (onChange: (users: StoredUser[]) => void) =>
  onSnapshot(collection(db, "users"), (snapshot) => {
    const users = snapshot.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<StoredUser, "uid">),
    }));
    onChange(users);
  });

// Homepage quote requests → employee Lead Inbox
export type QuoteRequestStatus = "new" | "contacted" | "closed";

export interface QuoteRequestInput {
  name: string;
  phone: string;
}

export interface QuoteRequest extends QuoteRequestInput {
  id: string;
  status: QuoteRequestStatus;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const addQuoteRequest = (data: QuoteRequestInput) =>
  addDoc(collection(db, "quoteRequests"), {
    ...data,
    status: "new" as QuoteRequestStatus,
    createdAt: serverTimestamp(),
  });

export const subscribeToQuoteRequests = (
  onChange: (requests: QuoteRequest[]) => void
) =>
  onSnapshot(collection(db, "quoteRequests"), (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<QuoteRequest, "id">),
    }));
    onChange(sortByCreatedDesc(requests));
  });

export const updateQuoteRequestStatus = (
  id: string,
  status: QuoteRequestStatus
) => updateDoc(doc(db, "quoteRequests", id), { status });

export const deleteQuoteRequest = (id: string) =>
  deleteDoc(doc(db, "quoteRequests", id));

/** Firestore rejects undefined field values. */
function omitUndefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// Weekly analytics snapshots (owner dashboard history)
export type { AnalyticsWeeklySnapshot } from "../analyticsMetrics";

export const saveWeeklyAnalyticsSnapshot = async (
  snapshot: import("../analyticsMetrics").AnalyticsWeeklySnapshot
) => {
  await setDoc(doc(db, "analyticsWeekly", snapshot.weekId), snapshot, {
    merge: true,
  });
};

export const subscribeToWeeklyAnalyticsSnapshots = (
  onChange: (snapshots: import("../analyticsMetrics").AnalyticsWeeklySnapshot[]) => void
) =>
  onSnapshot(collection(db, "analyticsWeekly"), (snap) => {
    const list = snap.docs.map((d) => ({
      ...(d.data() as import("../analyticsMetrics").AnalyticsWeeklySnapshot),
    }));
    list.sort((a, b) => b.weekId.localeCompare(a.weekId));
    onChange(list);
  });

// Inventory
export type InventoryTransactionType =
  | "pull"
  | "restock"
  | "return"
  | "adjustment";

export interface InventoryItemInput {
  name: string;
  sku: string;
  category: InventoryCategory;
  quantity: number;
  unit: InventoryUnit;
  location: string;
  reorderLevel: number;
  unitCost?: number;
  supplier?: string;
  notes?: string;
}

export interface InventoryItem extends Omit<InventoryItemInput, "quantity"> {
  id: string;
  quantity: number;
  createdAt: { seconds: number; nanoseconds: number } | null;
  updatedAt: { seconds: number; nanoseconds: number } | null;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  type: InventoryTransactionType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  jobOrProject?: string;
  performedBy: string;
  performedByEmail?: string | null;
  notes?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export interface InventoryTransactionInput {
  itemId: string;
  itemName: string;
  itemSku: string;
  type: InventoryTransactionType;
  quantity: number;
  jobOrProject?: string;
  performedBy: string;
  performedByEmail?: string | null;
  notes?: string;
}

export const subscribeToInventoryItems = (
  onChange: (items: InventoryItem[]) => void
) =>
  onSnapshot(collection(db, "inventory"), (snapshot) => {
    const items = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<InventoryItem, "id">),
    }));
    items.sort((a, b) => a.name.localeCompare(b.name));
    onChange(items);
  });

export const subscribeToInventoryTransactions = (
  onChange: (txs: InventoryTransaction[]) => void
) =>
  onSnapshot(collection(db, "inventoryTransactions"), (snapshot) => {
    const txs = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<InventoryTransaction, "id">),
    }));
    onChange(sortByCreatedDesc(txs));
  });

export const addInventoryItem = async (
  data: InventoryItemInput,
  performedBy: string,
  performedByEmail?: string | null
) => {
  const { quantity, ...rest } = data;
  const ref = await addDoc(
    collection(db, "inventory"),
    omitUndefined({
      ...rest,
      quantity,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  if (quantity > 0) {
    await addDoc(collection(db, "inventoryTransactions"), {
      itemId: ref.id,
      itemName: data.name,
      itemSku: data.sku,
      type: "restock" as InventoryTransactionType,
      quantity,
      quantityBefore: 0,
      quantityAfter: quantity,
      jobOrProject: "Initial stock",
      performedBy,
      performedByEmail: performedByEmail ?? null,
      notes: "Item added to inventory",
      createdAt: serverTimestamp(),
    });
  }
  return ref.id;
};

export const updateInventoryItem = (
  id: string,
  data: Omit<InventoryItemInput, "quantity">
) =>
  updateDoc(
    doc(db, "inventory", id),
    omitUndefined({
      ...data,
      updatedAt: serverTimestamp(),
    })
  );

export const deleteInventoryItem = (id: string) =>
  deleteDoc(doc(db, "inventory", id));

export const recordInventoryTransaction = async (
  input: InventoryTransactionInput
) => {
  const itemRef = doc(db, "inventory", input.itemId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists()) throw new Error("Item not found");

    const item = snap.data() as Omit<InventoryItem, "id">;
    const before = item.quantity;
    let after = before;

    switch (input.type) {
      case "pull":
        after = before - input.quantity;
        break;
      case "restock":
      case "return":
        after = before + input.quantity;
        break;
      case "adjustment":
        after = before + input.quantity;
        break;
    }

    if (after < 0) {
      throw new Error("Insufficient stock for this transaction");
    }

    tx.update(itemRef, {
      quantity: after,
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, "inventoryTransactions"));
    tx.set(txRef, {
      itemId: input.itemId,
      itemName: input.itemName,
      itemSku: input.itemSku,
      type: input.type,
      quantity: input.quantity,
      quantityBefore: before,
      quantityAfter: after,
      jobOrProject: input.jobOrProject?.trim() || null,
      performedBy: input.performedBy,
      performedByEmail: input.performedByEmail ?? null,
      notes: input.notes?.trim() || null,
      createdAt: serverTimestamp(),
    });
  });
};

// Purchase orders
export interface PurchaseOrderLine {
  itemId: string | null;
  itemName: string;
  sku: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface PurchaseOrderInput {
  poNumber: string;
  supplier: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  expectedDate?: string;
  notes?: string;
  createdBy: string;
  createdByEmail?: string | null;
}

export interface PurchaseOrder extends PurchaseOrderInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
  updatedAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToPurchaseOrders = (
  onChange: (orders: PurchaseOrder[]) => void
) =>
  onSnapshot(collection(db, "purchaseOrders"), (snapshot) => {
    const orders = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PurchaseOrder, "id">),
    }));
    orders.sort((a, b) => {
      const ta = a.createdAt?.seconds ?? 0;
      const tb = b.createdAt?.seconds ?? 0;
      return tb - ta;
    });
    onChange(orders);
  });

export const createPurchaseOrder = async (data: PurchaseOrderInput) => {
  const ref = await addDoc(
    collection(db, "purchaseOrders"),
    omitUndefined({
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  return ref.id;
};

export const updatePurchaseOrderStatus = (
  id: string,
  status: PurchaseOrderStatus
) =>
  updateDoc(
    doc(db, "purchaseOrders", id),
    omitUndefined({
      status,
      updatedAt: serverTimestamp(),
    })
  );

export const receivePurchaseOrderItems = async (
  poId: string,
  receives: { lineIndex: number; quantity: number }[],
  performedBy: string,
  performedByEmail?: string | null
) => {
  const poRef = doc(db, "purchaseOrders", poId);

  await runTransaction(db, async (tx) => {
    const poSnap = await tx.get(poRef);
    if (!poSnap.exists()) throw new Error("Purchase order not found");

    const po = poSnap.data() as Omit<PurchaseOrder, "id">;
    if (po.status === "cancelled") {
      throw new Error("This purchase order was cancelled");
    }

    const lines = po.lines.map((l) => ({ ...l }));

    for (const { lineIndex, quantity } of receives) {
      if (quantity <= 0) continue;
      const line = lines[lineIndex];
      if (!line) continue;

      const remaining = line.quantityOrdered - line.quantityReceived;
      const recv = Math.min(quantity, remaining);
      if (recv <= 0) continue;

      lines[lineIndex] = {
        ...line,
        quantityReceived: line.quantityReceived + recv,
      };

      if (line.itemId) {
        const itemRef = doc(db, "inventory", line.itemId);
        const itemSnap = await tx.get(itemRef);
        if (!itemSnap.exists()) {
          throw new Error(`Inventory item "${line.itemName}" not found`);
        }

        const item = itemSnap.data() as Omit<InventoryItem, "id">;
        const before = item.quantity;
        const after = before + recv;

        tx.update(itemRef, {
          quantity: after,
          updatedAt: serverTimestamp(),
        });

        const txRef = doc(collection(db, "inventoryTransactions"));
        tx.set(txRef, {
          itemId: line.itemId,
          itemName: line.itemName,
          itemSku: line.sku,
          type: "restock" as InventoryTransactionType,
          quantity: recv,
          quantityBefore: before,
          quantityAfter: after,
          jobOrProject: po.poNumber,
          performedBy,
          performedByEmail: performedByEmail ?? null,
          notes: `Received from ${po.poNumber}`,
          createdAt: serverTimestamp(),
        });
      }
    }

    const allReceived = lines.every(
      (l) => l.quantityReceived >= l.quantityOrdered
    );
    const anyReceived = lines.some((l) => l.quantityReceived > 0);
    let status: PurchaseOrderStatus = po.status;
    if (allReceived) status = "received";
    else if (anyReceived || po.status === "ordered") status = "partial";

    tx.update(poRef, {
      lines,
      status,
      updatedAt: serverTimestamp(),
    });
  });
};

// Expenses
export interface ExpenseInput {
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  jobOrProject?: string;
  notes?: string;
  submittedBy: string;
  submittedByEmail?: string | null;
}

export interface Expense extends ExpenseInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
  /** Legacy field from earlier versions */
  vendor?: string;
}

export const subscribeToExpenses = (onChange: (expenses: Expense[]) => void) =>
  onSnapshot(collection(db, "expenses"), (snapshot) => {
    const expenses = snapshot.docs.map((d) => {
      const raw = d.data() as Omit<Expense, "id"> & { vendor?: string };
      return {
        id: d.id,
        ...raw,
        category: normalizeExpenseCategory(raw.category),
        description: (raw.description ?? raw.vendor ?? "").trim(),
      };
    });
    onChange(sortByCreatedDesc(expenses));
  });

export const addExpense = (data: ExpenseInput) =>
  addDoc(
    collection(db, "expenses"),
    omitUndefined({
      ...data,
      category: data.category,
      description: data.description.trim(),
      jobOrProject: data.jobOrProject?.trim() || null,
      notes: data.notes?.trim() || null,
      submittedByEmail: data.submittedByEmail ?? null,
      createdAt: serverTimestamp(),
    })
  );

export const deleteExpense = (id: string) =>
  deleteDoc(doc(db, "expenses", id));

// Saved quotes (Quote Helper → client file)
export interface SavedQuoteResultSnapshot {
  suggestedTotal: number;
  lowRange: number;
  highRange: number;
  profitAmount: number;
  profitMarginPercent: number;
  laborHours: number;
}

export interface SavedQuoteInput {
  clientUid: string | null;
  clientName: string;
  clientEmail: string | null;
  form: Record<string, string>;
  result: SavedQuoteResultSnapshot;
  savedBy: string;
  savedByEmail: string | null;
  notes?: string;
}

export interface SavedQuote extends SavedQuoteInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToSavedQuotes = (
  onChange: (quotes: SavedQuote[]) => void
) =>
  onSnapshot(collection(db, "savedQuotes"), (snapshot) => {
    const quotes = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SavedQuote, "id">),
    }));
    onChange(sortByCreatedDesc(quotes));
  });

export const addSavedQuote = (data: SavedQuoteInput) =>
  addDoc(
    collection(db, "savedQuotes"),
    omitUndefined({
      ...data,
      clientUid: data.clientUid ?? null,
      clientEmail: data.clientEmail ?? null,
      clientName: data.clientName.trim(),
      notes: data.notes?.trim() || null,
      savedByEmail: data.savedByEmail ?? null,
      createdAt: serverTimestamp(),
    })
  );

export const deleteSavedQuote = (id: string) =>
  deleteDoc(doc(db, "savedQuotes", id));

// Jobs (numeric job ID, linked to clients / schedule / postal code)
export interface JobInput {
  title: string;
  clientUid: string | null;
  clientName: string;
  clientEmail: string | null;
  postalCode: string;
  status: JobStatus;
  notes?: string;
  createdBy: string;
  createdByEmail: string | null;
}

export interface Job extends JobInput {
  jobId: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToJobs = (onChange: (jobs: Job[]) => void) =>
  onSnapshot(collection(db, "jobs"), (snapshot) => {
    const jobs = snapshot.docs.map((d) => ({
      jobId: d.id,
      ...(d.data() as Omit<Job, "jobId">),
    }));
    onChange(sortByCreatedDesc(jobs));
  });

export const createJob = async (data: JobInput): Promise<string> => {
  for (let attempt = 0; attempt < 8; attempt++) {
    const jobId = generateJobNumber();
    const ref = doc(db, "jobs", jobId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        omitUndefined({
          ...data,
          jobId,
          clientUid: data.clientUid ?? null,
          clientEmail: data.clientEmail ?? null,
          postalCode: data.postalCode.trim(),
          notes: data.notes?.trim() || null,
          createdByEmail: data.createdByEmail ?? null,
          createdAt: serverTimestamp(),
        })
      );
      return jobId;
    }
  }
  throw new Error("Could not generate a unique job ID");
};

export const updateJob = (
  jobId: string,
  data: Partial<
    Pick<
      JobInput,
      | "title"
      | "clientUid"
      | "clientName"
      | "clientEmail"
      | "postalCode"
      | "status"
      | "notes"
    >
  >
) =>
  updateDoc(
    doc(db, "jobs", jobId),
    omitUndefined({
      ...data,
      clientUid: data.clientUid === undefined ? undefined : data.clientUid ?? null,
      clientEmail:
        data.clientEmail === undefined ? undefined : data.clientEmail ?? null,
      postalCode: data.postalCode?.trim(),
      notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
    })
  );

export const deleteJob = (jobId: string) => deleteDoc(doc(db, "jobs", jobId));

// Time off requests
export type TimeOffStatus = "pending" | "approved" | "denied";

export interface TimeOffRequestInput {
  employeeEmail: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface TimeOffRequest extends TimeOffRequestInput {
  id: string;
  status: TimeOffStatus;
  createdAt: { seconds: number; nanoseconds: number } | null;
  reviewedBy?: string | null;
  reviewedAt?: number | null;
}

export const subscribeToTimeOffRequests = (
  onChange: (requests: TimeOffRequest[]) => void
) =>
  onSnapshot(collection(db, "timeOffRequests"), (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TimeOffRequest, "id">),
    }));
    onChange(sortByCreatedDesc(requests));
  });

export const addTimeOffRequest = (data: TimeOffRequestInput) =>
  addDoc(
    collection(db, "timeOffRequests"),
    omitUndefined({
      ...data,
      employeeEmail: data.employeeEmail.trim().toLowerCase(),
      employeeName: data.employeeName.trim(),
      reason: data.reason.trim(),
      status: "pending" as TimeOffStatus,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: serverTimestamp(),
    })
  );

export const updateTimeOffRequestStatus = (
  id: string,
  status: TimeOffStatus,
  reviewedBy: string
) =>
  updateDoc(doc(db, "timeOffRequests", id), {
    status,
    reviewedBy,
    reviewedAt: Date.now(),
  });

export const deleteTimeOffRequest = (id: string) =>
  deleteDoc(doc(db, "timeOffRequests", id));

// Google review replies (demo reviews + owner replies stored in Firestore)
export interface GoogleReviewReplyRecord {
  reviewId: string;
  reply: string;
  updatedBy: string;
  updatedByEmail: string | null;
  updatedAt: { seconds: number; nanoseconds: number } | null;
}

export const subscribeToGoogleReviewReplies = (
  onChange: (replies: Record<string, GoogleReviewReplyRecord>) => void
) =>
  onSnapshot(collection(db, "googleReviewReplies"), (snapshot) => {
    const map: Record<string, GoogleReviewReplyRecord> = {};
    for (const d of snapshot.docs) {
      map[d.id] = {
        reviewId: d.id,
        ...(d.data() as Omit<GoogleReviewReplyRecord, "reviewId">),
      };
    }
    onChange(map);
  });

export const saveGoogleReviewReply = (
  reviewId: string,
  reply: string,
  updatedBy: string,
  updatedByEmail: string | null
) =>
  setDoc(
    doc(db, "googleReviewReplies", reviewId),
    {
      reply: reply.trim(),
      updatedBy,
      updatedByEmail: updatedByEmail ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
