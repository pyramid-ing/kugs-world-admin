"use client";

import React, { useState } from "react";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        message.error("로그인에 실패했습니다. 이메일/비밀번호를 확인해주세요.");
        return;
      }
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card style={{ width: 420 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          어드민 로그인
        </Typography.Title>
        <Form<LoginForm> layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label="이메일"
            name="email"
            rules={[{ required: true, message: "이메일을 입력해주세요." }]}
          >
            <Input autoComplete="email" placeholder="admin@example.com" />
          </Form.Item>

          <Form.Item
            label="비밀번호"
            name="password"
            rules={[{ required: true, message: "비밀번호를 입력해주세요." }]}
          >
            <Input.Password autoComplete="current-password" placeholder="비밀번호" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={loading}>
            로그인
          </Button>
        </Form>

        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          최초 계정은 Supabase 대시보드에서 생성 후 <code>admin_profiles</code>를 매핑하세요.
        </Typography.Paragraph>
      </Card>
    </div>
  );
}


