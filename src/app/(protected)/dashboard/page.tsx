"use client";

import React from "react";
import { Card, Typography } from "antd";

export default function DashboardPage() {
  return (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        대시보드
      </Typography.Title>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        좌측 메뉴에서 “관리자계정관리 / 접수관리 / A/S관리 / 대리점관리 …”로 이동하세요.
      </Typography.Paragraph>
    </Card>
  );
}


