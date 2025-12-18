"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useForm} from "@refinedev/antd";
import type {HttpError} from "@refinedev/core";
import {useDelete} from "@refinedev/core";
import {
    Button,
    Card,
    Checkbox,
    Form,
    Image,
    Input,
    Modal,
    Popconfirm,
    Space,
    Select,
    Typography,
    Upload,
    message,
} from "antd";
import type {UploadFile} from "antd";

import {getErrorMessage} from "@/lib/errors";
import {adminApi, uploadToSignedUrl} from "@/lib/restApi";
import {CODE_MASTER_KEY_CANDIDATES, getMetaParentId, useCodeOptions} from "@/lib/codebook";

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

type BranchForm = Partial<BranchRecord>;

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

export function BranchUpsertModal(props: {
    open: boolean;
    mode: "create" | "edit";
    branchId?: string | null;
    onClose: () => void;
    onSaved?: () => void;
}) {
    const isEdit = props.mode === "edit";
    const id = props.branchId ? String(props.branchId) : "";

    const {formProps, onFinish, queryResult} = useForm<BranchForm, HttpError>({
        resource: "branches",
        action: isEdit ? "edit" : "create",
        id: isEdit ? id : undefined,
        redirect: false,
        // 모달은 open일 때만 렌더링되므로 queryOptions로 enabled를 제어할 필요가 없습니다.
        // (react-query v5 타입에서는 queryKey가 필수라 { enabled }만 넘기면 TS2741이 발생합니다.)
    });

    const record = queryResult?.data?.data;

    const {mutateAsync: deleteAsync, isLoading: isDeleting} = useDelete();

    const {
        options: branchTypeOptions,
        isLoading: isLoadingBranchTypes,
    } = useCodeOptions([
        ...CODE_MASTER_KEY_CANDIDATES.branchType,
    ]);
    const {options: sidoOptions, isLoading: isLoadingSido} = useCodeOptions([...CODE_MASTER_KEY_CANDIDATES.regionSido]);
    const {
        options: sigunguOptionsAll,
        isLoading: isLoadingSigungu
    } = useCodeOptions([...CODE_MASTER_KEY_CANDIDATES.regionSigungu]);
    const selectedSidoId = Form.useWatch("region_sido_id", formProps.form);
    const sigunguOptions = useMemo(() => {
        const sidoId = typeof selectedSidoId === "string" ? selectedSidoId : null;
        if (!sidoId) return sigunguOptionsAll;
        return sigunguOptionsAll.filter((o) => {
            const parentId = getMetaParentId(o.row.meta);
            return !parentId || parentId === sidoId;
        });
    }, [selectedSidoId, sigunguOptionsAll]);

    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [busy, setBusy] = useState(false);

    const [images, setImages] = useState<ImageRow[]>([]);

    const refreshImages = useCallback(async () => {
        if (!isEdit || !id) return;
        const rows = await fetchBranchImages(id);
        setImages(rows);
    }, [id, isEdit]);

    useEffect(() => {
        if (!props.open) return;
        if (!isEdit) {
            // create 모드: 기본값 세팅 + 파일 초기화
            formProps.form?.resetFields();
            formProps.form?.setFieldsValue({is_visible: true} as Partial<BranchRecord>);
            setFileList([]);
            setImages([]);
            return;
        }
        // edit 모드: 이미지 로딩
        setFileList([]);
        void refreshImages();
    }, [formProps.form, isEdit, props.open, refreshImages]);

    const previewItems = useMemo(() => {
        return images
            .map((row) => {
                const src = row.signed_url;
                return src ? {id: row.id, src} : null;
            })
            .filter((v): v is { id: string; src: string } => Boolean(v));
    }, [images]);

    const uploadNewImages = async (branchId: string) => {
        if (fileList.length === 0) return;
        const files = fileList
            .map((f) => f.originFileObj as File | undefined)
            .filter((f): f is File => Boolean(f));
        if (files.length === 0) return;

        const metas = files.map((f) => {
            const name = f.name ?? "";
            const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
            return {ext: ext || undefined, contentType: f.type || undefined};
        });

        const {uploads} = await adminApi.branchSignedUpload(branchId, metas);
        if (!uploads || uploads.length !== files.length) {
            throw new Error("signed_upload 응답이 올바르지 않습니다.");
        }

        for (let i = 0; i < uploads.length; i++) {
            await uploadToSignedUrl({signedUrl: uploads[i].signed_url, file: files[i], contentType: files[i].type});
        }

        await adminApi.branchFinalizeImages(
            branchId,
            uploads.map((u) => u.path),
        );
    };

    const handleFinish = async (values: unknown) => {
        setBusy(true);
        try {
            const cleaned: BranchForm = {...(values as BranchForm)};
            // edit에서는 PK(id) 업데이트를 시도하지 않도록 제거
            if (isEdit) {
                delete (cleaned as Partial<BranchRecord> & { id?: string }).id;
            } else {
                // create에서 id 미입력 시 컬럼/정책에 따라 자동 생성될 수 있도록 제거
                if (!cleaned.id) delete (cleaned as Partial<BranchRecord> & { id?: string }).id;
            }

            const res = await onFinish?.(cleaned);

            const savedId = isEdit ? id : extractCreatedId(res);
            if (!savedId) {
                message.success(isEdit ? "수정 완료" : "등록 완료");
                props.onSaved?.();
                props.onClose();
                return res;
            }

            await uploadNewImages(savedId);
            setFileList([]);
            await refreshImages();

            message.success(isEdit ? "수정 완료" : "등록 완료");
            props.onSaved?.();
            props.onClose();
            return res;
        } catch (e: unknown) {
            console.warn(e);
            message.error(getErrorMessage(e) ?? "저장에 실패했습니다.");
            return undefined;
        } finally {
            setBusy(false);
        }
    };

    const onDeleteBranch = async () => {
        if (!id) return;
        try {
            await deleteAsync({resource: "branches", id});
            message.success("삭제 완료");
            props.onSaved?.();
            props.onClose();
        } catch (e: unknown) {
            console.warn(e);
            message.error(getErrorMessage(e) ?? "삭제에 실패했습니다.");
        }
    };

    const title = isEdit ? `대리점 수정${record?.name ? ` - ${record.name}` : ""}` : "대리점 등록";
    const mergedInitialValues = useMemo(() => {
        const base = (formProps as unknown as { initialValues?: unknown }).initialValues;
        const obj = base && typeof base === "object" ? (base as Record<string, unknown>) : {};
        return {
            ...obj,
            // create/edit 모두 기본값은 true, 서버 값이 있으면 서버 값 우선
            is_visible: typeof obj.is_visible === "boolean" ? obj.is_visible : true,
        } as Partial<BranchRecord>;
    }, [formProps]);

    return (
        <Modal
            title={title}
            open={props.open}
            onCancel={props.onClose}
            width={980}
            maskClosable={false}
            footer={
                <div style={{display: "flex", justifyContent: "space-between", gap: 8}}>
                    <div>
                        {isEdit ? (
                            <Popconfirm
                                title="이 대리점을 삭제할까요?"
                                okText="삭제"
                                okButtonProps={{danger: true}}
                                cancelText="취소"
                                onConfirm={() => void onDeleteBranch()}
                            >
                                <Button danger loading={isDeleting}>
                                    삭제
                                </Button>
                            </Popconfirm>
                        ) : null}
                    </div>
                    <Space>
                        <Button onClick={props.onClose}>취소</Button>
                        <Button
                            type="primary"
                            loading={busy}
                            onClick={() => {
                                formProps.form?.submit();
                            }}
                        >
                            {isEdit ? "수정" : "등록"}
                        </Button>
                    </Space>
                </div>
            }
        >
            <Form {...formProps} layout="vertical" requiredMark={false} onFinish={handleFinish}
                  initialValues={mergedInitialValues}>
                <Card size="small" className="kw-card" styles={{body: {padding: 16}}}>
                    <Space size="large" wrap style={{width: "100%"}}>
                        <Form.Item label="구분" name="branch_type_id" rules={[{required: true}]} style={{minWidth: 260}}>
                            <Select
                                placeholder="구분 선택"
                                loading={isLoadingBranchTypes}
                                options={branchTypeOptions}
                                showSearch
                                optionFilterProp="label"
                            />
                        </Form.Item>

                        <Form.Item label="지점명" name="name" rules={[{required: true}]} style={{minWidth: 320, flex: 1}}>
                            <Input/>
                        </Form.Item>
                    </Space>

                    <Space size="large" wrap style={{width: "100%"}}>
                        <Form.Item
                            label="ID"
                            name="id"
                            tooltip={isEdit ? "ID는 수정할 수 없습니다." : "미입력 시 자동 생성될 수 있습니다. (DB 설정에 따라 다름)"}
                            style={{minWidth: 260}}
                        >
                            <Input disabled={isEdit}/>
                        </Form.Item>
                        <Form.Item label="대표자명" name="owner_name" style={{minWidth: 260}}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label="대표 전화번호" name="phone" style={{minWidth: 260}}>
                            <Input/>
                        </Form.Item>
                    </Space>

                    <Space size="large" wrap>
                        <Form.Item label="노출여부" name="is_visible" valuePropName="checked" style={{minWidth: 160}}>
                            <Checkbox>노출</Checkbox>
                        </Form.Item>
                    </Space>

                    <Space size="large" wrap style={{width: "100%"}}>
                        <Form.Item label="지역(시/도) region_sido_id" name="region_sido_id" style={{minWidth: 260}}>
                            <Select
                                placeholder="시/도 선택"
                                allowClear
                                loading={isLoadingSido}
                                options={sidoOptions}
                                showSearch
                                optionFilterProp="label"
                            />
                        </Form.Item>
                        <Form.Item label="지역(시/군/구) region_sigungu_id" name="region_sigungu_id" style={{minWidth: 260}}>
                            <Select
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
                        <Input/>
                    </Form.Item>
                    <Form.Item label="상세주소" name="address_detail">
                        <Input/>
                    </Form.Item>

                    <Form.Item label="비고(memo)" name="memo">
                        <Input.TextArea rows={3}/>
                    </Form.Item>
                </Card>

                <div style={{height: 12}}/>

                <Card
                    size="small"
                    className="kw-card"
                    title={
                        <Space>
                            <Typography.Text strong>지점 이미지</Typography.Text>
                            <Typography.Text type="secondary">({previewItems.length})</Typography.Text>
                            {isEdit ? (
                                <Button size="small" onClick={() => void refreshImages()}>
                                    새로고침
                                </Button>
                            ) : null}
                        </Space>
                    }
                    styles={{body: {padding: 16}}}
                >
                    {previewItems.length === 0 ? (
                        <Typography.Text type="secondary">등록된 이미지가 없습니다. 아래에서 새 이미지를 업로드하세요.</Typography.Text>
                    ) : (
                        <Image.PreviewGroup>
                            <Space wrap>
                                {previewItems.map((it) => (
                                    <div key={it.id} style={{width: 120}}>
                                        <Image alt="지점 이미지" src={it.src} width={120} height={120}
                                               style={{objectFit: "cover"}}/>
                                    </div>
                                ))}
                            </Space>
                        </Image.PreviewGroup>
                    )}

                    <div style={{height: 12}}/>

                    <Typography.Paragraph type="secondary" style={{marginBottom: 8}}>
                        새 이미지는 선택 후 저장(등록/수정) 시 Storage 업로드 후 branch_images에 자동 등록됩니다.
                    </Typography.Paragraph>
                    <Upload
                        multiple
                        listType="picture"
                        beforeUpload={() => false}
                        fileList={fileList}
                        onChange={({fileList: next}) => setFileList(next)}
                    >
                        <Button>이미지 선택</Button>
                    </Upload>
                </Card>
            </Form>
        </Modal>
    );
}


