"use client";

import React from "react";
import { ErrorComponent } from "@refinedev/antd";

import { useAdminContext } from "@/contexts/AdminContext";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { profile } = useAdminContext();

  // 프로필 로딩 중(초기)에는 깜빡임을 줄이기 위해 아무것도 렌더링하지 않습니다.
  if (!profile) return null;

  if (profile.role !== "admin") {
    return <ErrorComponent statusCode={403} title="접근 권한이 없습니다." />;
  }

  return <>{children}</>;
}


