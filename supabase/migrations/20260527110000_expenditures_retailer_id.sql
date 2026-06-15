-- Link expenditures to retailers (consistent tenancy with sales/inventory)

alter table public.expenditures
  add column if not exists retailer_id uuid references public.retailers(id);

update public.expenditures e
set retailer_id = r.id
from public.retailers r
where r.phone = e.phone_number
  and e.retailer_id is null;

create index if not exists expenditures_retailer_recorded_at_idx
  on public.expenditures (retailer_id, recorded_at desc);
