import { supabase } from "@/integrations/supabase/client";

export async function hasFreeAccess(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_free_access" as any, { _user_id: userId });
  return !!data;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role" as any, { _user_id: userId, _role: "admin" });
  return !!data;
}

export async function hasActiveTrial(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_active_trial" as any, { _user_id: userId });
  return !!data;
}

export interface UserTrial {
  end_date: string;
  days: number;
}

export async function getUserTrial(userId: string): Promise<UserTrial | null> {
  const { data } = await supabase
    .from("user_trials" as any)
    .select("end_date, days")
    .eq("user_id", userId)
    .gte("end_date", new Date().toISOString())
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as any;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  has_free_access: boolean;
  trial_end?: string;
  trial_days?: number;
}

async function callAdmin(action: string, params: Record<string, any> = {}): Promise<any> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...params }),
    }
  );

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Admin request failed");
  return data;
}

export async function listUsers(): Promise<AdminUser[]> {
  const data = await callAdmin("list_users");
  return data.users || [];
}

export async function grantFreeAccess(userId: string): Promise<void> {
  await callAdmin("grant_free_access", { user_id: userId });
}

export async function revokeFreeAccess(userId: string): Promise<void> {
  await callAdmin("revoke_free_access", { user_id: userId });
}

export async function grantTrial(userId: string, days: number): Promise<void> {
  await callAdmin("grant_trial", { user_id: userId, days });
}

export async function revokeTrial(userId: string): Promise<void> {
  await callAdmin("revoke_trial", { user_id: userId });
}
