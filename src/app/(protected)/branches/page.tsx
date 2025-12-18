"use client";

import React from "react";
import { useTable } from "@refinedev/antd";
import type { BaseRecord, CrudFilters, HttpError } from "@refinedev/core";
import { useDeleteMany } from "@refinedev/core";
import type { TablePaginationConfig } from "antd";
import { Button, Form, Input, Select, Space, Table, Tag, Typography, message } from "antd";

import { AdminListShell } from "@/components/ui/AdminListShell";
import { getErrorMessage } from "@/lib/errors";
import { BranchUpsertModal } from "@/components/branches/BranchUpsertModal";
import { CODE_MASTER_KEY_CANDIDATES, useCodeOptions } from "@/lib/codebook";

type BranchRecord = BaseRecord & {
  id: string;
  branch_type_id: string;
  name: string;
  owner_name: string | null;
  phone: string | null;
  is_visible: boolean;
  created_at: string;
  memo?: string | null;
};

type BranchSearchValues = {
  branch_type_id?: string;
  q?: string;
};

export default function BranchesListPage() {
  const { options: branchTypeOptions, isLoading: isLoadingBranchTypes, labelById: branchTypeLabelById } = useCodeOptions([
    ...CODE_MASTER_KEY_CANDIDATES.branchType,
  ]);
  const { tableProps, searchFormProps, tableQuery } = useTable<BranchRecord, HttpError, BranchSearchValues>({
    resource: "branches",
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    onSearch: (values: BranchSearchValues): CrudFilters => {
      const filters: CrudFilters = [];
      if (values?.branch_type_id && values.branch_type_id !== "all") {
        filters.push({ field: "branch_type_id", operator: "eq", value: values.branch_type_id });
      }
      if (values?.q) {
        // supabaseDataProvider에서 안전하게 동작하도록 우선 name 기준 contains로 연결
        filters.push({ field: "name", operator: "contains", value: String(values.q) });
      }
      return filters;
    },
  });

  const { mutateAsync: deleteManyAsync, isPending: isDeleting } = useDeleteMany();
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"create" | "edit">("create");
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    setModalMode("edit");
    setEditingId(id);
    setModalOpen(true);
  };

  const onDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await deleteManyAsync({ resource: "branches", ids: selectedRowKeys.map(String) });
      message.success("선택한 항목을 삭제했습니다.");
      setSelectedRowKeys([]);
      await tableQuery.refetch();
    } catch (e: unknown) {
      console.warn(e);
      message.error(getErrorMessage(e) ?? "삭제에 실패했습니다.");
    }
  };

  const pagination = tableProps.pagination as TablePaginationConfig | undefined;
  const current = Number(pagination?.current ?? 1);
  const pageSize = Number(pagination?.pageSize ?? 20);

  return (
    <AdminListShell
      title="대리점 관리"
      right={
        <Button type="primary" onClick={openCreate}>
          + 대리점 등록
        </Button>
      }
      filters={
        <>
          <div className="kw-filter-left">
            <Button danger disabled={selectedRowKeys.length === 0} loading={isDeleting} onClick={onDeleteSelected}>
              삭제
            </Button>
            <Form {...searchFormProps} layout="inline" style={{ gap: 8 }}>
              <Form.Item name="branch_type_id" initialValue="all" style={{ marginBottom: 0 }}>
                <Select
                  style={{ width: 140 }}
                  loading={isLoadingBranchTypes}
                  options={[{ label: "전체", value: "all" }, ...branchTypeOptions]}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item name="q" style={{ marginBottom: 0 }}>
                <Input style={{ width: 260 }} placeholder="검색어 입력(지점명)" allowClear />
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
        scroll={{ x: 1200 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          ...(pagination ?? {}),
          showSizeChanger: false,
        }}
      >
        <Table.Column<BranchRecord>
          title="NO"
          width={90}
          render={(_, __, index) => (current - 1) * pageSize + index + 1}
        />
        <Table.Column<BranchRecord>
          dataIndex="branch_type_id"
          title="구분"
          width={120}
          render={(v) => {
            const id = String(v ?? "");
            const label = branchTypeLabelById.get(id);
            return label ? <Tag>{label}</Tag> : <Typography.Text code>{id}</Typography.Text>;
          }}
        />
        <Table.Column<BranchRecord> dataIndex="name" title="지점명" />
        <Table.Column<BranchRecord> dataIndex="id" title="ID" width={160} />
        <Table.Column<BranchRecord> dataIndex="owner_name" title="대표자명" width={140} />
        <Table.Column<BranchRecord> dataIndex="phone" title="대표 전화번호" width={160} />
        <Table.Column<BranchRecord>
          title="지점 이미지"
          width={140}
          render={() => <div style={{ width: 56, height: 56, borderRadius: 8, border: "1px solid #eef2f7" }} />}
        />
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
              <Button size="small" onClick={() => openEdit(String(record.id))}>
                수정
              </Button>
            </Space>
          )}
        />
      </Table>

      {modalOpen ? (
        <BranchUpsertModal
          open={modalOpen}
          mode={modalMode}
          branchId={editingId}
          onClose={() => setModalOpen(false)}
          onSaved={() => void tableQuery.refetch()}
        />
      ) : null}
    </AdminListShell>
  );
}


