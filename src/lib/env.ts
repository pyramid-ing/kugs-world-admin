/**
 * Next.js 클라이언트 번들에서는 `process.env[dynamicKey]` 형태가 빌드 시점 치환이 안 되어
 * NEXT_PUBLIC_* 값이 undefined로 남는 경우가 있습니다.
 *
 * 따라서 반드시 정적 접근(process.env.NEXT_PUBLIC_...)으로 한 번 읽어온 뒤 사용합니다.
 */
export const PUBLIC_ENV = {
  NEXT_PUBLIC_WEB_DOMAIN: process.env.NEXT_PUBLIC_WEB_DOMAIN,
  NEXT_PUBLIC_ADMIN_API_BASE_URL: process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL,
  NEXT_PUBLIC_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_PUBLIC_API_BASE_URL,
} as const;

export type PublicEnvKey = keyof typeof PUBLIC_ENV;

export function requirePublicEnv(name: PublicEnvKey): string {
  const v = PUBLIC_ENV[name];
  if (!v) {
    throw new Error(`환경변수 ${name} 가 필요합니다. (.env.local 확인)`);
  }
  return v;
}

export function getPublicEnv(name: PublicEnvKey): string | null {
  const v = PUBLIC_ENV[name];
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
}

export function getWebDomain(): string | null {
  const v = getPublicEnv("NEXT_PUBLIC_WEB_DOMAIN");
  if (!v) return null;
  return v.replace(/\/+$/, "");
}

// quote_requests 테이블 스키마 기준: uuid 컬럼이 없고 id(uuid)가 기본 키입니다.
export function buildQuoteIntakeUrl(quoteRequestId: string | null | undefined): string | null {
  const base = getWebDomain();
  const id = typeof quoteRequestId === "string" ? quoteRequestId.trim() : "";
  if (!base || !id) return null;
  return `${base}/quote/${encodeURIComponent(id)}`;
}




