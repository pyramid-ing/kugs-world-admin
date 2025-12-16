"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { message } from "antd";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminRole = "admin" | "dealer_admin";

export type AdminProfile = {
  user_id: string;
  organization_id: string;
  branch_id: string | null;
  role: AdminRole;
  name: string;
  login_id: string;
  active: boolean;
  must_change_password: boolean;
  registered_at: string;
};

export type Organization = {
  id: string;
  code: string;
  name: string;
};

type AdminContextValue = {
  profile: AdminProfile | null;
  organizations: Organization[];
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (id: string | null) => void;
  refreshProfile: () => Promise<AdminProfile | null>;
  refreshOrganizations: () => Promise<Organization[]>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  const orgStorageKey = useMemo(() => {
    const userId = profile?.user_id ?? "anonymous";
    return `kugs_admin_selected_org:${userId}`;
  }, [profile?.user_id]);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from("admin_profiles")
      .select(
        "user_id, organization_id, branch_id, role, name, login_id, active, must_change_password, registered_at",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      // RLS/설정 전에도 로그인 화면까지는 동작해야 하므로, 하드 실패 대신 경고만.
      console.warn("[admin_profiles] fetch failed", error);
      message.error("관리자 프로필을 불러오지 못했습니다. (RLS/권한 설정 확인)");
      setProfile(null);
      return null;
    }

    if (!data) {
      setProfile(null);
      return null;
    }

    setProfile(data as AdminProfile);
    // 기본 조직 선택: dealer_admin은 고정, admin은 로컬 저장값 우선.
    const nextProfile = data as AdminProfile;
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(`kugs_admin_selected_org:${nextProfile.user_id}`) : null;
    const preferred = nextProfile.role === "dealer_admin" ? nextProfile.organization_id : stored ?? null;
    setSelectedOrganizationId((prev) => prev ?? preferred ?? nextProfile.organization_id);
    return data as AdminProfile;
  }, []);

  const refreshOrganizations = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from("organizations").select("id, code, name").order("created_at");
    if (error) {
      console.warn("[organizations] fetch failed", error);
      message.error("조직 목록을 불러오지 못했습니다.");
      setOrganizations([]);
      return [];
    }
    setOrganizations((data ?? []) as Organization[]);
    return (data ?? []) as Organization[];
  }, []);

  // admin은 조직 선택을 저장/복원, dealer_admin은 프로필 조직으로 강제합니다.
  useEffect(() => {
    if (!profile) return;
    if (profile.role === "dealer_admin") {
      if (selectedOrganizationId !== profile.organization_id) setSelectedOrganizationId(profile.organization_id);
      return;
    }
    if (!selectedOrganizationId) return;
    try {
      window.localStorage.setItem(orgStorageKey, selectedOrganizationId);
    } catch {
      // ignore
    }
  }, [orgStorageKey, profile, selectedOrganizationId]);

  const value = useMemo<AdminContextValue>(
    () => ({
      profile,
      organizations,
      selectedOrganizationId,
      setSelectedOrganizationId,
      refreshProfile,
      refreshOrganizations,
    }),
    [organizations, profile, refreshOrganizations, refreshProfile, selectedOrganizationId],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminContext must be used within AdminProvider");
  return ctx;
}


