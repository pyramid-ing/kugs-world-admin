"use client";

import React, { useEffect, useMemo } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { ThemedLayoutV2, ErrorComponent, useNotificationProvider } from "@refinedev/antd";
import { ConfigProvider } from "antd";
import koKR from "antd/locale/ko_KR";
import { DashboardOutlined, ShopOutlined, UserOutlined, FormOutlined, ToolOutlined } from "@ant-design/icons";

import { getDataProvider } from "@/providers/refine/dataProvider";
import { useAuthProvider } from "@/providers/refine/authProvider";
import { AdminHeader } from "@/components/ui/AdminHeader";
import { useAdminContext } from "@/contexts/AdminContext";

export function RefineRoot({ children }: { children: React.ReactNode }) {
  const notificationProvider = useNotificationProvider();
  const authProvider = useAuthProvider();
  const { refreshProfile, refreshOrganizations, profile, selectedOrganizationId } = useAdminContext();

  useEffect(() => {
    void refreshProfile();
    void refreshOrganizations();
  }, [refreshOrganizations, refreshProfile]);

  const dataProvider = useMemo(
    () =>
      getDataProvider({
        selectedOrganizationId,
        profile,
      }),
    [profile, selectedOrganizationId],
  );

  const resources = useMemo(() => {
    const base = [
      {
        name: "dashboard",
        list: "/dashboard",
        meta: { label: "대시보드", icon: <DashboardOutlined /> },
      },
      {
        name: "quote_requests",
        list: "/quotes",
        show: "/quotes/show/:id",
        meta: { label: "접수관리", icon: <FormOutlined /> },
      },
      {
        name: "as_requests",
        list: "/as",
        show: "/as/show/:id",
        meta: { label: "A/S관리", icon: <ToolOutlined /> },
      },
      {
        name: "branches",
        list: "/branches",
        create: "/branches/create",
        edit: "/branches/edit/:id",
        meta: { label: "대리점관리", icon: <ShopOutlined /> },
      },
    ];

    if (profile?.role === "admin") {
      return [
        base[0],
        {
          name: "admin_profiles",
          list: "/admin-users",
          create: "/admin-users/create",
          edit: "/admin-users/edit/:id",
          meta: { label: "관리자계정관리", icon: <UserOutlined /> },
        },
        ...base.slice(1),
        {
          name: "dealer_applications",
          list: "/dealer-applications",
          show: "/dealer-applications/show/:id",
          meta: { label: "대리점 신청관리", icon: <FormOutlined /> },
        },
        {
          name: "partnership_inquiries",
          list: "/partnership",
          show: "/partnership/show/:id",
          meta: { label: "사업제휴", icon: <FormOutlined /> },
        },
      ];
    }

    return base;
  }, [profile?.role]);

  return (
    <ConfigProvider locale={koKR}>
      <Refine
        routerProvider={routerProvider}
        dataProvider={dataProvider}
        authProvider={authProvider}
        notificationProvider={notificationProvider}
        resources={resources}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <Authenticated key="protected" redirectOnFail="/login">
          <ThemedLayoutV2 Header={AdminHeader}>{children}</ThemedLayoutV2>
        </Authenticated>
      </Refine>
    </ConfigProvider>
  );
}


