-- Reset welcome dialog for all members
UPDATE public.profiles
SET welcome_dialog_shown = false
WHERE welcome_dialog_shown = true;