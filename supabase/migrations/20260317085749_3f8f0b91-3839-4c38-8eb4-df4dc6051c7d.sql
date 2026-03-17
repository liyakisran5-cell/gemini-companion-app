
-- Drop insecure INSERT and UPDATE policies on user_credits
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;

-- Create a secure function for deducting image credits (only decrements, never increases)
CREATE OR REPLACE FUNCTION public.deduct_image_credit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits integer;
BEGIN
  -- Only allow deducting own credits
  IF _user_id != auth.uid() THEN
    RETURN false;
  END IF;

  SELECT image_credits INTO current_credits
  FROM public.user_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Initialize with defaults
    INSERT INTO public.user_credits (user_id, image_credits, video_credits, daily_free_used, daily_reset_date)
    VALUES (_user_id, 2, 0, 1, CURRENT_DATE);
    RETURN true;
  END IF;

  -- Reset daily counter if new day
  IF (SELECT daily_reset_date FROM public.user_credits WHERE user_id = _user_id) < CURRENT_DATE THEN
    UPDATE public.user_credits
    SET daily_free_used = 0, daily_reset_date = CURRENT_DATE
    WHERE user_id = _user_id;
  END IF;

  -- Try daily free first
  IF (SELECT daily_free_used FROM public.user_credits WHERE user_id = _user_id) < 10 THEN
    UPDATE public.user_credits
    SET daily_free_used = daily_free_used + 1, updated_at = now()
    WHERE user_id = _user_id;
    RETURN true;
  END IF;

  -- Then use paid credits
  IF current_credits > 0 THEN
    UPDATE public.user_credits
    SET image_credits = image_credits - 1, updated_at = now()
    WHERE user_id = _user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Create a secure function for initializing credits (only if not exists)
CREATE OR REPLACE FUNCTION public.init_user_credits(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id != auth.uid() THEN
    RETURN;
  END IF;

  INSERT INTO public.user_credits (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
