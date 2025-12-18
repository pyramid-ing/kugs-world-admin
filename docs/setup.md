# 로컬 실행 설정

## 1) 환경변수

`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 가 필요합니다.

예시:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_xxx..."
```

## 2) 실행

```bash
npm run dev
```

## 3) Vercel 배포 시(중요)

Vercel은 빌드 시점에 `NEXT_PUBLIC_*` 환경변수를 번들에 인라인합니다.  
따라서 **Vercel 프로젝트의 Environment Variables(Production/Preview 모두)** 에 아래 값을 반드시 등록해야 합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- (사용 시) `NEXT_PUBLIC_ADMIN_API_BASE_URL`
- (사용 시) `NEXT_PUBLIC_PUBLIC_API_BASE_URL`
- (접수 URL 생성 시) `NEXT_PUBLIC_WEB_DOMAIN`





