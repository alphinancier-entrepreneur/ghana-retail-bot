alter table public.products
  add column if not exists unit_sell_price numeric(12, 2)
  check (unit_sell_price is null or unit_sell_price >= 0);

comment on column public.products.unit_sell_price is 'Selling price per unit in retailer currency (e.g. GHS per tin).';
