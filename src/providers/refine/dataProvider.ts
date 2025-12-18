"use client";

import { dataProvider as supabaseDataProvider } from "@refinedev/supabase";
import type {
  BaseRecord,
  CreateParams,
  CreateResponse,
  CrudFilters,
  DataProvider,
  GetManyParams,
  GetManyResponse,
  GetOneParams,
  GetOneResponse,
  MetaQuery,
} from "@refinedev/core";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminProfile } from "@/contexts/AdminContext";

type Scope = {
  selectedOrganizationId: string | null;
  profile: AdminProfile | null;
};

const ORG_FILTER_DISABLED_RESOURCES = new Set<string>();

const ID_COLUMN_BY_RESOURCE: Record<string, string> = {
  // Supabase/Refine 기본은 "id"지만, admin_profiles는 user_id를 PK로 쓰는 스키마가 흔합니다.
  admin_profiles: "user_id",
};

const ORG_SCOPED_RESOURCES = new Set<string>([
  "admin_profiles",
  // NOTE: 일부 환경에서 quote_requests에 organization_id 컬럼이 없어 기본 필터에서 제외합니다.
  // (필요 시 스키마 확정 후 다시 활성화하세요.)
  // "quote_requests",
  // NOTE: as_requests 테이블에 organization_id 컬럼이 없는 환경이 존재하여 기본 필터에서 제외합니다.
  "branches",
  "dealer_applications",
  "partnership_inquiries",
  "branch_images",
  "as_request_images",
  "warranty_sends",
  "sheet_dispatches",
]);

function isMissingColumnError(err: unknown, column: string) {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  const message = (err as { message?: unknown }).message;
  const msg = typeof message === "string" ? message : "";
  return String(code) === "42703" && msg.includes(`.${column} does not exist`);
}

function stripFilter(filters: CrudFilters, field: string): CrudFilters {
  const arr = Array.isArray(filters) ? filters : [];
  return arr.filter((f) => {
    if (!f || typeof f !== "object") return true;
    const ff = f as { field?: unknown };
    return ff.field !== field;
  });
}

function mergeFilters(defaults: CrudFilters, incoming?: CrudFilters): CrudFilters {
  const base = Array.isArray(defaults) ? defaults : [];
  const extra = Array.isArray(incoming) ? incoming : [];
  return [...base, ...extra];
}

function buildDefaultFilters(resource: string, scope: Scope): CrudFilters {
  const orgId = scope.selectedOrganizationId ?? scope.profile?.organization_id ?? null;
  const filters: CrudFilters = [];

  if (orgId && ORG_SCOPED_RESOURCES.has(resource) && !ORG_FILTER_DISABLED_RESOURCES.has(resource)) {
    filters.push({ field: "organization_id", operator: "eq", value: orgId });
  }

  // dealer_admin은 자신의 branch 범위로 제한(테이블에 branch_id가 있는 리소스만)
  if (scope.profile?.role === "dealer_admin" && scope.profile.branch_id) {
    if (resource === "branches") {
      // branches는 id 자체가 branch_id일 가능성이 높음
      filters.push({ field: "id", operator: "eq", value: scope.profile.branch_id });
    }
  }

  return filters;
}

function injectOrgToCreateVars<TVariables extends Record<string, unknown>>(
  resource: string,
  scope: Scope,
  variables: TVariables,
): TVariables {
  const orgId = scope.selectedOrganizationId ?? scope.profile?.organization_id ?? null;
  if (!orgId || !ORG_SCOPED_RESOURCES.has(resource)) return variables;
  if (Object.prototype.hasOwnProperty.call(variables, "organization_id")) return variables;
  return { ...variables, organization_id: orgId };
}

function injectIdColumnMeta(resource: string, meta: MetaQuery | undefined): MetaQuery | undefined {
  const idColumnName = ID_COLUMN_BY_RESOURCE[resource];
  if (!idColumnName) return meta;
  const base = meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
  if (typeof base.idColumnName === "string" && base.idColumnName.trim().length > 0) return meta;
  return { ...(base as MetaQuery), idColumnName };
}

