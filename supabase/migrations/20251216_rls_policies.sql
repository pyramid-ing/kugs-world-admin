-- RLS policies for anon key + authenticated admin UI
-- NOTE: Run this in Supabase SQL editor or apply via Supabase CLI/MCP.
-- Idempotent: drops policies first, enables RLS, then recreates policies.

-- Helper predicate (inline pattern used in policies):
-- admin: exists admin_profiles where user_id = auth.uid() and active and role='admin'
-- dealer_admin: exists admin_profiles where user_id = auth.uid() and active and role='dealer_admin'

-- organizations
alter table if exists public.organizations enable row level security;
drop policy if exists "organizations_select" on public.organizations;
create policy "organizations_select"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or public.organizations.id = ap.organization_id
      )
  )
);

-- admin_profiles
alter table if exists public.admin_profiles enable row level security;
drop policy if exists "admin_profiles_select" on public.admin_profiles;
create policy "admin_profiles_select"
on public.admin_profiles
for select
to authenticated
using (
  public.admin_profiles.user_id = auth.uid()
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
);

drop policy if exists "admin_profiles_update" on public.admin_profiles;
create policy "admin_profiles_update"
on public.admin_profiles
for update
to authenticated
using (
  public.admin_profiles.user_id = auth.uid()
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
)
with check (
  public.admin_profiles.user_id = auth.uid()
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
);

drop policy if exists "admin_profiles_insert_admin" on public.admin_profiles;
create policy "admin_profiles_insert_admin"
on public.admin_profiles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
);

drop policy if exists "admin_profiles_delete_admin" on public.admin_profiles;
create policy "admin_profiles_delete_admin"
on public.admin_profiles
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
);

-- quote_requests (org + branch scoped)
alter table if exists public.quote_requests enable row level security;
drop policy if exists "quote_requests_select" on public.quote_requests;
create policy "quote_requests_select"
on public.quote_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and ap.organization_id = public.quote_requests.organization_id
          and (ap.branch_id is null or public.quote_requests.branch_id = ap.branch_id)
        )
      )
  )
);

drop policy if exists "quote_requests_update" on public.quote_requests;
create policy "quote_requests_update"
on public.quote_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and ap.organization_id = public.quote_requests.organization_id
          and (ap.branch_id is null or public.quote_requests.branch_id = ap.branch_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and ap.organization_id = public.quote_requests.organization_id
          and (ap.branch_id is null or public.quote_requests.branch_id = ap.branch_id)
        )
      )
  )
);

-- as_requests (org + branch scoped)
alter table if exists public.as_requests enable row level security;
drop policy if exists "as_requests_select" on public.as_requests;
create policy "as_requests_select"
on public.as_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and ap.organization_id = public.as_requests.organization_id
          and (ap.branch_id is null or public.as_requests.branch_id = ap.branch_id)
        )
      )
  )
);

drop policy if exists "as_requests_update" on public.as_requests;
create policy "as_requests_update"
on public.as_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and ap.organization_id = public.as_requests.organization_id
          and (ap.branch_id is null or public.as_requests.branch_id = ap.branch_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and ap.organization_id = public.as_requests.organization_id
          and (ap.branch_id is null or public.as_requests.branch_id = ap.branch_id)
        )
      )
  )
);

-- branches (org scoped; dealer_admin limited to own branch id)
alter table if exists public.branches enable row level security;
drop policy if exists "branches_select" on public.branches;
create policy "branches_select"
on public.branches
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and public.branches.id = ap.branch_id
        )
      )
  )
);

drop policy if exists "branches_insert_admin" on public.branches;
create policy "branches_insert_admin"
on public.branches
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
);

drop policy if exists "branches_update" on public.branches;
create policy "branches_update"
on public.branches
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (ap.role = 'dealer_admin' and public.branches.id = ap.branch_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (ap.role = 'dealer_admin' and public.branches.id = ap.branch_id)
      )
  )
);

drop policy if exists "branches_delete_admin" on public.branches;
create policy "branches_delete_admin"
on public.branches
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
);

