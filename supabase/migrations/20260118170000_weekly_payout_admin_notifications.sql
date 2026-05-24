-- ============================================================================
-- Weekly payout admin notification (idempotent summary email per run_date)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_payout_admin_notifications (
  run_date DATE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.weekly_payout_admin_notifications IS 'Ensures admin summary email is sent once per weekly payout run_date.';

-- Backward-compatible column additions if table exists
ALTER TABLE public.weekly_payout_admin_notifications
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.weekly_payout_admin_notifications
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE public.weekly_payout_admin_notifications
  ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE public.weekly_payout_admin_notifications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE public.weekly_payout_admin_notifications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
