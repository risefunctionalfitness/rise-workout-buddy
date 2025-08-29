-- Update RLS policy to include trainer role
DROP POLICY IF EXISTS "All members can view active gym access codes" ON gym_access_codes;

CREATE POLICY "All members can view active gym access codes" 
ON gym_access_codes 
FOR SELECT 
TO authenticated 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY(ARRAY['member'::app_role, 'basic_member'::app_role, 'premium_member'::app_role, 'open_gym'::app_role, 'trainer'::app_role])
  )
);