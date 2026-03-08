import { supabase } from "@/integrations/supabase/client";

export interface UserCredits {
  image_credits: number;
  video_credits: number;
}

export interface ReferralInfo {
  code: string;
  referralCount: number;
  credits: UserCredits;
}

function generateCode(): string {
  return "NM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Get or create the user's referral code */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const { data } = await supabase
    .from("referral_codes" as any)
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if ((data as any)?.code) return (data as any).code;

  const code = generateCode();
  await supabase.from("referral_codes" as any).insert({ user_id: userId, code });
  return code;
}

/** Count how many people a user has referred */
export async function getReferralCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("referrals" as any)
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", userId);
  return count || 0;
}

/** Calculate credits based on referral count */
export function calculateCredits(referralCount: number): UserCredits {
  if (referralCount >= 2) return { image_credits: 12, video_credits: 12 };
  if (referralCount >= 1) return { image_credits: 5, video_credits: 5 };
  return { image_credits: 0, video_credits: 0 };
}

/** Get or create user credits row and return current credits */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const { data } = await supabase
    .from("user_credits" as any)
    .select("image_credits, video_credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return data as any;

  // Create initial row
  await supabase.from("user_credits" as any).insert({
    user_id: userId,
    image_credits: 0,
    video_credits: 0,
  });
  return { image_credits: 0, video_credits: 0 };
}

/** Deduct one image credit */
export async function useImageCredit(userId: string): Promise<boolean> {
  const credits = await getUserCredits(userId);
  if (credits.image_credits <= 0) return false;

  await supabase
    .from("user_credits" as any)
    .update({ image_credits: credits.image_credits - 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return true;
}

/** Deduct one video credit */
export async function useVideoCredit(userId: string): Promise<boolean> {
  const credits = await getUserCredits(userId);
  if (credits.video_credits <= 0) return false;

  await supabase
    .from("user_credits" as any)
    .update({ video_credits: credits.video_credits - 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return true;
}

/** Look up a referral code and return the owner's user_id */
export async function lookupReferralCode(code: string): Promise<string | null> {
  const { data } = await supabase
    .from("referral_codes" as any)
    .select("user_id")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  return (data as any)?.user_id || null;
}

/** Record a referral and award credits */
export async function recordReferral(referrerId: string, referredId: string): Promise<void> {
  // Insert referral record
  const { error } = await supabase
    .from("referrals" as any)
    .insert({ referrer_id: referrerId, referred_id: referredId });

  if (error) {
    console.error("Referral already recorded or error", error);
    return;
  }

  // Count total referrals and update credits
  const count = await getReferralCount(referrerId);
  const credits = calculateCredits(count);

  // Upsert credits
  const { data: existing } = await supabase
    .from("user_credits" as any)
    .select("user_id")
    .eq("user_id", referrerId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_credits" as any)
      .update({ ...credits, updated_at: new Date().toISOString() })
      .eq("user_id", referrerId);
  } else {
    await supabase
      .from("user_credits" as any)
      .insert({ user_id: referrerId, ...credits });
  }
}

/** Get full referral info for a user */
export async function getReferralInfo(userId: string): Promise<ReferralInfo> {
  const [code, referralCount, credits] = await Promise.all([
    getOrCreateReferralCode(userId),
    getReferralCount(userId),
    getUserCredits(userId),
  ]);
  return { code, referralCount, credits };
}
