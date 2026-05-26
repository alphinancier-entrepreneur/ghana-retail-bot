-- Daily message usage per WhatsApp user (resets at midnight Ghana / Africa/Accra)
create table if not exists user_usage (
  phone_number text primary key,
  message_count integer not null default 0,
  last_reset_date date not null default (timezone('Africa/Accra', now()))::date,
  warned_90_on date,
  limit_notice_on date
);

-- Early-access waitlist (keyword WAITLIST)
create table if not exists waitlist (
  phone_number text primary key,
  joined_at timestamptz not null default now()
);

create index if not exists waitlist_joined_at_idx on waitlist (joined_at desc);
