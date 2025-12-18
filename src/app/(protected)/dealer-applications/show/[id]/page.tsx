"use client";

import React, { useMemo, useState } from "react";
import { Show, RefreshButton } from "@refinedev/antd";
import { useShow, useUpdate } from "@refinedev/core";
import { Button, Card, Descriptions, Divider, Modal, Space, Tag, Typography, message, Input } from "antd";

import { DEALER_APP_STATUS_LABEL } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";

type DealerAppRecord = {
  id: string;
  no?: number;
  applicant_name?: string;
  title?: string;
  content?: string;
  message?: string;
  phone?: string;
  email?: string;
  status?: string;
  reject_reason?: string | null;
  created_at?: string;
};

export default function DealerApplicationShowPage({ params }: { params: { id: string } }) {
  const { queryResult } = useShow<DealerAppRecord>({ resource: "dealer_applications", id: params.id });
  const record = queryResult.data?.data;

  const { mutateAsync: updateAsync, isLoading } = useUpdate();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const status = String(record?.status ?? "");
  const statusLabel = DEALER_APP_STATUS_LABEL[status] ?? status;

  const canApprove = status === "waiting";
  const canReject = status === "waiting";

  const onApprove = async () => {
    if (!record?.id) return;
    try {
      await updateAsync({
        resource: "dealer_applications",
        id: record.id,
        values: { status: "approved", reject_reason: null },
      });
      message.success("승인 처리 완료");
      await queryResult.refetch();
    } catch (e: unknown) {
      console.warn(e);
      message.error(getErrorMessage(e) ?? "승인 처리에 실패했습니다.");
    }
  };

  const onReject = async () => {
    if (!record?.id) return;
    try {
      await updateAsync({
        resource: "dealer_applications",
        id: record.id,
        values: { status: "rejected", reject_reason: rejectReason || null },
      });
      message.success("반려 처리 완료");
      setRejectOpen(false);
      setRejectReason("");
      await queryResult.refetch();
    } catch (e: unknown) {
      console.warn(e);
      message.error(getErrorMessage(e) ?? "반려 처리에 실패했습니다.");
    }
  };

  const title = useMemo(() => (record?.title ? String(record.title) : "대리점 신청 상세"), [record?.title]);

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
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="NO">{record?.no ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="상태">
            <Tag>{statusLabel}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="신청자">{record?.applicant_name ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="등록일">{record?.created_at ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="연락처">{record?.phone ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="이메일">{record?.email ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="제목" span={2}>
            {record?.title ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="내용" span={2}>
            <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
              {record?.content ?? record?.message ?? "-"}
            </Typography.Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="반려사유" span={2}>
            {record?.reject_reason ?? "-"}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Space>
          <Button type="primary" disabled={!canApprove} loading={isLoading} onClick={onApprove}>
            승인
          </Button>
          <Button danger disabled={!canReject} loading={isLoading} onClick={() => setRejectOpen(true)}>
            반려
          </Button>
        </Space>
      </Card>

      <Modal
        title="반려 처리"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={onReject}
        okText="반려"
        okButtonProps={{ danger: true, loading: isLoading }}
      >
        <Typography.Paragraph type="secondary">반려 사유를 입력하세요. (선택)</Typography.Paragraph>
        <Input.TextArea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
      </Modal>
    </Show>
  );
}


