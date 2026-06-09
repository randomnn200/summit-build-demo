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
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

export const addTicketResponse = async (
  id: string,
  response: TicketResponse
) => {
  const patch: Record<string, unknown> = {
    responses: arrayUnion(response),
  };
  if (response.from === "company") {
    patch.companyLastResponseAt = response.at;
  }
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

export const deleteCallNote = (id: string) =>
  deleteDoc(doc(db, "callNotes", id));

// Scheduling
export interface ScheduleInput {
  title: string;
  date: string;
  time: string;
  location: string;
  assignee: string;
  notes: string;
}

export interface ScheduleItem extends ScheduleInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const addScheduleItem = (data: ScheduleInput) =>
  addDoc(collection(db, "schedule"), { ...data, createdAt: serverTimestamp() });

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
