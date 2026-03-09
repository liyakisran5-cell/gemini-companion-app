
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_credits
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credits" ON public.user_credits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credits" ON public.user_credits FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- gallery_images
DROP POLICY IF EXISTS "Users can view own gallery images" ON public.gallery_images;
DROP POLICY IF EXISTS "Users can insert own gallery images" ON public.gallery_images;
DROP POLICY IF EXISTS "Users can delete own gallery images" ON public.gallery_images;

CREATE POLICY "Users can view own gallery images" ON public.gallery_images FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gallery images" ON public.gallery_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own gallery images" ON public.gallery_images FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- referral_codes
DROP POLICY IF EXISTS "Users can view own referral code" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can insert own referral code" ON public.referral_codes;

CREATE POLICY "Users can view own referral code" ON public.referral_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own referral code" ON public.referral_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id);
CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() = referred_id);

-- free_access_users
DROP POLICY IF EXISTS "Admins can view free access" ON public.free_access_users;
DROP POLICY IF EXISTS "Admins can grant free access" ON public.free_access_users;
DROP POLICY IF EXISTS "Admins can revoke free access" ON public.free_access_users;

CREATE POLICY "Admins can view free access" ON public.free_access_users FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);
CREATE POLICY "Admins can grant free access" ON public.free_access_users FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can revoke free access" ON public.free_access_users FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
