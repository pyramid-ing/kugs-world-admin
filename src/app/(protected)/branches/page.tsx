"use client";

import React from "react";
import { List, useTable, CreateButton, EditButton } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Space, Table, Tag } from "antd";

type BranchRecord = BaseRecord & {
  id: string;
  branch_type: string;
  name: string;
  owner_name: string | null;
  phone: string | null;
  is_visible: boolean;
  created_at: string;
};

export default function BranchesListPage() {
  const { tableProps } = useTable<BranchRecord>({
    resource: "branches",
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List title="대리점관리" headerButtons={<CreateButton />}>
      <Table {...tableProps} rowKey="id" scroll={{ x: 1100 }}>
        <Table.Column<BranchRecord>
          dataIndex="branch_type"
          title="구분"
          width={120}
          render={(v) => (String(v) === "hq" ? "본점" : "대리점")}
        />
        <Table.Column<BranchRecord> dataIndex="name" title="지점명" />
        <Table.Column<BranchRecord> dataIndex="owner_name" title="대표자명" width={140} />
        <Table.Column<BranchRecord> dataIndex="phone" title="대표 전화번호" width={160} />
        <Table.Column<BranchRecord>
          dataIndex="is_visible"
          title="노출여부"
          width={120}
          render={(v) => (v ? <Tag color="green">여</Tag> : <Tag color="red">부</Tag>)}
        />
        <Table.Column<BranchRecord> dataIndex="created_at" title="등록일" width={180} />
        <Table.Column<BranchRecord>
          title="작업"
          key="actions"
          fixed="right"
          width={110}
          render={(_, record) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}


