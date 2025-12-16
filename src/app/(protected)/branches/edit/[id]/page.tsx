"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, RefreshButton, useForm } from "@refinedev/antd";
import { Button, Card, Checkbox, Form, Image, Input, Radio, Space, Typography, Upload, message } from "antd";
import type { UploadFile } from "antd";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, buildStoragePath, createSignedUrls, uploadToStorage } from "@/lib/storage";

type BranchRecord = {
  id: string;
  branch_type: string;
  name: string;
  owner_name?: string | null;
  phone?: string | null;
  is_visible?: boolean;
  sido?: string | null;
  sigungu?: string | null;
  address?: string | null;
  address_detail?: string | null;
  note?: string | null;
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

async function fetchBranchImages(branchId: string): Promise<ImageRow[]> {
  const supabase = getSupabaseBrowserClient();
  const candidates: Array<{ field: string; value: string }> = [
    { field: "branch_id", value: branchId },
    { field: "branches_id", value: branchId },
  ];
  for (const c of candidates) {
    try {
      const { data, error } = await supabase
        .from("branch_images")
        .select("id, path, storage_path, file_path, url, public_url, sort_order, created_at")
        .eq(c.field, c.value)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ImageRow[];
    } catch {
      continue;
    }
  }
  return [];
}

async function updateImageSort(id: string, sortOrder: number) {
  const supabase = getSupabaseBrowserClient();
  const candidates: Array<Record<string, any>> = [{ sort_order: sortOrder }, { order: sortOrder }, { sort: sortOrder }];
  for (const values of candidates) {
    try {
      const { error } = await supabase.from("branch_images").update(values).eq("id", id);
      if (error) throw error;
      return;
    } catch {
      continue;
    }
  }
  throw new Error("정렬값 저장에 실패했습니다. (컬럼명/권한 확인)");
}

async function deleteImageRow(id: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("branch_images").delete().eq("id", id);
  if (error) throw error;
}

async function insertBranchImage(params: { branchId: string; path: string; sortOrder: number }) {
  const supabase = getSupabaseBrowserClient();
  const candidates: Array<Record<string, any>> = [
    { branch_id: params.branchId, path: params.path, sort_order: params.sortOrder },
    { branch_id: params.branchId, storage_path: params.path, sort_order: params.sortOrder },
    { branch_id: params.branchId, file_path: params.path, sort_order: params.sortOrder },
  ];
  for (const payload of candidates) {
    try {
      const { error } = await supabase.from("branch_images").insert(payload);
      if (error) throw error;
      return;
    } catch {
      continue;
    }
  }
  throw new Error("branch_images 저장에 실패했습니다. (컬럼명/권한 확인)");
}

export default function BranchEditPage({ params }: { params: { id: string } }) {
  const { formProps, saveButtonProps, queryResult } = useForm<BranchRecord>({
    resource: "branches",
    id: params.id,
  });

  const branch = queryResult?.data?.data;

  const [images, setImages] = useState<ImageRow[]>([]);
  const [signedMap, setSignedMap] = useState<Record<string, string | null>>({});
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshImages = useCallback(async () => {
    if (!params.id) return;
    const rows = await fetchBranchImages(params.id);
    setImages(rows);
    const paths = rows.map(pickImagePath).filter((p): p is string => Boolean(p));
    if (paths.length === 0) {
      setSignedMap({});
      return;
    }
    const map = await createSignedUrls({ bucket: STORAGE_BUCKETS.branchImages, paths });
    setSignedMap(map);
  }, [params.id]);

  useEffect(() => {
    void refreshImages();
  }, [refreshImages]);

  const previewItems = useMemo(() => {
    return images
      .map((row) => {
        const direct = row.public_url ?? row.url ?? null;
        const path = pickImagePath(row);
        const signed = path ? signedMap[path] : null;
        const src = signed ?? direct;
        return src ? { id: row.id, src, sort_order: row.sort_order ?? 0 } : null;
      })
      .filter((v): v is { id: string; src: string; sort_order: number } => Boolean(v));
  }, [images, signedMap]);

  const move = async (id: string, dir: -1 | 1) => {
    const idx = images.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= images.length) return;

    const cur = images[idx];
    const other = images[targetIdx];
    const curOrder = cur.sort_order ?? idx;
    const otherOrder = other.sort_order ?? targetIdx;

    setBusy(true);
    try {
      await updateImageSort(cur.id, otherOrder);
      await updateImageSort(other.id, curOrder);
      message.success("정렬 변경 완료");
      await refreshImages();
    } catch (e: any) {
      console.warn(e);
      message.error(e?.message ? String(e.message) : "정렬 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteImageRow(id);
      message.success("이미지 레코드 삭제 완료");
      await refreshImages();
    } catch (e: any) {
      console.warn(e);
      message.error(e?.message ? String(e.message) : "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async () => {
    if (!params.id) return;
    if (fileList.length === 0) return;
    setBusy(true);
    try {
      const baseOrder = images.length > 0 ? Math.max(...images.map((x) => x.sort_order ?? 0)) + 1 : 0;
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const origin = f.originFileObj as File | undefined;
        if (!origin) continue;
        const path = buildStoragePath(`branches/${params.id}`, origin.name);
        await uploadToStorage({ bucket: STORAGE_BUCKETS.branchImages, path, file: origin, upsert: true });
        await insertBranchImage({ branchId: params.id, path, sortOrder: baseOrder + i });
      }
      setFileList([]);
      message.success("업로드/등록 완료");
      await refreshImages();
    } catch (e: any) {
      console.warn(e);
      message.error(e?.message ? String(e.message) : "업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Edit
      title={`대리점 수정${branch?.name ? ` - ${branch.name}` : ""}`}
      saveButtonProps={{ ...saveButtonProps, loading: Boolean(saveButtonProps?.loading) || busy }}
      headerButtons={({ refreshButtonProps }) => (
        <Space>
          <RefreshButton {...refreshButtonProps} />
          <Button onClick={refreshImages}>이미지 새로고침</Button>
        </Space>
      )}
    >
      <Card>
        <Form {...formProps} layout="vertical" initialValues={{ is_visible: true }}>
          <Form.Item label="구분" name="branch_type" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="hq">본점</Radio>
              <Radio value="dealer">대리점</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="지점명" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Space size="large" wrap>
            <Form.Item label="대표자명" name="owner_name">
              <Input style={{ width: 260 }} />
            </Form.Item>
            <Form.Item label="대표 전화번호" name="phone">
              <Input style={{ width: 260 }} />
            </Form.Item>
            <Form.Item label="노출여부" name="is_visible" valuePropName="checked">
              <Checkbox>노출</Checkbox>
            </Form.Item>
          </Space>

          <Space size="large" wrap>
            <Form.Item label="시/도" name="sido">
              <Input style={{ width: 260 }} />
            </Form.Item>
            <Form.Item label="시/군/구" name="sigungu">
              <Input style={{ width: 260 }} />
            </Form.Item>
          </Space>

          <Form.Item label="주소" name="address">
            <Input />
          </Form.Item>
          <Form.Item label="상세주소" name="address_detail">
            <Input />
          </Form.Item>
          <Form.Item label="비고" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Card>

      <Card title={`이미지 (${previewItems.length})`} style={{ marginTop: 16 }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          새 이미지 선택 → “업로드” 클릭 시 Storage 업로드 후 branch_images에 등록됩니다.
        </Typography.Paragraph>
        <Space wrap>
          <Upload
            multiple
            listType="picture"
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: next }) => setFileList(next)}
          >
            <Button>이미지 선택</Button>
          </Upload>
          <Button type="primary" onClick={onUpload} loading={busy} disabled={fileList.length === 0}>
            업로드
          </Button>
        </Space>

        <div style={{ height: 12 }} />

        {previewItems.length === 0 ? (
          <Typography.Text type="secondary">등록된 이미지가 없습니다.</Typography.Text>
        ) : (
          <Image.PreviewGroup>
            <Space wrap>
              {previewItems.map((it, idx) => (
                <Card
                  key={it.id}
                  size="small"
                  style={{ width: 170 }}
                  bodyStyle={{ padding: 8 }}
                  actions={[
                    <Button key="up" size="small" onClick={() => move(it.id, -1)} disabled={busy || idx === 0}>
                      ↑
                    </Button>,
                    <Button
                      key="down"
                      size="small"
                      onClick={() => move(it.id, 1)}
                      disabled={busy || idx === previewItems.length - 1}
                    >
                      ↓
                    </Button>,
                    <Button key="del" size="small" danger onClick={() => onDelete(it.id)} disabled={busy}>
                      삭제
                    </Button>,
                  ]}
                >
                  <Image src={it.src} width={150} height={150} style={{ objectFit: "cover" }} />
                </Card>
              ))}
            </Space>
          </Image.PreviewGroup>
        )}
      </Card>
    </Edit>
  );
}


