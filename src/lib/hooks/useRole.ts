"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  resolveRole,
  type Role,
  type RolesConfig,
} from "../firebase/firebaseUtils";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role>("customer");
  const [config, setConfig] = useState<RolesConfig>({
    ownerEmails: [],
    employeeEmails: [],
    employeeTitles: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setRole("customer");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resolved = await resolveRole(user.email);
      setRole(resolved.role);
      setConfig(resolved.config);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(err.code || err.message || "Failed to load role");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    reload();
  }, [authLoading, reload]);

  return { user, role, config, setConfig, loading, error, reload };
}
