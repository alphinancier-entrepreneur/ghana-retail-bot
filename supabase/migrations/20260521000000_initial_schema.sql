-- Step 2: Initial schema for Ghana retail WhatsApp bot
-- Rules enforced in the database:
--   - No hard deletes on any table (DELETE blocked by trigger)
--   - price_at_sale on sales cannot be changed after insert
--   - inventory_log and product_history are append-only (no UPDATE/DELETE)

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Custom types
-- ---------------------------------------------------------------------------
create type public.retailer_plan as enum ('free', 'paid');

create type public.inventory_action as enum ('add', 'remove', 'sale');

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------

-- Block DELETE on any protected table
create or replace function public.forbid_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Hard deletes are not allowed on %. Use soft-delete (is_active) or append-only logs instead.', TG_TABLE_NAME;
end;
$$;

-- Auto-update updated_at timestamp
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Prevent changing price_at_sale after a sale is recorded
create or replace function public.forbid_sales_price_update()
returns trigger
language plpgsql
as $$
begin
  if old.price_at_sale is distinct from new.price_at_sale then
    raise exception 'price_at_sale is immutable and cannot be changed after a sale is recorded.';
  end if;
  return new;
end;
$$;

-- inventory_log and product_history: append-only (no updates)
create or replace function public.forbid_append_only_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Records on % are append-only and cannot be updated.', TG_TABLE_NAME;
end;
$$;

-- ---------------------------------------------------------------------------
-- retailers
-- ---------------------------------------------------------------------------
create table public.retailers (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text,
  plan public.retailer_plan not null default 'free',
  consent_given_at timestamptz,
  created_at timestamptz not null default now(),
  constraint retailers_phone_unique unique (phone),
  constraint retailers_phone_not_empty check (char_length(trim(phone)) > 0)
);

create index retailers_phone_idx on public.retailers (phone);

create trigger retailers_forbid_delete
  before delete on public.retailers
  for each row execute function public.forbid_delete();

-- ---------------------------------------------------------------------------
-- products (soft-delete via is_active — never hard delete)
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers (id) on delete restrict,
  name text not null,
  category text,
  unit text not null default 'piece',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint products_name_not_empty check (char_length(trim(name)) > 0),
  constraint products_unit_not_empty check (char_length(trim(unit)) > 0)
);

create index products_retailer_id_idx on public.products (retailer_id);
create index products_retailer_active_idx on public.products (retailer_id) where is_active = true;

-- One active product name per retailer (case-insensitive)
create unique index products_retailer_name_active_unique
  on public.products (retailer_id, lower(trim(name)))
  where is_active = true;

create trigger products_forbid_delete
  before delete on public.products
  for each row execute function public.forbid_delete();

-- ---------------------------------------------------------------------------
-- inventory (one stock row per product per retailer)
-- ---------------------------------------------------------------------------
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  retailer_id uuid not null references public.retailers (id) on delete restrict,
  quantity_current numeric(12, 3) not null default 0,
  low_stock_threshold numeric(12, 3),
  updated_at timestamptz not null default now(),
  constraint inventory_quantity_non_negative check (quantity_current >= 0),
  constraint inventory_threshold_non_negative check (
    low_stock_threshold is null or low_stock_threshold >= 0
  ),
  constraint inventory_product_retailer_unique unique (product_id, retailer_id)
);

create index inventory_retailer_id_idx on public.inventory (retailer_id);
create index inventory_product_id_idx on public.inventory (product_id);

create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

create trigger inventory_forbid_delete
  before delete on public.inventory
  for each row execute function public.forbid_delete();

-- ---------------------------------------------------------------------------
-- sales (price_at_sale is immutable after insert)
-- ---------------------------------------------------------------------------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  retailer_id uuid not null references public.retailers (id) on delete restrict,
  quantity_sold numeric(12, 3) not null,
  price_at_sale numeric(12, 2) not null,
  sold_at timestamptz not null default now(),
  constraint sales_quantity_positive check (quantity_sold > 0),
  constraint sales_price_non_negative check (price_at_sale >= 0)
);

