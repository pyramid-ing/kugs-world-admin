"use client";

import React, { useMemo, useState } from "react";
import { Create, useForm } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Button, Card, Checkbox, Form, Input, Select, Space, Typography, Upload, message } from "antd";
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

type BranchForm = Omit<BranchRecord, "id">;

function extractCreatedId(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const data = (result as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;

  const direct = (data as { id?: unknown }).id;
  if (typeof direct === "string" || typeof direct === "number") return String(direct);

  const nested = (data as { data?: unknown }).data;
  if (!nested || typeof nested !== "object") return null;
  const nestedId = (nested as { id?: unknown }).id;
  if (typeof nestedId === "string" || typeof nestedId === "number") return String(nestedId);

  return null;
}

export default function BranchCreatePage() {
  const { formProps, saveButtonProps, onFinish } = useForm<BranchForm, HttpError>({
    resource: "branches",
    redirect: "edit",
  });

  const { options: branchTypeOptions, isLoading: isLoadingBranchTypes } = useCodeOptions([...CODE_MASTER_KEY_CANDIDATES.branchType]);
  const { options: sidoOptions, isLoading: isLoadingSido } = useCodeOptions([...CODE_MASTER_KEY_CANDIDATES.regionSido]);
  const { options: sigunguOptionsAll, isLoading: isLoadingSigungu } = useCodeOptions([...CODE_MASTER_KEY_CANDIDATES.regionSigungu]);

  const selectedSidoId = Form.useWatch("region_sido_id", formProps.form);
  const sigunguOptions = useMemo(() => {
    const sidoId = typeof selectedSidoId === "string" ? selectedSidoId : null;
    if (!sidoId) return sigunguOptionsAll;
    // meta에 parent_id(또는 유사 키)가 있는 경우에만 필터링
    return sigunguOptionsAll.filter((o) => {
      const parentId = getMetaParentId(o.row.meta);
      return !parentId || parentId === sidoId;
    });
  }, [selectedSidoId, sigunguOptionsAll]);

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadHint = useMemo(
    () => "지점을 먼저 저장한 뒤, 선택된 이미지를 Storage 업로드 후 branch_images에 자동 등록합니다.",
    [],
  );

  const handleFinish = async (values: unknown) => {
    const payload = (values ?? {}) as BranchForm;
    const res = await onFinish?.(payload);
    // refine의 onFinish 반환은 환경에 따라 다르므로, 직접 ID를 다시 꺼내옵니다.
    const createdId = extractCreatedId(res);
    if (!createdId) return res;

    if (fileList.length === 0) return res;

    setIsUploading(true);
    try {
      const files = fileList
        .map((f) => f.originFileObj as File | undefined)
        .filter((f): f is File => Boolean(f));
      const metas = files.map((f) => {
        const name = f.name ?? "";
        const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
        return { ext: ext || undefined, contentType: f.type || undefined };
      });
      const { uploads } = await adminApi.branchSignedUpload(createdId, metas);
      if (!uploads || uploads.length !== files.length) throw new Error("signed_upload 응답이 올바르지 않습니다.");

      for (let i = 0; i < uploads.length; i++) {
        await uploadToSignedUrl({ signedUrl: uploads[i].signed_url, file: files[i], contentType: files[i].type });
      }
      await adminApi.branchFinalizeImages(
        createdId,
        uploads.map((u) => u.path),
      );

      message.success("이미지 업로드 완료");
    } catch (e: unknown) {
      console.warn(e);
      message.error(getErrorMessage(e) ?? "이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }

    return res;
  };

  return (
    <Create
      title="대리점 등록"
      saveButtonProps={{
        ...saveButtonProps,
        loading: Boolean(saveButtonProps?.loading) || isUploading,
      }}
    >
      <Card>
        <Form
          {...formProps}
          layout="vertical"
          onFinish={(values: unknown) => handleFinish(values)}
          initialValues={{ is_visible: true }}
        >
          <Form.Item label="구분(branch_type_id)" name="branch_type_id" rules={[{ required: true }]}>
            <Select
              placeholder="구분 선택"
              loading={isLoadingBranchTypes}
              options={branchTypeOptions}
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) => String(option?.label ?? "").toLowerCase().includes(String(input).toLowerCase())}
            />
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

          <DividerBlock />

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
            <Input placeholder="카카오 주소검색 연동 전까지는 텍스트 입력" />
          </Form.Item>
          <Form.Item label="상세주소" name="address_detail">
            <Input />
          </Form.Item>
          <Form.Item label="비고(memo)" name="memo">
            <Input.TextArea rows={3} />
          </Form.Item>

          <DividerBlock />

          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            {uploadHint}
          </Typography.Paragraph>
          <Upload
            multiple
            listType="picture"
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: next }) => setFileList(next)}
          >
            <Button>이미지 선택</Button>
          </Upload>
        </Form>
      </Card>
    </Create>
  );
}

function DividerBlock() {
  return <div style={{ height: 12 }} />;
}


