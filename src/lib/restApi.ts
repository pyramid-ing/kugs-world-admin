"use client";

import axios, { type AxiosRequestConfig } from "axios";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { requirePublicEnv } from "@/lib/env";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function getSupabaseHostHint(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

function isSupabaseFunctionsBase(baseUrl: string): boolean {
  const supabaseHost = getSupabaseHostHint();
  if (!supabaseHost) return false;
  try {
    const u = new URL(baseUrl);
    // https://<project>.supabase.co/functions/v1/<function-name>
    return u.host === supabaseHost && u.pathname.includes("/functions/v1");
  } catch {
    return false;
  }
}

function rewriteToSameOriginProxyIfNeeded(baseUrl: string, path: string): { baseUrl: string; path: string; proxied: boolean } {
  // 브라우저에서 Supabase Edge Function으로 직접 호출하면 CORS/프리플라이트에 막힐 수 있어
  // Next 서버 라우트(/api/admin-api/...)로 프록시합니다.
  if (!isSupabaseFunctionsBase(baseUrl)) return { baseUrl, path, proxied: false };
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return { baseUrl: "", path: `/api/admin-api${normalized}`, proxied: true };
}

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function getErrorMessageFromBody(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

async function axiosJson<T>(url: string, config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await axios.request({
      url,
      validateStatus: () => true,
      responseType: "json",
      ...config,
    });

    if (res.status >= 200 && res.status < 300) {
      return res.data as T;
    }

    const msg = getErrorMessageFromBody(res.data, `HTTP ${res.status}`);
    throw new ApiError(msg, res.status, res.data);
  } catch (e: unknown) {
    // 네트워크/타임아웃 등 axios 자체 오류
    if (e instanceof ApiError) throw e;
    const ax = e as { message?: unknown; response?: { status?: unknown; data?: unknown } };
    const status = typeof ax.response?.status === "number" ? ax.response.status : 0;
    const body = ax.response?.data ?? null;
    const msg = typeof ax.message === "string" ? ax.message : "Network error";
    throw new ApiError(getErrorMessageFromBody(body, msg), status, body);
  }
}

async function authedJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const rewritten = rewriteToSameOriginProxyIfNeeded(baseUrl, path);
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  // Supabase Edge Functions를 직접 호출하는 경우(apikey/Authorization) 헤더가 필요할 수 있습니다.
  // - 세션이 있으면 user access_token을 Authorization으로
  // - 세션이 없으면 anon key를 Authorization으로 (verify_jwt=false 함수용)
  // - 둘 다 apikey 헤더는 anon key로 세팅
  if (isSupabaseFunctionsBase(baseUrl) && !rewritten.proxied) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anonKey) {
      if (!headers.has("apikey")) headers.set("apikey", anonKey);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      } else if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${anonKey}`);
      }
    } else if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } else {
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  if (init?.body != null && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const url = joinUrl(rewritten.baseUrl, rewritten.path);
  const method = (init?.method ?? "GET").toUpperCase();
  const data = init?.body;

  return axiosJson<T>(url, {
    method,
    data,
    headers: Object.fromEntries(headers.entries()),
  });
}

export const ADMIN_API_BASE_URL_ENV = "NEXT_PUBLIC_ADMIN_API_BASE_URL";
export const PUBLIC_API_BASE_URL_ENV = "NEXT_PUBLIC_PUBLIC_API_BASE_URL";

function getAdminBaseUrl(): string {
  // 정적 접근 기반(env.ts)으로 읽어온 값을 사용합니다.
  return requirePublicEnv("NEXT_PUBLIC_ADMIN_API_BASE_URL");
}

function getPublicBaseUrl(): string {
  return requirePublicEnv("NEXT_PUBLIC_PUBLIC_API_BASE_URL");
}

export type AdminCreateBranchBody = {
  name: string;
  organization_id?: string;
  branch_type?: "hq" | "agency" | "dealer" | "headquarters";
  owner_name?: string | null;
  phone?: string | null;
  business_no?: string | null;
  region_sido?: string | null;
  region_sigungu?: string | null;
  address?: string | null;
  address_detail?: string | null;
  memo?: string | null;
  is_visible?: boolean;
};

export type AdminCreateBranchResponse = {
  branch: {
    id: string;
    organization_id: string;
    branch_type_id: string;
    name: string;
    owner_name: string | null;
    phone: string | null;
    business_no: string | null;
    region_sido_id: string | null;
    region_sigungu_id: string | null;
    address: string | null;
    address_detail: string | null;
    is_visible: boolean;
    memo: string | null;
    created_at: string;
    branch_type: string;
    region_sido: string | null;
    region_sigungu: string | null;
  };
};

export type SignedUploadFile = { ext?: string; contentType?: string };
export type SignedUploadResponse = { uploads: Array<{ path: string; signed_url: string }> };
export type FinalizeResponse = { ok: true };

export type BranchImagesResponse = {
  branch_id: string;
  images: Array<{
    id: string;
    bucket: string;
    path: string;
    sort_order: number;
    created_at: string;
    signed_url: string | null;
    sign_error: string | null;
    expires_in: number;
  }>;
};

export type AdminCreateUserBody = {
  email: string;
  login_id: string;
  name: string;
  role?: "admin" | "dealer_admin";
  organization_id: string;
  branch_id?: string | null;
};

export type AdminCreateUserResponse = { ok: true; user_id: string };

export type ResetPasswordResponse = { ok: true };

export type AsImagesResponse = {
  as_request_id: string;
  images: Array<{
    id: string;
    bucket: string;
    path: string;
    created_at: string;
    signed_url: string | null;
    sign_error: string | null;
    expires_in: number;
  }>;
};

export const adminApi = {
  async createBranch(body: AdminCreateBranchBody) {
    const baseUrl = getAdminBaseUrl();
    return authedJson<AdminCreateBranchResponse>(baseUrl, "/branches/create", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async branchSignedUpload(branchId: string, files: SignedUploadFile[]) {
    const baseUrl = getAdminBaseUrl();
    return authedJson<SignedUploadResponse>(baseUrl, `/branches/${encodeURIComponent(branchId)}/images/signed_upload`, {
      method: "POST",
      body: JSON.stringify({ files }),
    });
  },

  async branchFinalizeImages(branchId: string, paths: string[]) {
    const baseUrl = getAdminBaseUrl();
    return authedJson<FinalizeResponse>(baseUrl, `/branches/${encodeURIComponent(branchId)}/images/finalize`, {
      method: "POST",
      body: JSON.stringify({ paths }),
    });
  },

  async getBranchImages(branchId: string, expiresIn = 3600) {
    const baseUrl = getAdminBaseUrl();
    const q = new URLSearchParams({ expires_in: String(expiresIn) });
    return authedJson<BranchImagesResponse>(baseUrl, `/branches/${encodeURIComponent(branchId)}/images?${q.toString()}`, {
      method: "GET",
    });
  },

  async createUser(body: AdminCreateUserBody) {
    const baseUrl = getAdminBaseUrl();
    return authedJson<AdminCreateUserResponse>(baseUrl, "/users/create", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async resetPassword(userId: string) {
    const baseUrl = getAdminBaseUrl();
    return authedJson<ResetPasswordResponse>(baseUrl, "/users/reset_password", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  },
};

export const publicApi = {
  async getAsImages(asRequestId: string, expiresIn = 3600) {
    const baseUrl = getPublicBaseUrl();
    const q = new URLSearchParams({ expires_in: String(expiresIn) });
    return authedJson<AsImagesResponse>(baseUrl, `/as/${encodeURIComponent(asRequestId)}/images?${q.toString()}`, { method: "GET" });
  },
};

export async function uploadToSignedUrl(params: { signedUrl: string; file: File; contentType?: string }) {
  const contentType = params.contentType ?? params.file.type ?? "application/octet-stream";
  try {
    const res = await axios.request({
      url: params.signedUrl,
      method: "PUT",
      data: params.file,
      headers: { "Content-Type": contentType },
      // 대용량 업로드 대비
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new ApiError(`Signed upload 실패 (HTTP ${res.status})`, res.status, res.data ?? null);
    }
  } catch (e: unknown) {
    if (e instanceof ApiError) throw e;
    const ax = e as { response?: { status?: unknown; data?: unknown }; message?: unknown };
    const status = typeof ax.response?.status === "number" ? ax.response.status : 0;
    throw new ApiError(typeof ax.message === "string" ? ax.message : "Signed upload failed", status, ax.response?.data ?? null);
  }
}


