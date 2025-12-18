"use client";

import React from "react";
import { useTable, ShowButton } from "@refinedev/antd";
import type { BaseRecord, CrudFilters, HttpError } from "@refinedev/core";
import { useDeleteMany } from "@refinedev/core";
import type { TablePaginationConfig } from "antd";
import { Button, Form, Input, Select, Space, Table, Tag, Typography, message } from "antd";

import { AS_STATUS_LABEL } from "@/lib/constants";
import { AdminListShell } from "@/components/ui/AdminListShell";
import { getErrorMessage } from "@/lib/errors";

type AsRecord = BaseRecord & {
  id: string;
  no: number;
  customer_name: string;
  customer_phone: string;
  car_number: string;
  request_text: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type AsSearchValues = {
  status?: string;
  q?: string;
};

export default function AsListPage() {
  const { tableProps, searchFormProps } = useTable<AsRecord, HttpError, AsSearchValues>({
    resource: "as_requests",
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    onSearch: (values: AsSearchValues): CrudFilters => {
      const filters: CrudFilters = [];
      if (values?.status && values.status !== "all") {
        filters.push({ field: "status", operator: "eq", value: values.status });
      }
      if (values?.q) {
        // 우선 연락처 기준 contains
        filters.push({ field: "customer_phone", operator: "contains", value: String(values.q) });
      }
      return filters;
    },
  });

  const { mutateAsync: deleteManyAsync, isLoading: isDeleting } = useDeleteMany();
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);

  const onDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await deleteManyAsync({ resource: "as_requests", ids: selectedRowKeys.map(String) });
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
      title="A/S 관리"
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
                    { label: "대기", value: "waiting" },
                    { label: "시공확정", value: "scheduled" },
                    { label: "시공완료", value: "completed" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="q" style={{ marginBottom: 0 }}>
                <Input style={{ width: 260 }} placeholder="검색어 입력(연락처)" allowClear />
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
        scroll={{ x: 1000 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          ...(pagination ?? {}),
          showSizeChanger: false,
        }}
      >
        <Table.Column<AsRecord> dataIndex="no" title="NO" width={90} />
        <Table.Column<AsRecord> dataIndex="customer_name" title="성함" width={120} />
        <Table.Column<AsRecord> dataIndex="customer_phone" title="연락처" width={140} />
        <Table.Column<AsRecord> dataIndex="car_number" title="차량번호" width={140} />
        <Table.Column<AsRecord> dataIndex="request_text" title="요청사항" />
        <Table.Column<AsRecord>
          dataIndex="status"
          title="상태"
          width={120}
          render={(v) => <Tag>{AS_STATUS_LABEL[String(v)] ?? String(v)}</Tag>}
        />
        <Table.Column<AsRecord> dataIndex="created_at" title="접수일" width={150} />
        <Table.Column<AsRecord>
          dataIndex="completed_at"
          title="시공완료일"
          width={150}
          render={(v) => (v ? String(v) : "-")}
        />
        <Table.Column<AsRecord>
          title="작업"
          key="actions"
          fixed="right"
          width={120}
          render={(_, record) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </AdminListShell>
  );
}


