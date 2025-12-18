"use client";

import React, { useEffect, useMemo } from "react";
import { Button, Select, Space, Typography } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAdminContext } from "@/contexts/AdminContext";

export function AdminHeader() {
  const router = useRouter();
  const {
    profile,
    organizations,
    selectedOrganizationId,
    setSelectedOrganizationId,
    refreshProfile,
    refreshOrganizations,
  } = useAdminContext();

  useEffect(() => {
    void refreshProfile();
    void refreshOrganizations();
  }, [refreshOrganizations, refreshProfile]);

  const canSwitchOrg = profile?.role === "admin";

  const orgOptions = useMemo(
    () =>
      organizations.map((o) => ({
        label: `${o.name} (${o.code})`,
        value: o.id,
      })),
    [organizations],
  );

  const onLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        width: "100%",
      }}
    >
      <Space size="middle">
        <Typography.Text strong>KUGS WORLD Admin</Typography.Text>
        <Select
          style={{ width: 260 }}
          placeholder="조직 선택"
          options={orgOptions}
          value={selectedOrganizationId ?? undefined}
          disabled={!canSwitchOrg}
          onChange={(v) => setSelectedOrganizationId(v)}
        />
      </Space>

      <Space>
        <Typography.Text type="secondary">
          {profile ? `${profile.name} (${profile.login_id})` : ""}
        </Typography.Text>
        <Button icon={<LogoutOutlined />} onClick={onLogout}>
          로그아웃
        </Button>
      </Space>
    </div>
  );
}





