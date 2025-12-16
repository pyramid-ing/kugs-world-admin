"use client";

import React from "react";
import { List, useTable, ShowButton } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Space, Table, Tag } from "antd";

import { AS_STATUS_LABEL } from "@/lib/constants";

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

export default function AsListPage() {
  const { tableProps } = useTable<AsRecord>({
    resource: "as_requests",
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List title="A/S관리">
      <Table {...tableProps} rowKey="id" scroll={{ x: 900 }}>
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
    </List>
  );
}


