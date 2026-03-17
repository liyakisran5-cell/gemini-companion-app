
-- Secure function for deducting video credits
CREATE OR REPLACE FUNCTION public.deduct_video_credit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits integer;
BEGIN
  IF _user_id != auth.uid() THEN
    RETURN false;
  END IF;

  SELECT video_credits INTO current_credits
  FROM public.user_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND OR current_credits <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET video_credits = video_credits - 1, updated_at = now()
  WHERE user_id = _user_id;

  RETURN true;
END;
$$;

-- Secure function to grant referral credits (only callable by service role via edge functions)
CREATE OR REPLACE FUNCTION public.grant_referral_credits(_user_id uuid, _image_credits integer, _video_credits integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, image_credits, video_credits)
  VALUES (_user_id, _image_credits, _video_credits)
  ON CONFLICT (user_id) DO UPDATE
  SET image_credits = EXCLUDED.image_credits,
      video_credits = EXCLUDED.video_credits,
      updated_at = now();
END;
$$;
