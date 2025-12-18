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

    // admin_profiles 테이블 스키마 기준: id/auth_user_id 없이 user_id만 존재합니다.
    const { data, error } = await supabase.from("admin_profiles").select("*").eq("user_id", userId).maybeSingle();
    const row = !error && data && typeof data === "object" ? (data as Record<string, unknown>) : null;

    if (!row) {
      setProfile(null);
      return null;
    }

    const roleRaw = (typeof row.role === "string" ? row.role : typeof row.admin_role === "string" ? row.admin_role : null) as
      | AdminRole
      | null;
    const role: AdminRole = roleRaw === "admin" || roleRaw === "dealer_admin" ? roleRaw : "dealer_admin";

    const active =
      typeof row.active === "boolean" ? row.active : typeof row.is_active === "boolean" ? row.is_active : typeof row.enabled === "boolean" ? row.enabled : true;

    const mustChange =
      typeof row.must_change_password === "boolean"
        ? row.must_change_password
        : typeof row.must_change_pw === "boolean"
          ? row.must_change_pw
          : false;

    const profileMapped: AdminProfile = {
      user_id: (typeof row.user_id === "string" ? row.user_id : userId) as string,
      organization_id: (typeof row.organization_id === "string" ? row.organization_id : typeof row.org_id === "string" ? row.org_id : "") as string,
      branch_id: (typeof row.branch_id === "string" ? row.branch_id : null) as string | null,
      role,
      name: (typeof row.name === "string" ? row.name : typeof row.full_name === "string" ? row.full_name : "") as string,
      login_id: (typeof row.login_id === "string" ? row.login_id : typeof row.username === "string" ? row.username : "") as string,
      active,
      must_change_password: mustChange,
      registered_at:
        (typeof row.registered_at === "string"
          ? row.registered_at
          : typeof row.created_at === "string"
            ? row.created_at
            : typeof row.updated_at === "string"
              ? row.updated_at
              : "") as string,
    };

    // 필수 값(조직/이름)이 비어 있으면 UX 상 최소한의 값 보정
    if (!profileMapped.name) profileMapped.name = profileMapped.login_id || profileMapped.user_id;
    if (!profileMapped.login_id) profileMapped.login_id = profileMapped.user_id;

    setProfile(profileMapped);
    // 기본 조직 선택: dealer_admin은 고정, admin은 로컬 저장값 우선.
    const nextProfile = profileMapped;
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(`kugs_admin_selected_org:${nextProfile.user_id}`) : null;
    const preferred = nextProfile.role === "dealer_admin" ? nextProfile.organization_id : stored ?? null;
    setSelectedOrganizationId((prev) => prev ?? preferred ?? nextProfile.organization_id);
    return profileMapped;
  }, []);

  const refreshOrganizations = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    // created_at 컬럼 변경 대비: order 실패하면 order 없이 재시도
    const first = await supabase.from("organizations").select("id, code, name").order("created_at");
    const data = first.error ? (await supabase.from("organizations").select("id, code, name")).data : first.data;
    const error = first.error ? (await supabase.from("organizations").select("id, code, name")).error : null;
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


