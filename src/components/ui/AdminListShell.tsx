"use client";

import React from "react";
import { Card, Space, Typography } from "antd";

export function AdminListShell(props: {
  title: string;
  right?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="kw-page-header">
        <Typography.Text className="kw-page-title">{props.title}</Typography.Text>
        {props.right ? <Space>{props.right}</Space> : null}
      </div>

      {props.filters ? <div className="kw-filter-bar">{props.filters}</div> : null}

      <Card className="kw-card kw-table" styles={{ body: { padding: 0 } }}>
        {props.children}
      </Card>
    </div>
  );
}


