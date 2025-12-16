"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

// NOTE:
// Next.js 클라이언트 번들에서는 `process.env[dynamicKey]` 형태가 빌드 시점 치환이 안 되어
// NEXT_PUBLIC_* 값이 undefined로 남는 경우가 많습니다.
// 따라서 반드시 정적 접근(process.env.NEXT_PUBLIC_...)으로 한 번 읽어온 뒤 사용합니다.
const CLIENT_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

function getEnv(name: keyof typeof CLIENT_ENV) {
  const value = CLIENT_ENV[name];
  if (!value) {
    throw new Error(`Missing env: ${name}. .env.local에 Supabase 설정을 추가하세요.`);
  }
  return value;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (_client) return _client;

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _client;
}