function withInjectedMeta<T extends { resource: string; meta?: MetaQuery }>(params: T): T {
  return { ...params, meta: injectIdColumnMeta(params.resource, params.meta) };
}

export function getDataProvider(scope: Scope): DataProvider {
  const supabase = getSupabaseBrowserClient();
  const base = supabaseDataProvider(supabase) as unknown as DataProvider;

  const scoped: DataProvider = {
    ...base,

    getList: async (params) => {
      const defaults = buildDefaultFilters(params.resource, scope);
      const merged = mergeFilters(defaults, params.filters);
      try {
        return await base.getList({
          ...withInjectedMeta(params),
          filters: merged,
        });
      } catch (e: unknown) {
        // 특정 테이블에 organization_id 컬럼이 없는 경우(42703) → org 필터 제거 후 재시도
        if (isMissingColumnError(e, "organization_id")) {
          ORG_FILTER_DISABLED_RESOURCES.add(params.resource);
          const retryFilters = stripFilter(merged, "organization_id");
          return await base.getList({
            ...withInjectedMeta(params),
            filters: retryFilters,
          });
        }
        throw e;
      }
    },

    getMany: async <TData extends BaseRecord = BaseRecord>(params: GetManyParams): Promise<GetManyResponse<TData>> => {
      // getMany에는 filters가 없으므로 RLS에 맡깁니다.
      if (typeof base.getMany === "function") return (await base.getMany(withInjectedMeta(params))) as GetManyResponse<TData>;
      // fallback: id in (...) 기반 list로 에뮬레이션
      const res = await base.getList({
        resource: params.resource,
        pagination: { current: 1, pageSize: (params.ids ?? []).length || 1 },
        filters: [{ field: ID_COLUMN_BY_RESOURCE[params.resource] ?? "id", operator: "in", value: params.ids }],
        sorters: [],
        meta: injectIdColumnMeta(params.resource, params.meta),
      });
      return { data: res.data as unknown as TData[] };
    },

    getOne: async <TData extends BaseRecord = BaseRecord>(params: GetOneParams): Promise<GetOneResponse<TData>> => {
      // getOne에는 filters가 없으므로 RLS에 맡깁니다.
      if (typeof base.getOne === "function") return (await base.getOne(withInjectedMeta(params))) as GetOneResponse<TData>;
      const res = await base.getList({
        resource: params.resource,
        pagination: { current: 1, pageSize: 1 },
        filters: [{ field: ID_COLUMN_BY_RESOURCE[params.resource] ?? "id", operator: "eq", value: params.id }],
        sorters: [],
        meta: injectIdColumnMeta(params.resource, params.meta),
      });
      const first = Array.isArray(res.data) ? res.data[0] : undefined;
      return { data: first as unknown as TData };
    },

    create: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>(
      params: CreateParams<TVariables>,
    ): Promise<CreateResponse<TData>> => {
      const variables = injectOrgToCreateVars(params.resource, scope, (params.variables ?? {}) as Record<string, unknown>);
      return (await base.create({ ...withInjectedMeta(params), variables } as unknown as CreateParams<TVariables>)) as CreateResponse<TData>;
    },

    update: async (params) => {
      return base.update(withInjectedMeta(params));
    },

    createMany: async (params) => {
      if (typeof base.createMany !== "function") {
        throw new Error("dataProvider.createMany is not implemented");
      }
      return base.createMany(withInjectedMeta(params));
    },

    updateMany: async (params) => {
      if (typeof base.updateMany !== "function") {
        throw new Error("dataProvider.updateMany is not implemented");
      }
      return base.updateMany(withInjectedMeta(params));
    },

    deleteOne: async (params) => {
      if (typeof base.deleteOne !== "function") {
        throw new Error("dataProvider.deleteOne is not implemented");
      }
      return base.deleteOne(withInjectedMeta(params));
    },

    deleteMany: async (params) => {
      if (typeof base.deleteMany !== "function") {
        throw new Error("dataProvider.deleteMany is not implemented");
      }
      return base.deleteMany(withInjectedMeta(params));
    },
  };

  return scoped;
}


