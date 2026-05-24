-- Create page_views table for real-time traffic tracking
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  ip_address INET,
  duration_seconds INTEGER, -- Time spent on page
  created_at TIMESTAMPTZ DEFAULT NOW(),
  exited_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_page_url ON page_views(page_url);
CREATE INDEX IF NOT EXISTS idx_page_views_active ON page_views(created_at DESC) WHERE exited_at IS NULL;

-- Create active_sessions materialized view for real-time stats
CREATE MATERIALIZED VIEW IF NOT EXISTS active_sessions AS
SELECT 
  COUNT(DISTINCT session_id) as active_sessions,
  COUNT(*) as active_page_views,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as logged_in_users,
  MAX(created_at) as last_activity
FROM page_views
WHERE created_at >= NOW() - INTERVAL '5 minutes'
  AND (exited_at IS NULL OR exited_at >= NOW() - INTERVAL '5 minutes');

-- Create function to refresh active_sessions
CREATE OR REPLACE FUNCTION refresh_active_sessions()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW active_sessions;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Admins can see all page views
DROP POLICY IF EXISTS "Admins can view all page views" ON page_views;
CREATE POLICY "Admins can view all page views"
ON page_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Users can insert their own page views (for tracking)
DROP POLICY IF EXISTS "Users can insert page views" ON page_views;
CREATE POLICY "Users can insert page views"
ON page_views FOR INSERT
WITH CHECK (true);

-- Comment
COMMENT ON TABLE page_views IS 'Real-time page view tracking for analytics dashboard';
COMMENT ON MATERIALIZED VIEW active_sessions IS 'Materialized view showing active sessions in last 5 minutes';
