import { supabase } from "@/integrations/supabase/client";

export interface UserCredits {
  image_credits: number;
  video_credits: number;
  daily_free_used: number;
  daily_reset_date: string;
}

export interface ReferralInfo {
  code: string;
  referralCount: number;
  credits: UserCredits;
}

const DAILY_FREE_LIMIT = 10;

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
export function calculateCredits(referralCount: number): { image_credits: number; video_credits: number } {
  if (referralCount >= 2) return { image_credits: 12, video_credits: 12 };
  if (referralCount >= 1) return { image_credits: 5, video_credits: 5 };
  return { image_credits: 0, video_credits: 0 };
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/** Get or create user credits row and return current credits */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  // Ensure credits row exists via secure RPC
  await supabase.rpc("init_user_credits", { _user_id: userId });

  const { data } = await supabase
    .from("user_credits" as any)
    .select("image_credits, video_credits, daily_free_used, daily_reset_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    return data as any;
  }

  return { image_credits: 0, video_credits: 0, daily_free_used: 0, daily_reset_date: getTodayDate() };
}

/** Check if user has daily free images remaining */
export function hasDailyFreeRemaining(credits: UserCredits): boolean {
  return credits.daily_free_used < DAILY_FREE_LIMIT;
}

/** Get remaining daily free images */
export function getDailyFreeRemaining(credits: UserCredits): number {
  return Math.max(0, DAILY_FREE_LIMIT - credits.daily_free_used);
}

/** Deduct one image credit - uses daily free first, then paid credits */
export async function useImageCredit(userId: string): Promise<boolean> {
  const credits = await getUserCredits(userId);
  
  // Use daily free first
  if (credits.daily_free_used < DAILY_FREE_LIMIT) {
    await supabase
      .from("user_credits" as any)
      .update({ daily_free_used: credits.daily_free_used + 1, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    return true;
  }

  // Then use paid credits
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
  const { error } = await supabase
    .from("referrals" as any)
    .insert({ referrer_id: referrerId, referred_id: referredId });

  if (error) {
    console.error("Referral already recorded or error", error);
    return;
  }

  const count = await getReferralCount(referrerId);
  const credits = calculateCredits(count);

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
