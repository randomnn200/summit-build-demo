"use client";

import Link from "next/link";
import { HardHat } from "lucide-react";
import { useAuth } from "../lib/hooks/useAuth";
import { useRole } from "../lib/hooks/useRole";
import { useClientJobs } from "../lib/hooks/useClientJobs";
import { isStaffRole } from "../lib/portalAccess";

const GREEN = "var(--brand-primary)";

/** Homepage banner — only when a client has at least one linked job. */
export default function ClientProjectBanner() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const { hasProjects, loading: jobsLoading, jobs } = useClientJobs();

  if (authLoading || roleLoading || jobsLoading || !user) return null;
  if (!hasProjects) return null;

  return (
    <section className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
      <div
        className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm sm:flex-row sm:items-center"
      >
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <HardHat className="h-4 w-4" />
            Your project is live
          </p>
          <p className="mt-1 text-sm text-emerald-800/90">
            {isStaffRole(role)
              ? "Preview the client portal for projects linked to your account."
              : jobs.length === 1
                ? `Track progress, photos, and documents for ${jobs[0].title}.`
                : `You have ${jobs.length} active projects — view progress, photos, and documents.`}
          </p>
        </div>
        <Link
          href="/client"
          className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          style={{ backgroundColor: GREEN }}
        >
          {isStaffRole(role) ? "Preview client portal" : "Open client portal"}
        </Link>
      </div>
    </section>
  );
}
