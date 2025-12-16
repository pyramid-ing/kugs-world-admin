"use client";

import React from "react";
import { List, useTable, ShowButton } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Space, Table } from "antd";

type PartnershipRecord = BaseRecord & {
  id: string;
  no: number;
  name: string;
  phone: string;
  email: string;
  message: string;
  created_at: string;
};

export default function PartnershipListPage() {
  const { tableProps } = useTable<PartnershipRecord>({
    resource: "partnership_inquiries",
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List title="사업제휴">
      <Table {...tableProps} rowKey="id" scroll={{ x: 1200 }}>
        <Table.Column<PartnershipRecord> dataIndex="no" title="NO" width={90} />
        <Table.Column<PartnershipRecord> dataIndex="name" title="성함" width={140} />
        <Table.Column<PartnershipRecord> dataIndex="phone" title="연락처" width={160} />
        <Table.Column<PartnershipRecord> dataIndex="email" title="이메일" width={220} />
        <Table.Column<PartnershipRecord> dataIndex="message" title="전달사항" />
        <Table.Column<PartnershipRecord> dataIndex="created_at" title="등록일" width={180} />
        <Table.Column<PartnershipRecord>
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


