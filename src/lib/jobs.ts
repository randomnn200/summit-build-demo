export const JOB_STATUSES = ["active", "completed", "on_hold"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  active: "Active",
  completed: "Completed",
  on_hold: "On hold",
};

/** Eight-digit numeric job ID (e.g. 48291037). */
export function generateJobNumber(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}
