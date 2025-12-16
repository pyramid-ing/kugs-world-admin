"use client";

import React from "react";
import { List, useTable } from "@refinedev/antd";
import { type BaseRecord, useNavigation } from "@refinedev/core";
import { Button, Popconfirm, Space, Table, Tag, Typography, message } from "antd";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

type AdminProfileRecord = BaseRecord & {
  user_id: string;
  name: string;
  login_id: string;
  role: string;
  active: boolean;
  must_change_password?: boolean;
  registered_at: string;
};

export default function AdminUsersListPage() {
  const { edit, create } = useNavigation();
  const { tableProps } = useTable<AdminProfileRecord>({
    resource: "admin_profiles",
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: "registered_at", order: "desc" }] },
    meta: {
      select:
        "user_id, name, login_id, role, active, must_change_password, registered_at, organization_id, branch_id",
    },
  });

  const onResetPassword = async (userId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.functions.invoke("admin_reset_password", {
      body: { user_id: userId },
    });
    if (error) {
      console.warn("[admin_reset_password] failed", error);
      message.error("비밀번호 초기화에 실패했습니다. (Edge Function 설정/권한 확인)");
      return;
    }
    message.success("비밀번호가 1234로 초기화되었습니다.");
  };

  return (
    <RequireAdmin>
      <List
        title="관리자계정관리"
        headerButtons={[
          <Button key="create" type="primary" onClick={() => create("admin_profiles")}>
            등록
          </Button>,
        ]}
      >
        <Table {...tableProps} rowKey="user_id">
          <Table.Column<AdminProfileRecord> dataIndex="user_id" title="ID" width={260} />
          <Table.Column<AdminProfileRecord> dataIndex="name" title="성함" width={140} />
          <Table.Column<AdminProfileRecord> dataIndex="login_id" title="userId" width={180} />
          <Table.Column<AdminProfileRecord>
            dataIndex="role"
            title="역할"
            width={140}
            render={(v) => <Typography.Text>{String(v)}</Typography.Text>}
          />
          <Table.Column<AdminProfileRecord>
            dataIndex="active"
            title="활성화"
            width={100}
            render={(v) => (v ? <Tag color="green">여</Tag> : <Tag color="red">부</Tag>)}
          />
          <Table.Column<AdminProfileRecord>
            dataIndex="must_change_password"
            title="비번변경필요"
            width={130}
            render={(v) => (v ? <Tag color="orange">필요</Tag> : <Tag>아님</Tag>)}
          />
          <Table.Column<AdminProfileRecord> dataIndex="registered_at" title="등록일" width={180} />
          <Table.Column<AdminProfileRecord>
            title="액션"
            fixed="right"
            width={220}
            render={(_, record) => (
              <Space>
                <Button onClick={() => edit("admin_profiles", record.user_id)}>수정</Button>
                <Popconfirm
                  title="비밀번호를 1234로 초기화할까요?"
                  okText="초기화"
                  cancelText="취소"
                  onConfirm={() => void onResetPassword(record.user_id)}
                >
                  <Button danger>비번초기화</Button>
                </Popconfirm>
              </Space>
            )}
          />
        </Table>
      </List>
    </RequireAdmin>
  );
}


