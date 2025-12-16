"use client";

import React, { useMemo } from "react";
import { Show, RefreshButton } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Card, Descriptions, Space, Typography } from "antd";

type PartnershipRecord = {
  id: string;
  no?: number;
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  content?: string;
  created_at?: string;
};

export default function PartnershipShowPage({ params }: { params: { id: string } }) {
  const { queryResult } = useShow<PartnershipRecord>({ resource: "partnership_inquiries", id: params.id });
  const record = queryResult.data?.data;

  const title = useMemo(() => (record?.name ? `사업제휴 - ${String(record.name)}` : "사업제휴 상세"), [record?.name]);

  return (
    <Show
      title={title}
      headerButtons={({ refreshButtonProps }) => (
        <Space>
          <RefreshButton {...refreshButtonProps} />
        </Space>
      )}
    >
      <Card>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="NO">{record?.no ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="등록일">{record?.created_at ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="성함">{record?.name ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="연락처">{record?.phone ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="이메일" span={2}>
            {record?.email ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="전달사항" span={2}>
            <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
              {(record as any)?.message ?? (record as any)?.content ?? "-"}
            </Typography.Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Show>
  );
}


