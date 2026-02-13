INSERT INTO public.user_roles (user_id, role) 
VALUES ('df4f9a98-0966-4594-83a0-0299e3f13a99', 'trainer') 
ON CONFLICT (user_id, role) DO NOTHING;