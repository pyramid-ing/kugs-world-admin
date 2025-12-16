"use client";

import React, { useMemo, useState } from "react";
import { Create, useForm } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Button, Card, Checkbox, Form, Input, Radio, Space, Typography, Upload, message } from "antd";
import type { UploadFile } from "antd";

import { STORAGE_BUCKETS, buildStoragePath, uploadToStorage } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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

export default function BranchCreatePage() {
  const { formProps, saveButtonProps, onFinish } = useForm<BranchRecord, HttpError>({
    resource: "branches",
    redirect: "edit",
  });

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadHint = useMemo(
    () => "지점을 먼저 저장한 뒤, 선택된 이미지를 Storage 업로드 후 branch_images에 자동 등록합니다.",
    [],
  );

  const handleFinish = async (values: any) => {
    const res = await onFinish?.(values);
    // refine의 onFinish 반환은 환경에 따라 다르므로, 직접 ID를 다시 꺼내옵니다.
    const createdId = (res as any)?.data?.id ?? (res as any)?.data?.data?.id;
    if (!createdId) return res;

    if (fileList.length === 0) return res;

    setIsUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const origin = f.originFileObj as File | undefined;
        if (!origin) continue;
        const path = buildStoragePath(`branches/${createdId}`, origin.name);
        await uploadToStorage({ bucket: STORAGE_BUCKETS.branchImages, path, file: origin, upsert: true });
        await insertBranchImage({ branchId: createdId, path, sortOrder: i });
      }
      message.success("이미지 업로드/등록 완료");
    } catch (e: any) {
      console.warn(e);
      message.error(e?.message ? String(e.message) : "이미지 업로드에 실패했습니다.");
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
          onFinish={(values) => handleFinish(values)}
          initialValues={{ branch_type: "dealer", is_visible: true }}
        >
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

          <DividerBlock />

          <Space size="large" wrap>
            <Form.Item label="시/도" name="sido">
              <Input style={{ width: 260 }} placeholder="예: 서울" />
            </Form.Item>
            <Form.Item label="시/군/구" name="sigungu">
              <Input style={{ width: 260 }} placeholder="예: 강남구" />
            </Form.Item>
          </Space>

          <Form.Item label="주소" name="address">
            <Input placeholder="카카오 주소검색 연동 전까지는 텍스트 입력" />
          </Form.Item>
          <Form.Item label="상세주소" name="address_detail">
            <Input />
          </Form.Item>
          <Form.Item label="비고" name="note">
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


