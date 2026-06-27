
CREATE OR REPLACE FUNCTION public.get_monthly_checkins_chart(months_back integer DEFAULT 12)
RETURNS TABLE(
  year integer,
  month integer,
  basic_count bigint,
  premium_count bigint,
  wellpass_count bigint,
  ten_card_count bigint,
  open_gym_count bigint,
  total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    le.year,
    le.month,
    COALESCE(SUM(le.training_count) FILTER (WHERE p.membership_type = 'Basic Member'), 0)::bigint AS basic_count,
    COALESCE(SUM(le.training_count) FILTER (WHERE p.membership_type = 'Premium Member'), 0)::bigint AS premium_count,
    COALESCE(SUM(le.training_count) FILTER (WHERE p.membership_type = 'Wellpass'), 0)::bigint AS wellpass_count,
    COALESCE(SUM(le.training_count) FILTER (WHERE p.membership_type = '10er Karte'), 0)::bigint AS ten_card_count,
    COALESCE(SUM(le.training_count) FILTER (WHERE p.membership_type IN ('Open Gym','Trainer')), 0)::bigint AS open_gym_count,
    COALESCE(SUM(le.training_count), 0)::bigint AS total
  FROM public.leaderboard_entries le
  LEFT JOIN public.profiles p ON p.user_id = le.user_id
  WHERE make_date(le.year, le.month, 1) >= date_trunc('month', (CURRENT_DATE - (months_back - 1) * INTERVAL '1 month'))::date
  GROUP BY le.year, le.month
  ORDER BY le.year, le.month;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_checkins_chart(integer) TO authenticated, anon, service_role;
