import { NextResponse, type NextRequest } from "next/server";
import axios from "axios";

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function buildTargetUrl(req: NextRequest, pathParts: string[]) {
  // Supabase Edge Functions base: https://<project>.supabase.co/functions/v1/<function-name>
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const functionName = "admin-api";
  const path = pathParts.map(encodeURIComponent).join("/");
  const search = req.nextUrl.searchParams.toString();
  const suffix = search ? `?${search}` : "";
  return `${supabaseUrl}/functions/v1/${functionName}/${path}${suffix}`;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const url = buildTargetUrl(req, path);

  const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const incomingAuth = req.headers.get("authorization"); // Bearer <access_token>

  const headers = new Headers();
  headers.set("apikey", anonKey);
  headers.set("accept", req.headers.get("accept") ?? "application/json");

  // Edge Function이 verify_jwt=true면 유저 토큰이 필요, 없으면 anon으로는 401이 날 수 있음.
  if (incomingAuth) headers.set("authorization", incomingAuth);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const method = req.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer().catch(() => undefined);

  const res = await axios.request({
    url,
    method,
    headers: Object.fromEntries(headers.entries()),
    data: body,
    responseType: "arraybuffer",
    validateStatus: () => true,
  });

  const outHeaders = new Headers();
  const ct = res.headers?.["content-type"];
  if (typeof ct === "string") outHeaders.set("content-type", ct);

  // NextResponse 타입과 호환되도록 어떤 타입(Buffer/ArrayBuffer/SharedArrayBuffer/view)이든
  // "새 ArrayBuffer"로 복사해서 반환합니다.
  const asUint8 = (() => {
    const d = res.data as unknown;
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(d)) {
      const b = d as Buffer;
      return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    }
    if (d instanceof ArrayBuffer) return new Uint8Array(d);
    if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    // 마지막 fallback (ArrayBufferLike: ArrayBuffer | SharedArrayBuffer)
    return new Uint8Array(d as ArrayBufferLike);
  })();
  const payloadArrayBuffer = asUint8.slice().buffer;

  return new NextResponse(payloadArrayBuffer, { status: res.status, headers: outHeaders });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx);
}