-- branch_images (join to branches)
alter table if exists public.branch_images enable row level security;
drop policy if exists "branch_images_select" on public.branch_images;
create policy "branch_images_select"
on public.branch_images
for select
to authenticated
using (
  exists (
    select 1
    from public.branches b
    join public.admin_profiles ap on ap.user_id = auth.uid()
    where ap.active = true
      and (
        ap.role = 'admin'
        or (ap.role = 'dealer_admin' and b.id = ap.branch_id)
      )
      and b.id = public.branch_images.branch_id
  )
);

drop policy if exists "branch_images_write" on public.branch_images;
create policy "branch_images_write"
on public.branch_images
for all
to authenticated
using (
  exists (
    select 1
    from public.branches b
    join public.admin_profiles ap on ap.user_id = auth.uid()
    where ap.active = true
      and (
        ap.role = 'admin'
        or (ap.role = 'dealer_admin' and b.id = ap.branch_id)
      )
      and b.id = public.branch_images.branch_id
  )
)
with check (
  exists (
    select 1
    from public.branches b
    join public.admin_profiles ap on ap.user_id = auth.uid()
    where ap.active = true
      and (
        ap.role = 'admin'
        or (ap.role = 'dealer_admin' and b.id = ap.branch_id)
      )
      and b.id = public.branch_images.branch_id
  )
);

-- as_request_images (join to as_requests)
alter table if exists public.as_request_images enable row level security;
drop policy if exists "as_request_images_select" on public.as_request_images;
create policy "as_request_images_select"
on public.as_request_images
for select
to authenticated
using (
  exists (
    select 1
    from public.as_requests a
    join public.admin_profiles ap on ap.user_id = auth.uid()
    where ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and ap.organization_id = a.organization_id
          and (ap.branch_id is null or a.branch_id = ap.branch_id)
        )
      )
      and a.id = public.as_request_images.as_request_id
  )
);

drop policy if exists "as_request_images_write" on public.as_request_images;
create policy "as_request_images_write"
on public.as_request_images
for all
to authenticated
using (
  exists (
    select 1
    from public.as_requests a
    join public.admin_profiles ap on ap.user_id = auth.uid()
    where ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and ap.organization_id = a.organization_id
          and (ap.branch_id is null or a.branch_id = ap.branch_id)
        )
      )
      and a.id = public.as_request_images.as_request_id
  )
)
with check (
  exists (
    select 1
    from public.as_requests a
    join public.admin_profiles ap on ap.user_id = auth.uid()
    where ap.active = true
      and (
        ap.role = 'admin'
        or (
          ap.role = 'dealer_admin'
          and ap.organization_id = a.organization_id
          and (ap.branch_id is null or a.branch_id = ap.branch_id)
        )
      )
      and a.id = public.as_request_images.as_request_id
  )
);

-- dealer_applications (admin only)
alter table if exists public.dealer_applications enable row level security;
drop policy if exists "dealer_applications_select_admin" on public.dealer_applications;
create policy "dealer_applications_select_admin"
on public.dealer_applications
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
);

drop policy if exists "dealer_applications_update_admin" on public.dealer_applications;
create policy "dealer_applications_update_admin"
on public.dealer_applications
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
);

-- partnership_inquiries (admin only)
alter table if exists public.partnership_inquiries enable row level security;
drop policy if exists "partnership_inquiries_select_admin" on public.partnership_inquiries;
create policy "partnership_inquiries_select_admin"
on public.partnership_inquiries
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and ap.role = 'admin'
  )
);

-- warranty_sends / sheet_dispatches (admin + dealer_admin org/branch scoped if columns exist)
alter table if exists public.warranty_sends enable row level security;
drop policy if exists "warranty_sends_select" on public.warranty_sends;
create policy "warranty_sends_select"
on public.warranty_sends
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (ap.role = 'dealer_admin' and ap.organization_id = public.warranty_sends.organization_id)
      )
  )
);

alter table if exists public.sheet_dispatches enable row level security;
drop policy if exists "sheet_dispatches_select" on public.sheet_dispatches;
create policy "sheet_dispatches_select"
on public.sheet_dispatches
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'admin'
        or (ap.role = 'dealer_admin' and ap.organization_id = public.sheet_dispatches.organization_id)
      )
  )
);


