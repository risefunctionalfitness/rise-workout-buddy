-- Check current RLS policies on gym_access_codes table
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'gym_access_codes';

-- Create RLS policy to allow authenticated users to read active gym codes
CREATE POLICY "Allow authenticated users to read active gym codes" 
ON gym_access_codes 
FOR SELECT 
TO authenticated 
USING (is_active = true);

-- Insert a current active gym code if none exists
DO $$
BEGIN
  -- Check if there's an active code for today
  IF NOT EXISTS (
    SELECT 1 FROM gym_access_codes 
    WHERE is_active = true 
    AND created_at > NOW() - INTERVAL '7 days'
  ) THEN
    -- Deactivate old codes
    UPDATE gym_access_codes SET is_active = false WHERE is_active = true;
    
    -- Insert new active code
    INSERT INTO gym_access_codes (code, is_active, created_at)
    VALUES ('1234', true, NOW());
  END IF;
END $$;