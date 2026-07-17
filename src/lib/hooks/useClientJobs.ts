"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { subscribeToJobs, type Job } from "../firebase/firebaseUtils";
import { filterClientJobs } from "../clientPortal";

export function useClientJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToJobs((all) => {
      setJobs(filterClientJobs(all, user.uid, user.email));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const hasProjects = jobs.length > 0;

  return useMemo(
    () => ({ jobs, loading, hasProjects, user }),
    [jobs, loading, hasProjects, user]
  );
}
