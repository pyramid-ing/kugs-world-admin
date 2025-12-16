"use client";

import React, { useMemo, useState } from "react";
import { Create, useSelect } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import { Alert, Form, Input, Select, Switch, Typography, message } from "antd";

import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useAdminContext } from "@/contexts/AdminContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CreateAdminInput = {
  name: string;
  login_id: string;
  email: string;
  role: "admin" | "dealer_admin";
  branch_id?: string | null;
  active: boolean;
};

export default function AdminUsersCreatePage() {
  const { list } = useNavigation();
  const { selectedOrganizationId } = useAdminContext();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<CreateAdminInput>();

  const { selectProps: branchSelectProps } = useSelect({
    resource: "branches",
    optionLabel: "name",
    optionValue: "id",
  });

  const role = Form.useWatch("role", form);
  const isDealer = role === "dealer_admin";

  const initialValues = useMemo<CreateAdminInput>(
    () => ({ name: "", login_id: "", email: "", role: "dealer_admin", branch_id: null, active: true }),
    [],
  );

  const onFinish = async (values: CreateAdminInput) => {
    if (!selectedOrganizationId) {
      message.error("조직을 선택해주세요.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.functions.invoke("admin_create_user", {
        body: {
          organization_id: selectedOrganizationId,
          ...values,
          branch_id: values.role === "dealer_admin" ? values.branch_id ?? null : null,
        },
      });
      if (error) {
        console.warn("[admin_create_user] failed", error);
        message.error("계정 생성에 실패했습니다. (Edge Function 설정/권한 확인)");
        return;
      }
      message.success("계정이 생성되었습니다. (초기 비밀번호: 1234)");
      list("admin_profiles");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireAdmin>
      <Create title="관리자 등록" saveButtonProps={{ loading, onClick: () => form.submit() }}>
        <Alert
          type="info"
          showIcon
          message="초기 비밀번호는 1234로 설정됩니다."
          description="계정 생성은 Edge Function(service_role)로 처리됩니다."
          style={{ marginBottom: 16 }}
        />

        <Form<CreateAdminInput>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={initialValues}
          onFinish={onFinish}
        >
          <Form.Item name="name" label="성함" rules={[{ required: true, message: "성함을 입력해주세요." }]}>
            <Input placeholder="홍길동" />
          </Form.Item>

          <Form.Item
            name="login_id"
            label="userId"
            rules={[{ required: true, message: "userId(로그인 ID)를 입력해주세요." }]}
          >
            <Input placeholder="kugs_admin01" />
          </Form.Item>

          <Form.Item
            name="email"
            label="이메일(로그인용)"
            rules={[
              { required: true, message: "이메일을 입력해주세요." },
              { type: "email", message: "이메일 형식이 올바르지 않습니다." },
            ]}
          >
            <Input placeholder="admin@example.com" />
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
            저장 버튼을 누르면 계정이 생성되며, 최초 비밀번호는 <b>1234</b>입니다.
          </Typography.Paragraph>
        </Form>
      </Create>
    </RequireAdmin>
  );
}


