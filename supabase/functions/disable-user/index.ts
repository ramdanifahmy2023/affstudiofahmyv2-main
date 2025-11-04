// supabase/functions/disable-user/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400", 
};

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { userId, reason } = body; 

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "userId (Profile ID) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Menonaktifkan user agar tidak bisa login lagi (Soft Disable)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: false, // Memaksa konfirmasi ulang
      user_metadata: {
        disabled_at: new Date().toISOString(),
        disabled_reason: reason || "Admin disabled account",
      },
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: "User account disabled successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error disabling user:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

export default handler;