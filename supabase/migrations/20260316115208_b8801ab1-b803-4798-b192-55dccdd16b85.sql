ALTER TABLE public.user_credits 
ADD COLUMN daily_free_used integer NOT NULL DEFAULT 0,
ADD COLUMN daily_reset_date date NOT NULL DEFAULT CURRENT_DATE;