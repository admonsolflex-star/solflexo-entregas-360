"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_ROLE, normalizeRole, type UserRole } from "@/lib/auth/permissions";

type ProfileRole = {
  rol: string | null;
};

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(DEFAULT_ROLE);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    cargarRol();
  }, []);

  async function cargarRol() {
    setLoadingRole(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setRole(DEFAULT_ROLE);
      setLoadingRole(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error cargando rol del usuario:", error);
      setRole(DEFAULT_ROLE);
      setLoadingRole(false);
      return;
    }

    const profile = data as ProfileRole | null;

    setRole(normalizeRole(profile?.rol));
    setLoadingRole(false);
  }

  return {
    role,
    loadingRole,
    isLoadingRole: loadingRole,
  };
}