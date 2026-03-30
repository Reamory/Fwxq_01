create extension if not exists pgcrypto;

create table if not exists public.request_no_counters (
  day date primary key,
  counter integer not null
);

create or replace function public.generate_request_no()
returns text
language plpgsql
as $$
declare
  d date := current_date;
  c integer;
begin
  insert into public.request_no_counters(day, counter)
  values (d, 1)
  on conflict (day) do update
    set counter = public.request_no_counters.counter + 1
  returning counter into c;

  return 'FWXQ' || to_char(d, 'YYYYMMDD') || lpad(c::text, 4, '0');
end;
$$;

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null default public.generate_request_no(),
  status text not null,
  created_by_user_id text not null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  funding_channel text not null default '',
  applicant_company text not null default '',
  applicant_department text not null default '',
  project_name text not null default '',
  need_date date,
  procurement_method text not null default '',
  project_type text not null default '',
  public_vendor_selection boolean,
  has_control_price boolean,
  control_price_wo_tax text not null default '',
  vendor_invite_reason text not null default '',
  invited_vendors text[] not null default '{}'::text[],
  budget_project_cbs text not null default '',
  project_overview text not null default '',
  vendor_selection_scope text not null default '',
  vendor_selection_requirements text not null default '',
  main_technical_requirements text not null default '',
  implementation_location text not null default '',
  service_procurement_period text not null default '',
  remark text not null default '',
  contract_subject text not null default '',
  applicant text not null default '',
  contact_info text not null default '',
  lot_division_reason text not null default '',
  attachments jsonb not null default '[]'::jsonb
);

create unique index if not exists service_requests_request_no_key
on public.service_requests(request_no);

create index if not exists service_requests_status_idx
on public.service_requests(status);

create index if not exists service_requests_created_by_idx
on public.service_requests(created_by_user_id);

create index if not exists service_requests_need_date_idx
on public.service_requests(need_date);

create table if not exists public.approval_tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  assignee_user_id text not null,
  assignee_name text not null,
  status text not null,
  completed_at timestamptz
);

create index if not exists approval_tasks_request_id_idx
on public.approval_tasks(request_id);

create index if not exists approval_tasks_assignee_pending_idx
on public.approval_tasks(assignee_user_id, status);

create table if not exists public.flow_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  node_name text not null,
  action text not null,
  opinion text,
  operator_user_id text not null,
  operator_name text not null,
  operator_department text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists flow_events_request_id_idx
on public.flow_events(request_id);

create index if not exists flow_events_operator_action_idx
on public.flow_events(operator_user_id, action);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists service_requests_touch_updated_at on public.service_requests;
create trigger service_requests_touch_updated_at
before update on public.service_requests
for each row
execute function public.touch_updated_at();

