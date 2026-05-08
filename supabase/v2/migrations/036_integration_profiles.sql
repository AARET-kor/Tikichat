-- Minimal CRM/EMR integration profile storage for clinic CSV alias presets.

create table if not exists public.integration_profiles (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  system_name text not null,
  system_label text,
  mode text not null default 'manual',
  matching_rules jsonb not null default '{}'::jsonb,
  import_format jsonb not null default '{}'::jsonb,
  export_format jsonb not null default '{}'::jsonb,
  notes text,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_profiles_mode_check
    check (mode in ('manual', 'csv', 'copy_paste', 'webhook', 'api_ready', 'api'))
);

create index if not exists integration_profiles_clinic_id_idx
  on public.integration_profiles(clinic_id);

create index if not exists integration_profiles_clinic_active_idx
  on public.integration_profiles(clinic_id, is_active);

create unique index if not exists integration_profiles_unique_active_system_idx
  on public.integration_profiles(clinic_id, lower(system_name))
  where is_active = true;

drop trigger if exists integration_profiles_updated_at on public.integration_profiles;
create trigger integration_profiles_updated_at
  before update on public.integration_profiles
  for each row execute procedure update_updated_at();

alter table public.integration_profiles enable row level security;

drop policy if exists integration_profiles_no_anon_access on public.integration_profiles;
create policy integration_profiles_no_anon_access
  on public.integration_profiles
  for all
  to anon
  using (false)
  with check (false);
