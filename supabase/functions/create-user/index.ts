// supabase/functions/create-user/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Header untuk menangani CORS (PENTING)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Definisikan logika handler
async function handler(req: Request): Promise<Response> {
  // Handle preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("FUNCTION START: create-user invoked."); // <-- LOGGING BARU

  let newUserId: string | null = null;
  let newProfileId: string | null = null;

  try {
    // 1. Buat Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 2. Ambil data dari body request
    const body = await req.json();
    const {
      email,
      password,
      fullName,
      phone,
      role,
      position,
      groupId,
      status,
    } = body;
    
    // ... Validasi Input (Kode tidak berubah) ...

    if (!email || !password || !fullName || !role || !position) {
      return new Response(
        JSON.stringify({
          error: "Email, password, nama, role, dan jabatan wajib diisi.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }
    
    if (password.length < 8) {
       return new Response(
        JSON.stringify({
          error: "Password minimal harus 8 karakter.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // 3. Menjalankan supabase.auth.admin.createUser()
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });

    if (authError) throw authError;

    newUserId = authData.user.id;

    // 4. Menyisipkan data ke tabel 'profiles'
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: newUserId,
        full_name: fullName,
        email: email,
        phone: phone || null,
        role: role,
        status: status,
      })
      .select("id")
      .single();

    if (profileError) {
      console.error("Gagal insert ke profiles. Melakukan rollback user:", newUserId); // <-- LOGGING BARU
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw profileError;
    }

    newProfileId = profileData.id;

    // 5. Menyisipkan data ke tabel 'employees'
    const { error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        profile_id: newProfileId,
        position: position,
        group_id: groupId || null,
      });

    if (employeeError) {
      console.error("Gagal insert ke employees. Melakukan rollback profile:", newProfileId, " Error:", employeeError.message); // <-- LOGGING BARU
      
      // Rollback Auth User dan Profile
      if (newUserId) {
         await supabaseAdmin.auth.admin.deleteUser(newUserId);
      }
      if (newProfileId) {
         await supabaseAdmin.from("profiles").delete().eq("id", newProfileId);
      }
      throw employeeError;
    }

    // 6. Kirim respon sukses
    console.log("FUNCTION END: User successfully created and response sent."); // <-- LOGGING BARU
    return new Response(
      JSON.stringify({ message: "User berhasil dibuat!" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    // Tangani semua error
    console.error("Kesalahan umum di create-user:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
}

// Ekspor handler sebagai default
export default handler;