-- Create course_invitations table
CREATE TABLE IF NOT EXISTS public.course_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT unique_course_invitation UNIQUE(course_id, sender_id, recipient_id),
  CONSTRAINT no_self_invite CHECK (sender_id != recipient_id)
);

-- Create member_favorites table
CREATE TABLE IF NOT EXISTS public.member_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  favorite_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_favorite UNIQUE(user_id, favorite_user_id),
  CONSTRAINT no_self_favorite CHECK (user_id != favorite_user_id)
);

-- Indices for course_invitations
CREATE INDEX IF NOT EXISTS idx_course_invitations_recipient ON public.course_invitations(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_course_invitations_sender ON public.course_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_course_invitations_course ON public.course_invitations(course_id);

-- Index for member_favorites
CREATE INDEX IF NOT EXISTS idx_member_favorites_user ON public.member_favorites(user_id);

-- Trigger function for max 10 favorites
CREATE OR REPLACE FUNCTION public.check_favorites_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.member_favorites WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 favorites allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_favorites_limit ON public.member_favorites;
CREATE TRIGGER enforce_favorites_limit
  BEFORE INSERT ON public.member_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.check_favorites_limit();

-- Enable RLS
ALTER TABLE public.course_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_invitations
CREATE POLICY "Users can view invitations they sent or received"
  ON public.course_invitations FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send invitations"
  ON public.course_invitations FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update their invitations"
  ON public.course_invitations FOR UPDATE
  USING (auth.uid() = recipient_id);

-- RLS Policies for member_favorites
CREATE POLICY "Users can manage their own favorites"
  ON public.member_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for course_invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_invitations;