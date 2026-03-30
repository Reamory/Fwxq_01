alter table if exists public.service_requests
add column if not exists single_source_reason text not null default '';

