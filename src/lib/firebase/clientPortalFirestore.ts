import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";

function omitUndefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

export interface ClientMessageInput {
  jobId: string;
  jobTitle: string;
  senderRole: "client" | "staff";
  senderName: string;
  senderEmail: string | null;
  message: string;
}

export interface ClientMessage extends ClientMessageInput {
  id: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

const sortByCreatedAsc = <T extends { createdAt: { seconds: number } | null }>(
  items: T[]
) => items.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));

export const subscribeToClientMessages = (
  jobId: string,
  onChange: (items: ClientMessage[]) => void
) =>
  onSnapshot(collection(db, "clientMessages"), (snap) => {
    onChange(
      sortByCreatedAsc(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<ClientMessage, "id">) }))
          .filter((m) => m.jobId === jobId)
      )
    );
  });

export const addClientMessage = (data: ClientMessageInput) =>
  addDoc(
    collection(db, "clientMessages"),
    omitUndefined({
      ...data,
      createdAt: serverTimestamp(),
    })
  );

export const clientRespondToChangeOrder = (
  id: string,
  approved: boolean,
  clientName: string
) =>
  updateDoc(
    doc(db, "changeOrders", id),
    omitUndefined({
      status: approved ? "approved" : "rejected",
      approvedBy: clientName,
      approvedAt: Date.now(),
    })
  );
