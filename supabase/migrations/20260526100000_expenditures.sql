-- Expenditure tracking: restock (buying goods) vs operational (running costs)

create table if not exists public.expenditures (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  amount numeric not null,
  category text not null,
  description text not null default '',
  recorded_at timestamptz not null default now(),
  constraint expenditures_amount_positive check (amount > 0),
  constraint expenditures_category_check check (category in ('restock', 'operational')),
  constraint expenditures_phone_not_empty check (char_length(trim(phone_number)) > 0)
);

create index if not exists expenditures_phone_recorded_at_idx
  on public.expenditures (phone_number, recorded_at desc);

-- Match project rule: no hard deletes
drop trigger if exists expenditures_forbid_delete on public.expenditures;
create trigger expenditures_forbid_delete
  before delete on public.expenditures
  for each row execute function public.forbid_delete();