create index sales_retailer_sold_at_idx on public.sales (retailer_id, sold_at desc);
create index sales_product_id_idx on public.sales (product_id);

create trigger sales_forbid_price_update
  before update on public.sales
  for each row execute function public.forbid_sales_price_update();

create trigger sales_forbid_delete
  before delete on public.sales
  for each row execute function public.forbid_delete();

-- ---------------------------------------------------------------------------
-- retailer_settings (one row per retailer)
-- ---------------------------------------------------------------------------
create table public.retailer_settings (
  retailer_id uuid primary key references public.retailers (id) on delete restrict,
  currency text not null default 'GHS',
  whatsapp_alerts_on boolean not null default true,
  subscription_plan public.retailer_plan not null default 'free',
  momo_phone text,
  updated_at timestamptz not null default now(),
  constraint retailer_settings_currency_not_empty check (char_length(trim(currency)) > 0)
);

create trigger retailer_settings_set_updated_at
  before update on public.retailer_settings
  for each row execute function public.set_updated_at();

create trigger retailer_settings_forbid_delete
  before delete on public.retailer_settings
  for each row execute function public.forbid_delete();

-- ---------------------------------------------------------------------------
-- inventory_log (append-only audit trail for every stock change)
-- ---------------------------------------------------------------------------
create table public.inventory_log (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  retailer_id uuid not null references public.retailers (id) on delete restrict,
  action public.inventory_action not null,
  quantity_before numeric(12, 3) not null,
  quantity_after numeric(12, 3) not null,
  logged_at timestamptz not null default now(),
  constraint inventory_log_quantities_non_negative check (
    quantity_before >= 0 and quantity_after >= 0
  )
);

create index inventory_log_retailer_logged_at_idx
  on public.inventory_log (retailer_id, logged_at desc);

create index inventory_log_product_id_idx on public.inventory_log (product_id);

create trigger inventory_log_forbid_update
  before update on public.inventory_log
  for each row execute function public.forbid_append_only_update();

create trigger inventory_log_forbid_delete
  before delete on public.inventory_log
  for each row execute function public.forbid_delete();

-- ---------------------------------------------------------------------------
-- product_history (append-only audit trail for deactivations)
-- ---------------------------------------------------------------------------
create table public.product_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  retailer_id uuid not null references public.retailers (id) on delete restrict,
  was_active boolean not null,
  reason text,
  recorded_at timestamptz not null default now()
);

create index product_history_product_recorded_idx
  on public.product_history (product_id, recorded_at desc);

create index product_history_retailer_id_idx on public.product_history (retailer_id);

create trigger product_history_forbid_update
  before update on public.product_history
  for each row execute function public.forbid_append_only_update();

create trigger product_history_forbid_delete
  before delete on public.product_history
  for each row execute function public.forbid_delete();

-- ---------------------------------------------------------------------------
-- Row Level Security (blocks public API access; service role bypasses RLS)
-- ---------------------------------------------------------------------------
alter table public.retailers enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.sales enable row level security;
alter table public.retailer_settings enable row level security;
alter table public.inventory_log enable row level security;
alter table public.product_history enable row level security;

-- No policies yet: only the Node.js server (service role key) can access data.
-- Application code enforces retailer_id scoping by phone number.

-- ---------------------------------------------------------------------------
-- Comments (documentation in Supabase dashboard)
-- ---------------------------------------------------------------------------
comment on table public.retailers is 'Shop owners who use the WhatsApp bot. Identified by phone number.';
comment on table public.products is 'Product catalogue per retailer. Use is_active=false instead of deleting.';
comment on table public.inventory is 'Current stock level per product. One row per product.';
comment on table public.sales is 'Completed sales. price_at_sale is frozen at transaction time.';
comment on table public.retailer_settings is 'Per-retailer preferences: currency, alerts, MoMo number.';
comment on table public.inventory_log is 'Append-only audit: every stock add, remove, or sale.';
comment on table public.product_history is 'Append-only audit: every product activation/deactivation.';
