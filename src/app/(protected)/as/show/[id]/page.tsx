"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Show, RefreshButton } from "@refinedev/antd";
import { useShow, useUpdate } from "@refinedev/core";
import { Button, Card, Descriptions, Divider, Image, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";

import { AS_STATUS_LABEL } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { STORAGE_BUCKETS, createSignedUrls } from "@/lib/storage";

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
  path?: string | null;
  storage_path?: string | null;
  file_path?: string | null;
  url?: string | null;
  public_url?: string | null;
  sort_order?: number | null;
  created_at?: string;
};

function pickImagePath(row: ImageRow) {
  return row.path ?? row.storage_path ?? row.file_path ?? null;
}

async function fetchAsImages(asRequestId: string): Promise<ImageRow[]> {
  const supabase = getSupabaseBrowserClient();
  const candidates: Array<{ field: string; value: string }> = [
    { field: "as_request_id", value: asRequestId },
    { field: "request_id", value: asRequestId },
    { field: "as_id", value: asRequestId },
  ];

  for (const c of candidates) {
    try {
      const { data, error } = await supabase
        .from("as_request_images")
        .select("id, path, storage_path, file_path, url, public_url, sort_order, created_at")
        .eq(c.field, c.value)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ImageRow[];
    } catch {
      // 컬럼이 없거나 권한 문제일 수 있음 → 다음 후보로 시도
      continue;
    }
  }

  return [];
}

async function fetchLatestQuoteUrlByCarNumber(carNumber?: string | null) {
  if (!carNumber) return null;
  const supabase = getSupabaseBrowserClient();
  try {
    const { data, error } = await supabase
      .from("quote_requests")
      .select("intake_url, created_at")
      .eq("car_number", carNumber)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.intake_url ? String(data.intake_url) : null;
  } catch {
    return null;
  }
}

export default function AsShowPage({ params }: { params: { id: string } }) {
  const { queryResult } = useShow<AsRecord>({ resource: "as_requests", id: params.id });
  const record = queryResult.data?.data;

  const { mutateAsync: updateAsync, isLoading: isUpdating } = useUpdate();

  const [images, setImages] = useState<ImageRow[]>([]);
  const [signedMap, setSignedMap] = useState<Record<string, string | null>>({});
  const [quoteUrl, setQuoteUrl] = useState<string | null>(null);

  const status = String(record?.status ?? "");
  const statusLabel = AS_STATUS_LABEL[status] ?? status;

  const refreshImages = useCallback(async () => {
    if (!record?.id) return;
    const rows = await fetchAsImages(record.id);
    setImages(rows);

    const paths = rows.map(pickImagePath).filter((p): p is string => Boolean(p));
    if (paths.length === 0) {
      setSignedMap({});
      return;
    }
    const map = await createSignedUrls({ bucket: STORAGE_BUCKETS.asImages, paths });
    setSignedMap(map);
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
    } catch (e: any) {
      console.warn(e);
      message.error(e?.message ? String(e.message) : "시트 발송에 실패했습니다.");
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
    } catch (e: any) {
      console.warn(e);
      message.error(e?.message ? String(e.message) : "시공완료 처리에 실패했습니다.");
    }
  };

  const previewItems = useMemo(() => {
    return images
      .map((row) => {
        const direct = row.public_url ?? row.url ?? null;
        const path = pickImagePath(row);
        const signed = path ? signedMap[path] : null;
        const src = signed ?? direct;
        return src ? { id: row.id, src } : null;
      })
      .filter((v): v is { id: string; src: string } => Boolean(v));
  }, [images, signedMap]);

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
        <Descriptions bordered size="small" column={2}>
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
                <Image key={it.id} src={it.src} width={140} height={140} style={{ objectFit: "cover" }} />
              ))}
            </Space>
          </Image.PreviewGroup>
        )}
      </Card>
    </Show>
  );
}


