"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, RefreshButton, useForm } from "@refinedev/antd";
import { Button, Card, Checkbox, Form, Image, Input, Select, Space, Typography, Upload, message } from "antd";
import type { UploadFile } from "antd";

import { getErrorMessage } from "@/lib/errors";
import { adminApi, uploadToSignedUrl } from "@/lib/restApi";
import { CODE_MASTER_KEY_CANDIDATES, getMetaParentId, useCodeOptions } from "@/lib/codebook";

type BranchRecord = {
  id: string;
  branch_type_id: string;
  name: string;
  owner_name?: string | null;
  phone?: string | null;
  is_visible?: boolean;
  region_sido_id?: string | null;
  region_sigungu_id?: string | null;
  address?: string | null;
  address_detail?: string | null;
  memo?: string | null;
};

type ImageRow = {
  id: string;
  path: string;
  signed_url: string | null;
  sort_order: number;
  created_at: string;
  sign_error?: string | null;
};

async function fetchBranchImages(branchId: string): Promise<ImageRow[]> {
  const res = await adminApi.getBranchImages(branchId, 3600);
  return (res.images ?? []).map((it) => ({
    id: it.id,
    path: it.path,
    signed_url: it.signed_url,
    sort_order: it.sort_order,
    created_at: it.created_at,
    sign_error: it.sign_error,
  }));
}

export default function BranchEditPage({ params }: { params: { id: string } }) {
  const { formProps, saveButtonProps, queryResult } = useForm<BranchRecord>({
    resource: "branches",
    id: params.id,
  });

  const branch = queryResult?.data?.data;
  const mergedInitialValues = useMemo(() => {
    const base = (formProps as unknown as { initialValues?: unknown }).initialValues;
    const obj = base && typeof base === "object" ? (base as Record<string, unknown>) : {};
    return {
      ...obj,
      is_visible: typeof obj.is_visible === "boolean" ? obj.is_visible : true,
    } as Partial<BranchRecord>;
  }, [formProps]);

  const { options: branchTypeOptions, isLoading: isLoadingBranchTypes, labelById: branchTypeLabelById } = useCodeOptions([
    ...CODE_MASTER_KEY_CANDIDATES.branchType,
  ]);
  const { options: sidoOptions, isLoading: isLoadingSido } = useCodeOptions([...CODE_MASTER_KEY_CANDIDATES.regionSido]);
  const { options: sigunguOptionsAll, isLoading: isLoadingSigungu } = useCodeOptions([...CODE_MASTER_KEY_CANDIDATES.regionSigungu]);

  const selectedSidoId = Form.useWatch("region_sido_id", formProps.form);
  const sigunguOptions = useMemo(() => {
    const sidoId = typeof selectedSidoId === "string" ? selectedSidoId : null;
    if (!sidoId) return sigunguOptionsAll;
    return sigunguOptionsAll.filter((o) => {
      const parentId = getMetaParentId(o.row.meta);
      return !parentId || parentId === sidoId;
    });
  }, [selectedSidoId, sigunguOptionsAll]);

  const [images, setImages] = useState<ImageRow[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshImages = useCallback(async () => {
    if (!params.id) return;
    const rows = await fetchBranchImages(params.id);
    setImages(rows);
  }, [params.id]);

  useEffect(() => {
    void refreshImages();
  }, [refreshImages]);

  const previewItems = useMemo(() => {
    return images
      .map((row) => {
        const src = row.signed_url;
        return src ? { id: row.id, src, sort_order: row.sort_order ?? 0 } : null;
      })
      .filter((v): v is { id: string; src: string; sort_order: number } => Boolean(v));
  }, [images]);

  const onUpload = async () => {
    if (!params.id) return;
    if (fileList.length === 0) return;
    setBusy(true);
    try {
      const files = fileList
        .map((f) => f.originFileObj as File | undefined)
        .filter((f): f is File => Boolean(f));
      const metas = files.map((f) => {
        const name = f.name ?? "";
        const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
        return { ext: ext || undefined, contentType: f.type || undefined };
      });
      const { uploads } = await adminApi.branchSignedUpload(params.id, metas);
      if (!uploads || uploads.length !== files.length) throw new Error("signed_upload 응답이 올바르지 않습니다.");

      for (let i = 0; i < uploads.length; i++) {
        await uploadToSignedUrl({ signedUrl: uploads[i].signed_url, file: files[i], contentType: files[i].type });
      }
      await adminApi.branchFinalizeImages(
        params.id,
        uploads.map((u) => u.path),
      );

      setFileList([]);
      message.success("업로드/등록 완료");
      await refreshImages();
    } catch (e: unknown) {
      console.warn(e);
      message.error(getErrorMessage(e) ?? "업로드에 실패했습니다.");
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
        <Form {...formProps} layout="vertical" initialValues={mergedInitialValues}>
          <Form.Item label="구분(branch_type_id)" name="branch_type_id" rules={[{ required: true }]}>
            <Select
              placeholder="구분 선택"
              loading={isLoadingBranchTypes}
              options={branchTypeOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          {branch?.branch_type_id ? (
            <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
              현재 구분: {branchTypeLabelById.get(String(branch.branch_type_id)) ?? String(branch.branch_type_id)}
            </Typography.Paragraph>
          ) : null}

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
            <Form.Item label="지역(시/도) region_sido_id" name="region_sido_id">
              <Select
                style={{ width: 260 }}
                placeholder="시/도 선택"
                allowClear
                loading={isLoadingSido}
                options={sidoOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item label="지역(시/군/구) region_sigungu_id" name="region_sigungu_id">
              <Select
                style={{ width: 260 }}
                placeholder="시/군/구 선택"
                allowClear
                loading={isLoadingSigungu}
                options={sigunguOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Space>

          <Form.Item label="주소" name="address">
            <Input />
          </Form.Item>
          <Form.Item label="상세주소" name="address_detail">
            <Input />
          </Form.Item>
          <Form.Item label="비고(memo)" name="memo">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Card>

      <Card title={`이미지 (${previewItems.length})`} style={{ marginTop: 16 }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          새 이미지 선택 → “업로드” 클릭 시 Signed Upload → Finalize API로 등록됩니다.
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
              {previewItems.map((it) => (
                <Card
                  key={it.id}
                  size="small"
                  style={{ width: 170 }}
                  styles={{ body: { padding: 8 } }}
                >
                  <Image alt="지점 이미지" src={it.src} width={150} height={150} style={{ objectFit: "cover" }} />
                </Card>
              ))}
            </Space>
          </Image.PreviewGroup>
        )}
      </Card>
    </Edit>
  );
}


