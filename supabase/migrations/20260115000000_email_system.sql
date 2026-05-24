-- Email System Database Migration
-- Nova Store - Resend E-posta Sistemi Tabloları

-- ================================================
-- 1. EMAIL_LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')),
  resend_id TEXT,
  error TEXT,
  
  -- Metadata
  data JSONB,
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  
  -- Analytics
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON email_logs(resend_id);

-- ================================================
-- 2. EMAIL_QUEUE TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  data JSONB NOT NULL,
  
  -- Scheduling
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status_priority ON email_queue(status, priority DESC, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at) WHERE status = 'pending';

-- ================================================
-- 3. EMAIL_PREFERENCES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  
  -- Subscriptions (transactional her zaman true)
  marketing BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true, -- cannot be disabled
  abandoned_cart BOOLEAN DEFAULT true,
  wishlist_alerts BOOLEAN DEFAULT true,
  review_requests BOOLEAN DEFAULT true,
  newsletters BOOLEAN DEFAULT false,
  
  -- Frequency
  frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
  
  -- Unsubscribe
  unsubscribed_all BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  bounced BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_preferences
CREATE INDEX IF NOT EXISTS idx_email_prefs_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_prefs_email ON email_preferences(email);

-- ================================================
-- 4. EMAIL_UNSUBSCRIBES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT,
  category TEXT,
  user_agent TEXT,
  ip_address INET,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_unsubscribes
CREATE INDEX IF NOT EXISTS idx_email_unsubs_email ON email_unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_email_unsubs_date ON email_unsubscribes(unsubscribed_at DESC);

-- ================================================
-- 5. EMAIL_TEMPLATES_ANALYTICS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS email_templates_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template TEXT NOT NULL,
  period DATE NOT NULL,
  
  -- Counts
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  
  -- Rates (calculated)
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(template, period)
);

-- Indexes for email_templates_analytics
CREATE INDEX IF NOT EXISTS idx_email_analytics_template ON email_templates_analytics(template, period DESC);

-- ================================================
-- RLS POLICIES
-- ================================================

-- Email logs: Kullanıcılar sadece kendi loglarını görebilir
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email logs" ON email_logs;
CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on email_logs" ON email_logs;
CREATE POLICY "Service role full access on email_logs"
  ON email_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Email preferences: Kullanıcılar sadece kendi tercihlerini yönetebilir
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON email_preferences;
CREATE POLICY "Users can manage own preferences"
  ON email_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Email queue: Sadece service role erişebilir
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only on email_queue" ON email_queue;
CREATE POLICY "Service role only on email_queue"
  ON email_queue FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Email analytics: Sadece adminler görebilir
ALTER TABLE email_templates_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view analytics" ON email_templates_analytics;
CREATE POLICY "Admins can view analytics"
  ON email_templates_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Auto-create email preferences on user signup
CREATE OR REPLACE FUNCTION create_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_preferences (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences
DROP TRIGGER IF EXISTS on_user_created_email_prefs ON auth.users;
CREATE TRIGGER on_user_created_email_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_email_preferences();

-- Update analytics when email status changes
CREATE OR REPLACE FUNCTION update_email_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Günlük template analytics güncelle
  IF TG_OP = 'INSERT' THEN
    INSERT INTO email_templates_analytics (template, period, sent_count)
    VALUES (NEW.template, CURRENT_DATE, 1)
    ON CONFLICT (template, period) 
    DO UPDATE SET 
      sent_count = email_templates_analytics.sent_count + 1,
      updated_at = NOW();
  END IF;
  
  -- Status değişikliğinde sayaçları güncelle
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'delivered' AND (OLD.status != 'delivered' OR OLD.status IS NULL) THEN
      UPDATE email_templates_analytics
      SET delivered_count = delivered_count + 1,
          updated_at = NOW()
      WHERE template = NEW.template AND period = CURRENT_DATE;
    END IF;
    
    IF NEW.status = 'opened' AND (OLD.status != 'opened' OR OLD.status IS NULL) THEN
      UPDATE email_templates_analytics
      SET opened_count = opened_count + 1,
          updated_at = NOW()
      WHERE template = NEW.template AND period = CURRENT_DATE;
    END IF;
    
    IF NEW.status = 'clicked' AND (OLD.status != 'clicked' OR OLD.status IS NULL) THEN
      UPDATE email_templates_analytics
      SET clicked_count = clicked_count + 1,
          updated_at = NOW()
      WHERE template = NEW.template AND period = CURRENT_DATE;
    END IF;
    
    IF NEW.status = 'bounced' AND (OLD.status != 'bounced' OR OLD.status IS NULL) THEN
      UPDATE email_templates_analytics
      SET bounced_count = bounced_count + 1,
          updated_at = NOW()
      WHERE template = NEW.template AND period = CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analytics
DROP TRIGGER IF EXISTS on_email_log_analytics ON email_logs;
CREATE TRIGGER on_email_log_analytics
  AFTER INSERT OR UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_analytics();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_queue_updated_at ON email_queue;
CREATE TRIGGER update_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_prefs_updated_at ON email_preferences;
CREATE TRIGGER update_email_prefs_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- INITIAL DATA
-- ================================================

-- Popüler template'ler için analytics kayıtları oluştur
INSERT INTO email_templates_analytics (template, period, sent_count)
VALUES 
  ('auth/password-reset', CURRENT_DATE, 0),
  ('auth/password-changed', CURRENT_DATE, 0),
  ('orders/order-confirmation', CURRENT_DATE, 0),
  ('marketing/welcome', CURRENT_DATE, 0)
ON CONFLICT (template, period) DO NOTHING;

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Rate limit check function
CREATE OR REPLACE FUNCTION check_email_rate_limit(
  p_recipient TEXT,
  p_limit_hourly INTEGER DEFAULT 10,
  p_limit_daily INTEGER DEFAULT 50
)
RETURNS BOOLEAN AS $$
DECLARE
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
BEGIN
  -- Son 1 saat
  SELECT COUNT(*) INTO v_hourly_count
  FROM email_logs
  WHERE recipient = p_recipient
    AND sent_at >= NOW() - INTERVAL '1 hour';
  
  IF v_hourly_count >= p_limit_hourly THEN
    RETURN FALSE;
  END IF;
  
  -- Son 24 saat
  SELECT COUNT(*) INTO v_daily_count
  FROM email_logs
  WHERE recipient = p_recipient
    AND sent_at >= NOW() - INTERVAL '24 hours';
  
  IF v_daily_count >= p_limit_daily THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- MIGRATION COMPLETE
COMMENT ON TABLE email_logs IS 'Gönderilen tüm e-postaların kayıtları';
COMMENT ON TABLE email_queue IS 'Gönderilmeyi bekleyen e-postalar';
COMMENT ON TABLE email_preferences IS 'Kullanıcı e-posta tercihleri';
COMMENT ON TABLE email_unsubscribes IS 'Unsubscribe kayıtları (GDPR compliance)';
COMMENT ON TABLE email_templates_analytics IS 'E-posta şablon performans metrikleri';
