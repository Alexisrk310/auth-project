-- 1. Create Dashboard Activities Table for Notifications
CREATE TABLE IF NOT EXISTS dashboard_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action_type TEXT NOT NULL, -- 'ORDER_UPDATE', 'USER_UPDATE', 'NEW_ORDER'
  description TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE dashboard_activities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can view activities" ON dashboard_activities
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner')
  );

CREATE POLICY "Service Role can manage activities" ON dashboard_activities
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

-- 2. Insert Dummy Activity to Test Notifications
INSERT INTO dashboard_activities (action_type, description, actor_name, actor_email, read)
VALUES ('SYSTEM_INIT', 'Dashboard notifications initialized', 'System', 'system@nomadastore.com', false);
