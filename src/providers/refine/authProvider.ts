"use client";

import type { AuthProvider } from "@refinedev/core";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAdminContext } from "@/contexts/AdminContext";

// Refine는 authProvider를 객체로 받지만, 내부에서 AdminContext를 쓰기 위해 팩토리로 만듭니다.
export function createAuthProvider(): AuthProvider {
  return {
    login: async ({ email, password }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: String(email ?? ""),
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
      const { data: profile, error } = await supabase
        .from("admin_profiles")
        .select("user_id, active, role, organization_id, branch_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error || !profile || profile.active !== true) {
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


