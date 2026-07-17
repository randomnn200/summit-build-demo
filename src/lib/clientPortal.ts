import type { Job } from "./firebase/firebaseUtils";

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

/** True when a job was created for this signed-in client. */
export function jobBelongsToClient(
  job: Job,
  uid: string,
  email: string | null | undefined
) {
  if (job.clientUid && job.clientUid === uid) return true;
  const clientEmail = normalizeEmail(job.clientEmail);
  const userEmail = normalizeEmail(email);
  return Boolean(clientEmail && userEmail && clientEmail === userEmail);
}

export function filterClientJobs(
  jobs: Job[],
  uid: string,
  email: string | null | undefined
) {
  return jobs.filter((job) => jobBelongsToClient(job, uid, email));
}

export type ClientPortalTab =
  | "overview"
  | "photos"
  | "documents"
  | "change_orders"
  | "invoices"
  | "messages";

export const CLIENT_PORTAL_TABS: {
  id: ClientPortalTab;
  label: string;
}[] = [
  { id: "overview", label: "Progress" },
  { id: "photos", label: "Photos" },
  { id: "documents", label: "Documents" },
  { id: "change_orders", label: "Change orders" },
  { id: "invoices", label: "Invoices" },
  { id: "messages", label: "Messages" },
];
