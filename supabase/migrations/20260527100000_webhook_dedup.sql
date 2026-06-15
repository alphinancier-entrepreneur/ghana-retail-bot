-- Webhook dedup: one row per Twilio MessageSid (prevents double-processing on retries)

create table if not exists public.webhook_events (
  message_sid text primary key,
  phone_number text not null,
  processed_at timestamptz not null default now(),
  constraint webhook_events_phone_not_empty check (char_length(trim(phone_number)) > 0)
);

create index if not exists webhook_events_processed_at_idx
  on public.webhook_events (processed_at desc);

drop trigger if exists webhook_events_forbid_delete on public.webhook_events;
create trigger webhook_events_forbid_delete
  before delete on public.webhook_events
  for each row execute function public.forbid_delete();
