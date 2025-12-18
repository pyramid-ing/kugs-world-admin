"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Show, RefreshButton } from "@refinedev/antd";
import { useShow, useUpdate } from "@refinedev/core";
import { Button, Card, Descriptions, Divider, Image, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";

import { AS_STATUS_LABEL } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { getErrorMessage } from "@/lib/errors";
import { publicApi } from "@/lib/restApi";
import { buildQuoteIntakeUrl } from "@/lib/env";

type AsRecord = {
  id: string;
  no?: number;
  customer_name?: string;
  customer_phone?: string;
  car_number?: string;
  request_text?: string;
  status?: string;
  created_at?: string;
  scheduled_at?: string | null;
  completed_at?: string | null;
  organization_id?: string;
  branch_id?: string | null;
};

type ImageRow = {
  id: string;
  path: string;
  signed_url: string | null;
  created_at: string;
  sign_error?: string | null;
};

async function fetchAsImages(asRequestId: string): Promise<ImageRow[]> {
  const res = await publicApi.getAsImages(asRequestId, 3600);
  return (res.images ?? []).map((it) => ({
    id: it.id,
    path: it.path,
    signed_url: it.signed_url,
    created_at: it.created_at,
    sign_error: it.sign_error,
  }));
}

async function fetchLatestQuoteUrlByCarNumber(carNumber?: string | null) {
  if (!carNumber) return null;
  const supabase = getSupabaseBrowserClient();
  try {
    const { data, error } = await supabase
      .from("quote_requests")
      // 테이블 스키마 기준: uuid/intake_url 컬럼이 없는 환경이 있어 id 기반으로 URL 생성합니다.
      .select("id, created_at")
      .eq("car_number", carNumber)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.id ? buildQuoteIntakeUrl(String(data.id)) : null;
  } catch {
    return null;
  }
}

export default function AsShowPage({ params }: { params: { id: string } }) {
  const { queryResult } = useShow<AsRecord>({ resource: "as_requests", id: params.id });
  const record = queryResult.data?.data;

  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdate();

  const [images, setImages] = useState<ImageRow[]>([]);
  const [quoteUrl, setQuoteUrl] = useState<string | null>(null);

  const status = String(record?.status ?? "");
  const statusLabel = AS_STATUS_LABEL[status] ?? status;

  const refreshImages = useCallback(async () => {
    if (!record?.id) return;
    const rows = await fetchAsImages(record.id);
    setImages(rows);
  }, [record?.id]);

  useEffect(() => {
    void refreshImages();
  }, [refreshImages]);

  useEffect(() => {
    void (async () => {
      const url = await fetchLatestQuoteUrlByCarNumber(record?.car_number ?? null);
      setQuoteUrl(url);
    })();
  }, [record?.car_number]);

  const canDispatchSheet = status === "waiting";
  const canComplete = status === "scheduled";

  const onDispatchSheet = async () => {
    if (!record?.id) return;
    try {
      await invokeEdgeFunction("dispatch_sheet", { as_request_id: record.id });
      await updateAsync({
        resource: "as_requests",
        id: record.id,
        values: {
          status: "scheduled",
          scheduled_at: dayjs().toISOString(),
        },
      });
      message.success("시트 발송 처리 완료");
      await queryResult.refetch();
    } catch (e: unknown) {
      console.warn(e);
      message.error(getErrorMessage(e) ?? "시트 발송에 실패했습니다.");
    }
  };

  const onComplete = async () => {
    if (!record?.id) return;
    try {
      await updateAsync({
        resource: "as_requests",
        id: record.id,
        values: {
          status: "completed",
          completed_at: dayjs().toISOString(),
        },
      });
      message.success("시공완료 처리 완료");
      await queryResult.refetch();
    } catch (e: unknown) {
      console.warn(e);
      message.error(getErrorMessage(e) ?? "시공완료 처리에 실패했습니다.");
    }
  };

  const previewItems = useMemo(() => {
    return images
      .map((row) => {
        const src = row.signed_url;
        return src ? { id: row.id, src } : null;
      })
      .filter((v): v is { id: string; src: string } => Boolean(v));
  }, [images]);

  return (
    <Show
      title="A/S 상세"
      headerButtons={({ refreshButtonProps }) => (
        <Space>
          <RefreshButton {...refreshButtonProps} />
          <Button onClick={refreshImages}>이미지 새로고침</Button>
        </Space>
      )}
    >
      <Card>
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="NO">{record?.no ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="상태">
            <Tag>{statusLabel}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="성함">{record?.customer_name ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="연락처">{record?.customer_phone ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="차량번호">{record?.car_number ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="접수일">{record?.created_at ? String(record.created_at) : "-"}</Descriptions.Item>
          <Descriptions.Item label="시공확정일">{record?.scheduled_at ? String(record.scheduled_at) : "-"}</Descriptions.Item>
          <Descriptions.Item label="시공완료일">{record?.completed_at ? String(record.completed_at) : "-"}</Descriptions.Item>
          <Descriptions.Item label="요청사항" span={2}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>{record?.request_text ?? "-"}</Typography.Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="시공이력(접수URL)" span={2}>
            {quoteUrl ? (
              <a href={quoteUrl} target="_blank" rel="noreferrer">
                {quoteUrl}
              </a>
            ) : (
              "-"
            )}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Space>
          <Button type="primary" disabled={!canDispatchSheet} loading={isUpdating} onClick={onDispatchSheet}>
            시공확정(시트발송)
          </Button>
          <Button disabled={!canComplete} loading={isUpdating} onClick={onComplete}>
            시공완료
          </Button>
        </Space>
      </Card>

      <Divider />

      <Card title={`이미지 (${previewItems.length})`}>
        {previewItems.length === 0 ? (
          <Typography.Text type="secondary">등록된 이미지가 없습니다.</Typography.Text>
        ) : (
          <Image.PreviewGroup>
            <Space wrap>
              {previewItems.map((it) => (
                <Image
                  key={it.id}
                  alt="A/S 이미지"
                  src={it.src}
                  width={140}
                  height={140}
                  style={{ objectFit: "cover" }}
                />
              ))}
            </Space>
          </Image.PreviewGroup>
        )}
      </Card>
    </Show>
  );
}


