import React, { Suspense } from "react";

import { RefineRoot } from "@/components/refine/RefineRoot";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Refine(nextjs-router)가 내부적으로 useSearchParams()를 사용하므로,
  // Next.js App Router에서 CSR bailout 경고/빌드 실패를 피하려면 Suspense 경계가 필요합니다.
  return (
    <Suspense fallback={null}>
      <RefineRoot>{children}</RefineRoot>
    </Suspense>
  );
}




