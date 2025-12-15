-- Create weekly_streaks table for tracking user training streaks
CREATE TABLE public.weekly_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Streak configuration
  weekly_goal INTEGER NOT NULL DEFAULT 2 CHECK (weekly_goal IN (1, 2, 3)),
  
  -- Current streak status
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  
  -- Streak freezes ("Streak auf Eis") - max 2
  streak_freezes INTEGER NOT NULL DEFAULT 0 CHECK (streak_freezes >= 0 AND streak_freezes <= 2),
  freezes_used_total INTEGER NOT NULL DEFAULT 0,
  
  -- Tracking
  last_week_completed DATE,
  streak_started_at DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_streaks ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak
CREATE POLICY "Users can view their own streak"
ON public.weekly_streaks
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own streak
CREATE POLICY "Users can insert their own streak"
ON public.weekly_streaks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own streak
CREATE POLICY "Users can update their own streak"
ON public.weekly_streaks
FOR UPDATE
USING (auth.uid() = user_id);

-- System/Edge function can manage all streaks (for cron job)
CREATE POLICY "System can manage all streaks"
ON public.weekly_streaks
FOR ALL
USING (true)
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_weekly_streaks_updated_at
BEFORE UPDATE ON public.weekly_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();