import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the calling user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if caller is admin
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "list_users": {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers({
          perPage: 100,
        });
        if (error) throw error;

        const { data: freeUsers } = await adminClient
          .from("free_access_users")
          .select("user_id");

        const { data: trials } = await adminClient
          .from("user_trials")
          .select("user_id, end_date, days")
          .gte("end_date", new Date().toISOString());

        const freeUserIds = new Set((freeUsers || []).map((u: any) => u.user_id));
        const trialMap = new Map((trials || []).map((t: any) => [t.user_id, t]));

        const mapped = users.map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          has_free_access: freeUserIds.has(u.id),
          trial_end: trialMap.get(u.id)?.end_date || null,
          trial_days: trialMap.get(u.id)?.days || null,
        }));

        return new Response(JSON.stringify({ users: mapped }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "grant_free_access": {
        const { user_id } = params;
        const { error } = await adminClient
          .from("free_access_users")
          .upsert({ user_id, granted_by: user.id }, { onConflict: "user_id" });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "revoke_free_access": {
        const { user_id } = params;
        const { error } = await adminClient
          .from("free_access_users")
          .delete()
          .eq("user_id", user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "grant_trial": {
        const { user_id, days } = params;
        const end_date = new Date();
        end_date.setDate(end_date.getDate() + (days || 7));
        
        // Delete existing trials for user first
        await adminClient.from("user_trials").delete().eq("user_id", user_id);
        
        const { error } = await adminClient
          .from("user_trials")
          .insert({ user_id, days: days || 7, end_date: end_date.toISOString(), granted_by: user.id });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "revoke_trial": {
        const { user_id } = params;
        const { error } = await adminClient
          .from("user_trials")
          .delete()
          .eq("user_id", user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
