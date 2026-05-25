create table public.retailer_sessions (
  retailer_id uuid primary key references public.retailers (id) on delete restrict,
  mode text not null default 'idle',
  updated_at timestamptz not null default now(),
  constraint retailer_sessions_mode_check check (
    mode in ('idle', 'awaiting_bulk_inventory')
  )
);

create trigger retailer_sessions_set_updated_at
  before update on public.retailer_sessions
  for each row execute function public.set_updated_at();

create trigger retailer_sessions_forbid_delete
  before delete on public.retailer_sessions
  for each row execute function public.forbid_delete();

alter table public.retailer_sessions enable row level security;

comment on table public.retailer_sessions is 'Short-lived UI mode per retailer (e.g. waiting for bulk paste).';
