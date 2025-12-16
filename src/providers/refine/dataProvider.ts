"use client";

import { dataProvider as supabaseDataProvider } from "@refinedev/supabase";
import type { DataProvider, CrudFilters, BaseRecord } from "@refinedev/core";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminProfile } from "@/contexts/AdminContext";

type Scope = {
  selectedOrganizationId: string | null;
  profile: AdminProfile | null;
};

const ORG_SCOPED_RESOURCES = new Set<string>([
  "admin_profiles",
  "quote_requests",
  "as_requests",
  "branches",
  "dealer_applications",
  "partnership_inquiries",
  "branch_images",
  "as_request_images",
  "warranty_sends",
  "sheet_dispatches",
]);

function mergeFilters(defaults: CrudFilters, incoming?: CrudFilters): CrudFilters {
  const base = Array.isArray(defaults) ? defaults : [];
  const extra = Array.isArray(incoming) ? incoming : [];
  return [...base, ...extra];
}

function buildDefaultFilters(resource: string, scope: Scope): CrudFilters {
  const orgId = scope.selectedOrganizationId ?? scope.profile?.organization_id ?? null;
  const filters: CrudFilters = [];

  if (orgId && ORG_SCOPED_RESOURCES.has(resource)) {
    filters.push({ field: "organization_id", operator: "eq", value: orgId });
  }

  // dealer_admin은 자신의 branch 범위로 제한(테이블에 branch_id가 있다는 전제)
  if (scope.profile?.role === "dealer_admin" && scope.profile.branch_id) {
    if (resource === "quote_requests" || resource === "as_requests") {
      filters.push({ field: "branch_id", operator: "eq", value: scope.profile.branch_id });
    }
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

export function getDataProvider(scope: Scope): DataProvider {
  const supabase = getSupabaseBrowserClient();
  const base = supabaseDataProvider(supabase) as unknown as DataProvider;

  const scoped: DataProvider = {
    ...base,

    getList: async (params) => {
      const defaults = buildDefaultFilters(params.resource, scope);
      return base.getList({
        ...params,
        filters: mergeFilters(defaults, params.filters),
      });
    },

    getMany: async (params) => {
      // getMany에는 filters가 없으므로 RLS에 맡깁니다.
      return base.getMany(params);
    },

    getOne: async (params) => {
      // getOne에는 filters가 없으므로 RLS에 맡깁니다.
      return base.getOne(params);
    },

    create: async (params) => {
      const variables = injectOrgToCreateVars(params.resource, scope, (params.variables ?? {}) as Record<string, unknown>);
      return base.create({ ...params, variables } as unknown as { resource: string; variables: BaseRecord });
    },

    update: async (params) => {
      return base.update(params);
    },
  };

  return scoped;
}


