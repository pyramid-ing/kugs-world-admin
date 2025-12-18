"use client";

import React from "react";
import { useTable } from "@refinedev/antd";
import type { BaseRecord, CrudFilters, HttpError } from "@refinedev/core";
import { useNavigation } from "@refinedev/core";
import { useDeleteMany } from "@refinedev/core";
import type { TablePaginationConfig } from "antd";
import { Button, Form, Input, Select, Space, Table, Tag, Typography, message } from "antd";

import { QUOTE_STATUS_LABEL } from "@/lib/constants";
import { AdminListShell } from "@/components/ui/AdminListShell";
import { getErrorMessage } from "@/lib/errors";
import { buildQuoteIntakeUrl } from "@/lib/env";

type QuoteRecord = BaseRecord & {
  id: string;
  no: number;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  car_number: string;
  estimated_amount: number;
  final_amount: number | null;
  status: string;
  completed_at: string | null;
};

type QuoteSearchValues = {
  status?: string;
  q?: string;
};

export default function QuotesListPage() {
  const { edit } = useNavigation();
  const { tableProps, searchFormProps } = useTable<QuoteRecord, HttpError, QuoteSearchValues>({
    resource: "quote_requests",
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    meta: {
      select:
        "id, no, created_at, customer_name, customer_phone, car_number, estimated_amount, final_amount, status, completed_at",
    },
    onSearch: (values: QuoteSearchValues): CrudFilters => {
      const filters: CrudFilters = [];
      if (values?.status && values.status !== "all") {
        filters.push({ field: "status", operator: "eq", value: values.status });
      }
      if (values?.q) {
        // 우선 차량번호 기준 contains
        filters.push({ field: "car_number", operator: "contains", value: String(values.q) });
      }
      return filters;
    },
  });

  const { mutateAsync: deleteManyAsync, isPending: isDeleting } = useDeleteMany();
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);

  const onDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await deleteManyAsync({ resource: "quote_requests", ids: selectedRowKeys.map(String) });
      message.success("선택한 항목을 삭제했습니다.");
      setSelectedRowKeys([]);
    } catch (e: unknown) {
      console.warn(e);
      message.error(getErrorMessage(e) ?? "삭제에 실패했습니다.");
    }
  };

  const pagination = tableProps.pagination as TablePaginationConfig | undefined;

  return (
    <AdminListShell
      title="접수 관리"
      filters={
        <>
          <div className="kw-filter-left">
            <Button danger disabled={selectedRowKeys.length === 0} loading={isDeleting} onClick={onDeleteSelected}>
              삭제
            </Button>
            <Form {...searchFormProps} layout="inline" style={{ gap: 8 }}>
              <Form.Item name="status" initialValue="all" style={{ marginBottom: 0 }}>
                <Select
                  style={{ width: 140 }}
                  options={[
                    { label: "전체", value: "all" },
                    { label: "상담신청", value: "requested" },
                    { label: "견적확정", value: "confirmed" },
                    { label: "시공완료", value: "completed" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="q" style={{ marginBottom: 0 }}>
                <Input style={{ width: 260 }} placeholder="검색어 입력(차량번호)" allowClear />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit">
                  검색
                </Button>
              </Form.Item>
            </Form>
          </div>
          <Typography.Text className="kw-muted">총 {pagination?.total ?? "-"}건</Typography.Text>
        </>
      }
    >
      <Table
        {...tableProps}
        rowKey="id"
        scroll={{ x: 1300 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          ...(pagination ?? {}),
          showSizeChanger: false,
        }}
      >
        <Table.Column<QuoteRecord> dataIndex="no" title="NO" width={90} />
        <Table.Column<QuoteRecord>
          title="접수URL"
          width={360}
          render={(_, record) => {
            const url = buildQuoteIntakeUrl(record.id);
            return url ? (
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            ) : (
              "-"
            );
          }}
        />
        <Table.Column<QuoteRecord> dataIndex="created_at" title="발송일시" width={180} />
        <Table.Column<QuoteRecord> dataIndex="customer_name" title="성함" width={120} />
        <Table.Column<QuoteRecord> dataIndex="customer_phone" title="연락처" width={140} />
        <Table.Column<QuoteRecord> dataIndex="car_number" title="차량번호" width={140} />
        <Table.Column<QuoteRecord>
          dataIndex="estimated_amount"
          title="예상견적"
          width={120}
          render={(v) => <Typography.Text>{Number(v ?? 0).toLocaleString()}</Typography.Text>}
        />
        <Table.Column<QuoteRecord>
          dataIndex="final_amount"
          title="최종견적"
          width={120}
          render={(v) => (v == null ? "-" : Number(v).toLocaleString())}
        />
        <Table.Column<QuoteRecord>
          dataIndex="completed_at"
          title="시공 완료일"
          width={180}
          render={(v) => (v ? String(v) : "-")}
        />
        <Table.Column<QuoteRecord>
          dataIndex="status"
          title="상태"
          width={110}
          render={(v) => <Tag>{QUOTE_STATUS_LABEL[String(v)] ?? String(v)}</Tag>}
        />
        <Table.Column<QuoteRecord>
          title="작업"
          key="actions"
          fixed="right"
          width={110}
          render={(_, record) => (
            <Space>
              <Button size="small" onClick={() => edit("quote_requests", record.id)}>
                수정
              </Button>
            </Space>
          )}
        />
      </Table>
    </AdminListShell>
  );
}


