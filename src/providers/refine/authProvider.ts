"use client";

import type { AuthProvider } from "@refinedev/core";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAdminContext } from "@/contexts/AdminContext";

type AdminRole = "admin" | "dealer_admin";

function pickFirstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function pickFirstBoolean(obj: Record<string, unknown>, keys: string[]): boolean | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return null;
}

async function fetchAdminProfileForCheck(userId: string) {
  const supabase = getSupabaseBrowserClient();

  // admin_profiles 테이블 스키마 기준: id/auth_user_id 없이 user_id만 존재합니다.
  const { data, error } = await supabase.from("admin_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!error && data && typeof data === "object") {
    const row = data as Record<string, unknown>;
    const roleRaw = pickFirstString(row, ["role", "admin_role", "user_role"]);
    const role = roleRaw === "admin" || roleRaw === "dealer_admin" ? (roleRaw as AdminRole) : null;
    const active = pickFirstBoolean(row, ["active", "is_active", "enabled"]);
    return { row, role, active };
  }

  return {
    row: null as Record<string, unknown> | null,
    role: null as AdminRole | null,
    active: null as boolean | null,
  };
}

// Refine는 authProvider를 객체로 받지만, 내부에서 AdminContext를 쓰기 위해 팩토리로 만듭니다.
export function createAuthProvider(): AuthProvider {
  return {
    login: async ({ email, password }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: String(email ?? "").trim(),
        password: String(password ?? ""),
      });

      if (error) {
        return { success: false, error };
      }

      return { success: true, redirectTo: "/dashboard" };
    },
    logout: async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      return { success: true, redirectTo: "/login" };
    },
    check: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return { authenticated: false, redirectTo: "/login" };

      // 로그인했더라도 admin_profiles가 없거나 inactive면 즉시 차단합니다.
      const { row, role, active } = await fetchAdminProfileForCheck(session.user.id);

      // role이 없으면(매핑 실패/컬럼 변경/RLS) 어드민으로 인정하지 않음
      if (!row || !role) {
        console.warn("[auth.check] admin_profiles missing or role invalid", { userId: session.user.id });
        await supabase.auth.signOut();
        return { authenticated: false, redirectTo: "/login" };
      }

      // active 컬럼이 존재하는 경우에만 true 강제. (DB 변경으로 컬럼이 사라진 경우 로그인 자체를 막지 않음)
      if (active === false) {
        console.warn("[auth.check] admin_profiles inactive", { userId: session.user.id });
        await supabase.auth.signOut();
        return { authenticated: false, redirectTo: "/login" };
      }

      return { authenticated: true };
    },
    getPermissions: async () => {
      // 권한은 AdminContext(profile.role)에서 해석합니다.
      return null;
    },
    getIdentity: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      return {
        id: data.user.id,
        name: data.user.email ?? data.user.id,
      };
    },
    onError: async (error) => {
      // 토큰 만료/권한 오류 등에 대해 강제 로그아웃이 필요하면 여기서 처리합니다.
      console.warn("[authProvider.onError]", error);
      return { error };
    },
  };
}

// eslint가 unused export로 잡지 않도록 유지(향후 role 기반 getPermissions 구현에 사용).
export function useAuthProvider() {
  useAdminContext();
  return createAuthProvider();
}


