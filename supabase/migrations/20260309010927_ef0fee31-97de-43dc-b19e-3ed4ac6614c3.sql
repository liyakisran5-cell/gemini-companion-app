
ALTER TABLE public.user_credits ALTER COLUMN image_credits SET DEFAULT 3;

UPDATE public.user_credits SET image_credits = 3 WHERE image_credits = 0;
