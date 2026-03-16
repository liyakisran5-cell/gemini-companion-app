
-- Create user_trials table for admin-granted trials
CREATE TABLE public.user_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  days integer NOT NULL DEFAULT 7,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  granted_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;

-- Users can view own trials
CREATE POLICY "Users can view own trials" ON public.user_trials
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admins can insert trials
CREATE POLICY "Admins can insert trials" ON public.user_trials
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete trials
CREATE POLICY "Admins can delete trials" ON public.user_trials
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to check if user has active trial
CREATE OR REPLACE FUNCTION public.has_active_trial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_trials
    WHERE user_id = _user_id
      AND now() BETWEEN start_date AND end_date
  )
$$;
