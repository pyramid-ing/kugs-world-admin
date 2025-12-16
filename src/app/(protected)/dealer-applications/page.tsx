"use client";

import React from "react";
import { List, useTable, ShowButton } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Space, Table, Tag } from "antd";

import { DEALER_APP_STATUS_LABEL } from "@/lib/constants";

type DealerAppRecord = BaseRecord & {
  id: string;
  no: number;
  applicant_name: string;
  title: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
};

export default function DealerApplicationsListPage() {
  const { tableProps } = useTable<DealerAppRecord>({
    resource: "dealer_applications",
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List title="대리점 신청관리">
      <Table {...tableProps} rowKey="id" scroll={{ x: 1200 }}>
        <Table.Column<DealerAppRecord> dataIndex="no" title="NO" width={90} />
        <Table.Column<DealerAppRecord> dataIndex="applicant_name" title="신청자" width={140} />
        <Table.Column<DealerAppRecord> dataIndex="title" title="제목" />
        <Table.Column<DealerAppRecord> dataIndex="phone" title="연락처" width={160} />
        <Table.Column<DealerAppRecord> dataIndex="email" title="이메일" width={220} />
        <Table.Column<DealerAppRecord>
          dataIndex="status"
          title="상태"
          width={120}
          render={(v) => <Tag>{DEALER_APP_STATUS_LABEL[String(v)] ?? String(v)}</Tag>}
        />
        <Table.Column<DealerAppRecord> dataIndex="created_at" title="등록일" width={180} />
        <Table.Column<DealerAppRecord>
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


