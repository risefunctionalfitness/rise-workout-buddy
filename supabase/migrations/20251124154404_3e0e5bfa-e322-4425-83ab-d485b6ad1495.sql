-- Create table for never active member snapshots
CREATE TABLE never_active_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  
  -- Categories based on days since account creation
  days_0_7_count INTEGER NOT NULL DEFAULT 0,
  days_8_14_count INTEGER NOT NULL DEFAULT 0,
  days_15_21_count INTEGER NOT NULL DEFAULT 0,
  days_21_plus_count INTEGER NOT NULL DEFAULT 0,
  
  total_never_active INTEGER NOT NULL DEFAULT 0,
  
  -- Percentages
  days_0_7_percentage NUMERIC,
  days_8_14_percentage NUMERIC,
  days_15_21_percentage NUMERIC,
  days_21_plus_percentage NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_never_active_snapshots_date ON never_active_snapshots(snapshot_date DESC);

-- Create table for inactive member snapshots
CREATE TABLE inactive_member_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  
  -- Categories based on days since last activity
  active_under_10_count INTEGER NOT NULL DEFAULT 0,
  days_10_15_count INTEGER NOT NULL DEFAULT 0,
  days_15_21_count INTEGER NOT NULL DEFAULT 0,
  days_21_plus_count INTEGER NOT NULL DEFAULT 0,
  
  total_previously_active INTEGER NOT NULL DEFAULT 0,
  
  -- Percentages
  active_under_10_percentage NUMERIC,
  days_10_15_percentage NUMERIC,
  days_15_21_percentage NUMERIC,
  days_21_plus_percentage NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inactive_member_snapshots_date ON inactive_member_snapshots(snapshot_date DESC);

-- Create table for never active member details
CREATE TABLE never_active_member_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  
  days_since_signup INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('0-7', '8-14', '15-21', '21+')),
  
  display_name TEXT,
  membership_type TEXT,
  signup_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_never_active_details_user_date ON never_active_member_details(user_id, snapshot_date DESC);
CREATE INDEX idx_never_active_details_category ON never_active_member_details(category, snapshot_date DESC);

-- Create table for inactive member details
CREATE TABLE inactive_member_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  
  days_since_last_activity INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('active', '10-15', '15-21', '21+')),
  
  display_name TEXT,
  membership_type TEXT,
  last_activity_date DATE,
  total_bookings INTEGER DEFAULT 0,
  total_training_sessions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_inactive_details_user_date ON inactive_member_details(user_id, snapshot_date DESC);
CREATE INDEX idx_inactive_details_category ON inactive_member_details(category, snapshot_date DESC);

-- Enable RLS on all tables
ALTER TABLE never_active_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inactive_member_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE never_active_member_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE inactive_member_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admins can view all
CREATE POLICY "Admins can view never_active_snapshots"
  ON never_active_snapshots FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view inactive_member_snapshots"
  ON inactive_member_snapshots FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view never_active_member_details"
  ON never_active_member_details FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view inactive_member_details"
  ON inactive_member_details FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));