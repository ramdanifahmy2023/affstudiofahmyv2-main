// supabase/functions/create-user/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Header untuk menangani CORS (PENTING)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  // BARIS BARU KRITIS UNTUK PREFLIGHT
  "Access-Control-Allow-Methods": "POST, OPTIONS", 
};

// Definisikan logika handler
async function handler(req: Request): Promise<Response> {
  // Handle preflight request (OPTIONS) dengan header yang lengkap
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
        headers: {
            ...corsHeaders,
            // Header tambahan yang dibutuhkan browser untuk preflight
            'Access-Control-Max-Age': '86400', 
        }
    });
  }

  console.log("FUNCTION START: create-user invoked."); 

  let newUserId: string | null = null;
  let newProfileId: string | null = null;
  let employeeRecordCreated = false; 

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
    
    // ... Validasi Input ...
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
    console.log("LOG: Creating auth user...");
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });

    if (authError) throw authError;

    newUserId = authData.user.id;
    console.log("LOG: Auth user created with ID:", newUserId);

    // 4. Menyisipkan data ke tabel 'profiles'
    console.log("LOG: Inserting profile record...");
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
      console.error("Gagal insert ke profiles. Melakukan rollback user:", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw profileError;
    }

    newProfileId = profileData.id;
    console.log("LOG: Profile created with ID:", newProfileId);

    // 5. Menyisipkan data ke tabel 'employees'
    console.log("LOG: Inserting employee record...");
    const { error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        profile_id: newProfileId,
        position: position,
        group_id: groupId || null,
      });

    if (employeeError) {
      throw employeeError; 
    }
    employeeRecordCreated = true; 
    console.log("LOG: Employee record created successfully.");


    // 6. Kirim respon sukses
    console.log("FUNCTION END: User successfully created and response sent.");
    return new Response(
      JSON.stringify({ message: "User berhasil dibuat!" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    // Tangani semua error dan lakukan rollback jika diperlukan
    console.error("Kesalahan umum di create-user:", error.message);

    // --- LOGIKA ROLLBACK KRITIS ---
    if (newUserId) {
        // Coba hapus Auth User (ini akan menghapus semua yang terkait di RLS, termasuk Profile)
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
        if (deleteAuthError) {
            console.warn("Rollback warning: Gagal menghapus auth user (mungkin sudah terhapus):", deleteAuthError.message);
        } else {
            console.log("LOG: Rollback successful. Auth user (dan Profile) dihapus:", newUserId);
        }

        // Jika profile terlanjur dibuat tapi employee gagal (dan RLS gagal menghapus Profile)
        if (newProfileId && !employeeRecordCreated) {
           const { error: deleteProfileError } = await supabaseAdmin.from("profiles").delete().eq("id", newProfileId);
           if (!deleteProfileError) {
              console.log("LOG: Rollback successful. Profile dihapus:", newProfileId);
           }
        }
    }
    // --- AKHIR LOGIKA ROLLBACK KRITIS ---

    // Kirim respons error
    const friendlyErrorMessage = error.message.includes("duplicate key") 
        ? "Email atau Username sudah terdaftar. Silakan gunakan yang lain."
        : error.message;

    return new Response(
      JSON.stringify({ error: friendlyErrorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
}

// Ekspor handler sebagai default
export default handler;