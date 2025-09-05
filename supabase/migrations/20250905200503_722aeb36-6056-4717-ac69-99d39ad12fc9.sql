-- Check if trigger exists and recreate it to ensure proper functionality
DROP TRIGGER IF EXISTS training_session_leaderboard_trigger ON public.training_sessions;

-- Recreate the trigger with improved functionality
CREATE TRIGGER training_session_leaderboard_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_training_session_change();