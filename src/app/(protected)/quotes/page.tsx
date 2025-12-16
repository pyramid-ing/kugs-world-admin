"use client";

import React from "react";
import { List, useTable } from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Table, Tag, Typography } from "antd";

import { QUOTE_STATUS_LABEL } from "@/lib/constants";

type QuoteRecord = BaseRecord & {
  id: string;
  no: number;
  intake_url: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  car_number: string;
  estimated_amount: number;
  final_amount: number | null;
  status: string;
  completed_at: string | null;
};

export default function QuotesListPage() {
  const { tableProps } = useTable<QuoteRecord>({
    resource: "quote_requests",
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List title="접수관리">
      <Table {...tableProps} rowKey="id" scroll={{ x: 1200 }}>
        <Table.Column<QuoteRecord> dataIndex="no" title="NO" width={90} />
        <Table.Column<QuoteRecord>
          dataIndex="intake_url"
          title="접수URL"
          width={360}
          render={(v) =>
            v ? (
              <a href={String(v)} target="_blank" rel="noreferrer">
                {String(v)}
              </a>
            ) : (
              "-"
            )
          }
        />
        <Table.Column<QuoteRecord> dataIndex="created_at" title="발송일시" width={180} />
        <Table.Column<QuoteRecord> dataIndex="customer_name" title="성함" width={120} />
        <Table.Column<QuoteRecord> dataIndex="customer_phone" title="연락처" width={140} />
        <Table.Column<QuoteRecord> dataIndex="car_number" title="차량번호" width={140} />
        <Table.Column<QuoteRecord>
          dataIndex="estimated_amount"
          title="예상견적"
          width={120}
          render={(v) => <Typography.Text>{Number(v ?? 0).toLocaleString()}</Typography.Text>}
        />
        <Table.Column<QuoteRecord>
          dataIndex="final_amount"
          title="최종견적"
          width={120}
          render={(v) => (v == null ? "-" : Number(v).toLocaleString())}
        />
        <Table.Column<QuoteRecord>
          dataIndex="completed_at"
          title="시공 완료일"
          width={180}
          render={(v) => (v ? String(v) : "-")}
        />
        <Table.Column<QuoteRecord>
          dataIndex="status"
          title="상태"
          width={110}
          render={(v) => <Tag>{QUOTE_STATUS_LABEL[String(v)] ?? String(v)}</Tag>}
        />
      </Table>
    </List>
  );
}


