-- Tracks outbound WhatsApp messages (Twilio account quota — rolling 24h window)

create table if not exists public.twilio_send_log (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now()
);

create index if not exists twilio_send_log_sent_at_idx
  on public.twilio_send_log (sent_at desc);

-- One row: last time we detected Twilio hard cap (error 63038)
create table if not exists public.twilio_quota_state (
  singleton_key text primary key default 'default',
  hard_cap_detected_at timestamptz,
  warned_90_at timestamptz
);

insert into public.twilio_quota_state (singleton_key)
values ('default')
on conflict (singleton_key) do nothing;

drop trigger if exists twilio_send_log_forbid_delete on public.twilio_send_log;
create trigger twilio_send_log_forbid_delete
  before delete on public.twilio_send_log
  for each row execute function public.forbid_delete();
