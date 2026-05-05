-- CSV import queue persistence for Tiki Desk intake visibility.

create table if not exists public.csv_import_batches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_by uuid references public.clinic_users(id) on delete set null,
  filename text,
  source text not null default 'csv',
  status text not null default 'completed',
  total_rows integer not null default 0,
  importable_rows integer not null default 0,
  warning_rows integer not null default 0,
  same_file_duplicate_rows integer not null default 0,
  invalid_rows integer not null default 0,
  created_count integer not null default 0,
  visit_created_count integer not null default 0,
  duplicate_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.csv_import_rows (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  batch_id uuid not null references public.csv_import_batches(id) on delete cascade,
  row_num integer,
  patient_id uuid references public.patients(id) on delete set null,
  visit_id uuid references public.visits(id) on delete set null,
  patient_name text,
  visit_date date,
  status text not null default 'unknown',
  warning_messages text[] not null default '{}',
  error_message text,
  portal_url text,
  procedure_match_status text,
  procedure_match_name text,
  external_refs jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_csv_import_batches_clinic_created
  on public.csv_import_batches (clinic_id, created_at desc);

create index if not exists idx_csv_import_rows_batch
  on public.csv_import_rows (batch_id, row_num);

alter table public.csv_import_batches enable row level security;
alter table public.csv_import_rows enable row level security;
