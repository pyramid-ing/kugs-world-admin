/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel 배포(build) 단계에서 ESLint 실패로 빌드가 깨지는 것을 방지합니다.
  // 로컬/CI에서는 `pnpm lint`로 별도 실행을 권장합니다.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
