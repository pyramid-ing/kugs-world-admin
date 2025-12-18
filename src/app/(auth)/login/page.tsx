"use client";

import React, { useState } from "react";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginForm = {
  email: string;
  password: string;
};

function getSupabaseHostHint(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).host;
  } catch {
    return raw;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabaseHostHint = getSupabaseHostHint();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const email = String(values.email ?? "").trim();
      const password = String(values.password ?? "");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.code === "invalid_credentials") {
          message.error(
            `로그인 실패: 이메일/비밀번호가 일치하지 않거나, 다른 Supabase 프로젝트로 연결되어 있습니다.${
              supabaseHostHint ? ` (현재: ${supabaseHostHint})` : ""
            }`,
          );
        } else {
          message.error(error.message || "로그인에 실패했습니다. 이메일/비밀번호를 확인해주세요.");
        }
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
            rules={[
              { required: true, message: "이메일을 입력해주세요." },
              { type: "email", message: "이메일 형식이 올바르지 않습니다. (아이디(login_id)로는 로그인할 수 없습니다.)" },
            ]}
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
        {supabaseHostHint ? (
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            연결된 Supabase: <code>{supabaseHostHint}</code>
          </Typography.Paragraph>
        ) : null}
      </Card>
    </div>
  );
}


