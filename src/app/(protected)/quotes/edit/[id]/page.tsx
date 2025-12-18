"use client";

import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Select, Space, Typography } from "antd";

import { buildQuoteIntakeUrl } from "@/lib/env";
import { QUOTE_STATUS_LABEL } from "@/lib/constants";

type QuoteRequestForm = {
  id: string;
  no?: number;
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
  car_number?: string;
  estimated_amount?: number;
  final_amount?: number | null;
  status?: string;
  completed_at?: string | null;
};

export default function QuoteEditPage({ params }: { params: { id: string } }) {
  const { formProps, saveButtonProps, queryResult } = useForm<QuoteRequestForm>({
    resource: "quote_requests",
    id: params.id,
    redirect: "list",
    meta: {
      select:
        "id, no, created_at, customer_name, customer_phone, car_number, estimated_amount, final_amount, status, completed_at",
    },
  });

  const record = queryResult?.data?.data;
  const intakeUrl = buildQuoteIntakeUrl(record?.id ?? params.id);

  return (
    <Edit
      title={`접수 수정${record?.no != null ? ` - ${record.no}` : ""}`}
      saveButtonProps={{
        ...saveButtonProps,
        onClick: () => formProps.form?.submit(),
      }}
      headerButtons={({ defaultButtons }) => <Space>{defaultButtons}</Space>}
    >
      <Form {...formProps} layout="vertical" requiredMark={false}>
        <Form.Item label="ID">
          <Input value={params.id} disabled />
        </Form.Item>

        <Form.Item label="접수URL">
          {intakeUrl ? (
            <a href={intakeUrl} target="_blank" rel="noreferrer">
              {intakeUrl}
            </a>
          ) : (
            <Typography.Text type="secondary">NEXT_PUBLIC_WEB_DOMAIN이 없어 URL을 만들 수 없습니다.</Typography.Text>
          )}
        </Form.Item>

        <Form.Item name="status" label="상태" rules={[{ required: true, message: "상태를 선택해주세요." }]}>
          <Select
            options={[
              { label: QUOTE_STATUS_LABEL.requested ?? "상담신청", value: "requested" },
              { label: QUOTE_STATUS_LABEL.confirmed ?? "견적확정", value: "confirmed" },
              { label: QUOTE_STATUS_LABEL.completed ?? "시공완료", value: "completed" },
            ]}
          />
        </Form.Item>

        <Space size="large" wrap>
          <Form.Item name="customer_name" label="성함" rules={[{ required: true, message: "성함을 입력해주세요." }]}>
            <Input style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="customer_phone" label="연락처" rules={[{ required: true, message: "연락처를 입력해주세요." }]}>
            <Input style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="car_number" label="차량번호" rules={[{ required: true, message: "차량번호를 입력해주세요." }]}>
            <Input style={{ width: 260 }} />
          </Form.Item>
        </Space>

        <Space size="large" wrap>
          <Form.Item name="estimated_amount" label="예상견적">
            <InputNumber style={{ width: 260 }} min={0} step={1000} />
          </Form.Item>
          <Form.Item name="final_amount" label="최종견적">
            <InputNumber style={{ width: 260 }} min={0} step={1000} />
          </Form.Item>
        </Space>

        <Form.Item name="completed_at" label="시공 완료일">
          <Input placeholder="예: 2025-12-17 또는 2025-12-17T12:34:56Z" />
        </Form.Item>
      </Form>
    </Edit>
  );
}




