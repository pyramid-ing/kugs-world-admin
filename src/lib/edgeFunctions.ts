"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function invokeEdgeFunction<TResponse = unknown, TBody = unknown>(name: string, body?: TBody) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke<TResponse>(name, {
    body: body ?? {},
  });
  if (error) throw error;
  return data as TResponse;
}


