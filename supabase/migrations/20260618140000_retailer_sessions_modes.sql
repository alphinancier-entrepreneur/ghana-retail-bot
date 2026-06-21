-- Allow onboarding and account-deletion session modes

alter table public.retailer_sessions
  drop constraint if exists retailer_sessions_mode_check;

alter table public.retailer_sessions
  add constraint retailer_sessions_mode_check check (
    mode in (
      'idle',
      'awaiting_bulk_inventory',
      'awaiting_shop_name',
      'awaiting_account_delete_confirm'
    )
  );
