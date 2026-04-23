-- Create strength_history table for tracking strength values with dates
CREATE TABLE public.strength_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lift_type TEXT NOT NULL DEFAULT 'standard',
  lift_name TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL,
  achieved_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT strength_history_lift_type_check CHECK (lift_type IN ('standard', 'custom')),
  CONSTRAINT strength_history_weight_positive CHECK (weight_kg > 0)
);

-- Index for fast lookup of latest value per lift per user
CREATE INDEX idx_strength_history_user_lift_date 
  ON public.strength_history (user_id, lift_name, achieved_on DESC);

-- Enable RLS
ALTER TABLE public.strength_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own strength history"
  ON public.strength_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strength history"
  ON public.strength_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strength history"
  ON public.strength_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strength history"
  ON public.strength_history
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all strength history"
  ON public.strength_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_strength_history_updated_at
  BEFORE UPDATE ON public.strength_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();