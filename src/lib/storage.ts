"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const STORAGE_BUCKETS = {
  branchImages: "branch-images",
  asImages: "as-images",
} as const;

export async function uploadToStorage(params: {
  bucket: string;
  path: string;
  file: File;
  upsert?: boolean;
  contentType?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { bucket, path, file, upsert = false, contentType } = params;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert,
    contentType: contentType ?? file.type ?? undefined,
  });
  if (error) throw error;
  return { bucket, path };
}

async function tryCreateSignedUrl(supabase: SupabaseClient, bucket: string, path: string, expiresIn: number) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function createSignedUrls(params: { bucket: string; paths: string[]; expiresIn?: number }) {
  const supabase = getSupabaseBrowserClient();
  const expiresIn = params.expiresIn ?? 60 * 30;

  const entries = await Promise.all(
    params.paths.map(async (p) => {
      try {
        const signedUrl = await tryCreateSignedUrl(supabase, params.bucket, p, expiresIn);
        return [p, signedUrl] as const;
      } catch {
        return [p, null] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as Record<string, string | null>;
}

export function buildStoragePath(prefix: string, filename: string) {
  const safe = filename.replace(/[^\w.\-()]+/g, "_");
  return `${prefix}/${Date.now()}_${safe}`;
}





