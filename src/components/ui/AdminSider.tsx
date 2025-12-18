"use client";

import React from "react";
import { Layout, Menu, theme } from "antd";
import type { MenuProps } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import {
  useLink,
  useLogout,
  useMenu,
  useTitle,
  useTranslate,
  useIsExistAuthentication,
  type ITreeMenu,
} from "@refinedev/core";
import type { RefineThemedLayoutV2SiderProps } from "@refinedev/antd";

export const AdminSider: React.FC<RefineThemedLayoutV2SiderProps> = ({ Title, meta }) => {
  const { token } = theme.useToken();
  const Link = useLink();
  const translate = useTranslate();

  const { menuItems, selectedKey, defaultOpenKeys } = useMenu({ meta });

  const isExistAuthentication = useIsExistAuthentication();
  const { mutate: logout } = useLogout();

  const TitleFromHook = useTitle();

  const toMenuItems = (items: ITreeMenu[]): NonNullable<MenuProps["items"]> => {
    return items.map((it) => {
      const hasChildren = it.children?.length > 0;
      if (hasChildren) {
        return {
          key: it.key,
          icon: it.icon ?? undefined,
          label: it.label,
          children: toMenuItems(it.children ?? []),
        };
      }
      return {
        key: it.key,
        icon: it.icon ?? undefined,
        label: <Link to={it.route ?? ""}>{it.label}</Link>,
      };
    }) as NonNullable<MenuProps["items"]>;
  };

  const items: MenuProps["items"] = [
    ...(toMenuItems(menuItems) ?? []),
    ...(isExistAuthentication
      ? [
          { type: "divider" as const },
          {
            key: "logout",
            icon: <LogoutOutlined />,
            label: translate("buttons.logout", "Logout"),
            onClick: () => logout(),
          },
        ]
      : []),
  ];

  return (
    <Layout.Sider
      width={220}
      style={{
        background: "#fff",
        borderRight: `1px solid ${token.colorBorder}`,
      }}
    >
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: `1px solid ${token.colorBorder}`,
          gap: 8,
          fontWeight: 700,
        }}
      >
        {Title ? <Title collapsed={false} /> : TitleFromHook ? <TitleFromHook collapsed={false} /> : <span>Admin</span>}
      </div>

      <Menu
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        defaultOpenKeys={defaultOpenKeys}
        items={items}
        style={{ border: "none", padding: 8, height: "calc(100vh - 64px)", overflow: "auto" }}
      />
    </Layout.Sider>
  );
};


