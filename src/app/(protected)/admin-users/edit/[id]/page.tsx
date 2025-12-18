"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Edit, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Popconfirm, Select, Space, Switch, Typography, message } from "antd";

import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { adminApi } from "@/lib/restApi";

type AdminProfileForm = {
  user_id: string;
  name: string;
  login_id: string;
  role: "admin" | "dealer_admin";
  branch_id: string | null;
  active: boolean;
  must_change_password?: boolean;
  registered_at?: string;
};

export default function AdminUsersEditPage() {
  return (
    <RequireAdmin>
      <AdminUsersEditInner />
    </RequireAdmin>
  );
}

function AdminUsersEditInner() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");

  const { formProps, saveButtonProps } = useForm<AdminProfileForm>({
    resource: "admin_profiles",
    id,
    redirect: "list",
    meta: {
      idColumnName: "user_id",
      select: "user_id, name, login_id, role, branch_id, active, must_change_password, registered_at",
    },
  });

  const { selectProps: branchSelectProps } = useSelect({
    resource: "branches",
    optionLabel: "name",
    optionValue: "id",
  });

  const role = Form.useWatch("role", formProps.form);
  const isDealer = role === "dealer_admin";

  const onResetPassword = async () => {
    try {
      await adminApi.resetPassword(id);
      message.success("비밀번호가 1234로 초기화되었습니다.");
    } catch (e) {
      console.warn("[users/reset_password] failed", e);
      message.error("비밀번호 초기화에 실패했습니다.");
    }
  };

  return (
    <Edit
      title="관리자 수정"
      saveButtonProps={{
        ...saveButtonProps,
        onClick: () => formProps.form?.submit(),
      }}
      headerButtons={({ defaultButtons }) => (
        <Space>
          <Popconfirm
            title="비밀번호를 1234로 초기화할까요?"
            okText="초기화"
            cancelText="취소"
            onConfirm={() => void onResetPassword()}
          >
            <a>비번초기화</a>
          </Popconfirm>
          {defaultButtons}
        </Space>
      )}
    >
      <Form {...formProps} layout="vertical" requiredMark={false}>
        <Form.Item label="user_id">
          <Input value={id} disabled />
        </Form.Item>

        <Form.Item name="name" label="성함" rules={[{ required: true, message: "성함을 입력해주세요." }]}>
          <Input />
        </Form.Item>

        <Form.Item name="login_id" label="userId" rules={[{ required: true, message: "userId를 입력해주세요." }]}>
          <Input />
        </Form.Item>

        <Form.Item name="role" label="역할" rules={[{ required: true, message: "역할을 선택해주세요." }]}>
          <Select
            options={[
              { label: "관리자(admin)", value: "admin" },
              { label: "대리점 관리자(dealer_admin)", value: "dealer_admin" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="branch_id"
          label="대리점"
          tooltip="dealer_admin일 때만 필요합니다."
          rules={isDealer ? [{ required: true, message: "대리점을 선택해주세요." }] : []}
          hidden={!isDealer}
        >
          <Select {...branchSelectProps} placeholder="대리점 선택" />
        </Form.Item>

        <Form.Item name="active" label="활성화" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          비밀번호 초기화 시 최초 비밀번호는 <b>1234</b>로 설정됩니다.
        </Typography.Paragraph>
      </Form>
    </Edit>
  );
}


