-- Scope Twilio quota tracking per subaccount (Dev vs Pro share Supabase, separate caps)

ALTER TABLE public.twilio_send_log
  ADD COLUMN IF NOT EXISTS account_sid text;

UPDATE public.twilio_send_log
  SET account_sid = 'legacy_migrated'
  WHERE account_sid IS NULL;

ALTER TABLE public.twilio_send_log
  ALTER COLUMN account_sid SET NOT NULL;

CREATE INDEX IF NOT EXISTS twilio_send_log_account_sent_at_idx
  ON public.twilio_send_log (account_sid, sent_at DESC);

-- Replace singleton_key with one row per Twilio account
ALTER TABLE public.twilio_quota_state
  ADD COLUMN IF NOT EXISTS account_sid text;

DELETE FROM public.twilio_quota_state;

ALTER TABLE public.twilio_quota_state
  DROP CONSTRAINT IF EXISTS twilio_quota_state_pkey;

ALTER TABLE public.twilio_quota_state
  DROP COLUMN IF EXISTS singleton_key;

ALTER TABLE public.twilio_quota_state
  ALTER COLUMN account_sid SET NOT NULL;

ALTER TABLE public.twilio_quota_state
  ADD PRIMARY KEY (account_sid);
