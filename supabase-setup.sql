-- Supabase Database Setup for Auth + Paywall
-- Run this in Supabase Dashboard > SQL Editor
-- Project: njdfevfwljuyzipguqfp

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- User Subscriptions Table
-- Tracks paid status and subscription details
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_paid BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'free', -- 'free', 'paid', 'trial', 'suspended'
  granted_by UUID REFERENCES auth.users(id), -- Admin who granted access
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- NULL = lifetime access
  notes TEXT, -- Admin notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('free', 'paid', 'trial', 'suspended'))
);

-- Ensure one subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_paid ON user_subscriptions(is_paid);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

COMMENT ON TABLE user_subscriptions IS 'Tracks user subscription status and paid access entitlements';
COMMENT ON COLUMN user_subscriptions.is_paid IS 'TRUE if user has paid access to premium content';
COMMENT ON COLUMN user_subscriptions.subscription_status IS 'Current subscription status: free, paid, trial, or suspended';
COMMENT ON COLUMN user_subscriptions.expires_at IS 'NULL for lifetime access, otherwise subscription expiration date';

-- User Profiles Table
-- Additional user info beyond auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_profiles IS 'Extended user profile information';

-- Access Logs Table
-- Tracks access attempts to paid content for analytics
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_slug TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL,
  reason TEXT, -- 'is_paid', 'public_post', 'no_subscription', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_post_slug ON access_logs(post_slug);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);

COMMENT ON TABLE access_logs IS 'Audit log of content access attempts for analytics and security';

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- user_subscriptions policies
-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update/delete subscriptions (admin grants)
CREATE POLICY "Service role can manage subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- user_profiles policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- access_logs policies
-- Users can view their own access logs
CREATE POLICY "Users can view own access logs"
  ON access_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert access logs
CREATE POLICY "Service role can insert access logs"
  ON access_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- =====================================================
-- 3. DATABASE FUNCTIONS
-- =====================================================

-- Function to check if user has paid access
-- Used by Edge Function to validate access
CREATE OR REPLACE FUNCTION check_paid_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
      AND is_paid = TRUE
      AND subscription_status = 'paid'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_paid_access IS 'Checks if a user has active paid access to premium content';

-- Function to get user subscription info
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  is_paid BOOLEAN,
  subscription_status TEXT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.is_paid,
    s.subscription_status,
    s.expires_at
  FROM user_subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_subscriptions
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. TEST DATA (OPTIONAL - COMMENT OUT FOR PRODUCTION)
-- =====================================================

-- Uncomment to insert test data
/*
-- Insert a test subscription for your user
-- Replace 'your-email@example.com' with your actual email
INSERT INTO user_subscriptions (user_id, is_paid, subscription_status)
SELECT
  id,
  FALSE,
  'free'
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;
*/

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Run these to verify setup
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_subscriptions', 'user_profiles', 'access_logs');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_subscriptions', 'user_profiles', 'access_logs');

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Check functions exist
SELECT proname
FROM pg_proc
WHERE proname IN ('check_paid_access', 'get_user_subscription', 'update_updated_at_column');
