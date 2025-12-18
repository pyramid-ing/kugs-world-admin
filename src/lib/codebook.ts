"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type CodeMasterRow = {
  id: string;
  key: string;
  name: string;
  active: boolean;
};

export type CodeDetailRow = {
  id: string;
  master_id: string;
  code: string;
  label: string;
  sort_order: number;
  active: boolean;
  meta: unknown;
};

export type CodeOption = {
  label: string;
  value: string; // code_detail.id
  code: string;
  row: CodeDetailRow;
};

async function findMasterIdByKeyCandidates(keyCandidates: string[]): Promise<{ masterKey: string; masterId: string } | null> {
  const supabase = getSupabaseBrowserClient();
  for (const k of keyCandidates) {
    // 1) active=true 우선
    const activeFirst = await supabase.from("code_master").select("id, key").eq("key", k).eq("active", true).maybeSingle();
    if (!activeFirst.error && activeFirst.data?.id) return { masterKey: k, masterId: String(activeFirst.data.id) };

    // 2) active 컬럼/값이 다른 환경 대비: active 조건 없이 재시도
    const any = await supabase.from("code_master").select("id, key").eq("key", k).maybeSingle();
    if (!any.error && any.data?.id) return { masterKey: k, masterId: String(any.data.id) };
  }
  return null;
}

async function fetchCodeDetailsByMasterKeys(keyCandidates: string[]): Promise<{ masterKey: string | null; rows: CodeDetailRow[] }> {
  const found = await findMasterIdByKeyCandidates(keyCandidates);
  if (!found) return { masterKey: null, rows: [] };

  const supabase = getSupabaseBrowserClient();
  const res = await supabase
    .from("code_detail")
    .select("id, master_id, code, label, sort_order, active, meta")
    .eq("master_id", found.masterId)
    .eq("active", true)
    .order("sort_order");

  // active 컬럼/값이 다른 환경 대비: active 필터 때문에 42703/empty가 날 수 있어 재시도
  const rows =
    res.error
      ? (
          await supabase
            .from("code_detail")
            .select("id, master_id, code, label, sort_order, active, meta")
            .eq("master_id", found.masterId)
            .order("sort_order")
        ).data
      : res.data;

  return { masterKey: found.masterKey, rows: (rows ?? []) as CodeDetailRow[] };
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

export function getMetaParentId(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  // 다양한 naming 가능성 대응
  const keys = ["parent_id", "sido_id", "region_sido_id", "parentId", "sidoId"];
  for (const k of keys) {
    const v = m[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function useCodeOptions(keyCandidates: string[]) {
  const key = useMemo(() => keyCandidates.filter(Boolean).join("|"), [keyCandidates]);

  const query = useQuery({
    queryKey: ["code_detail_by_master_key_candidates", key],
    queryFn: () => fetchCodeDetailsByMasterKeys(keyCandidates),
    staleTime: 1000 * 60 * 10,
  });

  const options = useMemo<CodeOption[]>(() => {
    const rows = query.data?.rows ?? [];
    return rows.map((row) => ({
      label: safeString(row.label),
      value: safeString(row.id),
      code: safeString(row.code),
      row,
    }));
  }, [query.data?.rows]);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of options) map.set(o.value, o.label);
    return map;
  }, [options]);

  return {
    masterKey: query.data?.masterKey ?? null,
    options,
    labelById,
    isLoading: query.isLoading,
    error: query.error,
  };
}

// 기본 키 후보(프로젝트마다 code_master.key 네이밍이 달라서 후보를 넉넉히 둡니다)
export const CODE_MASTER_KEY_CANDIDATES = {
  branchType: ["branch_type", "branch_types", "BRANCH_TYPE"],
  regionSido: ["region_sido", "sido", "REGION_SIDO"],
  regionSigungu: ["region_sigungu", "sigungu", "REGION_SIGUNGU"],
} as const;


