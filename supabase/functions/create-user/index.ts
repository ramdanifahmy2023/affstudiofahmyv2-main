// supabase/functions/create-user/index.ts (Final Refinement)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Header untuk menangani CORS (PENTING)
const corsHeaders = {
  // Izinkan akses dari mana saja (penting untuk pengembangan lokal/Vite)
  "Access-Control-Allow-Origin": "*",
  // Izinkan header yang dikirim oleh Supabase Client
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  // Tambahkan 'POST' dan 'OPTIONS' ke Allow-Methods untuk Preflight dan Main Request
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Definisikan logika handler
async function handler(req: Request): Promise<Response> {
  // Handle preflight request (OPTIONS) dengan header yang lengkap
  if (req.method === "OPTIONS") {
    // Memberikan response 'ok' dengan semua header CORS yang dibutuhkan
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        // Header tambahan yang dibutuhkan browser untuk preflight
        "Access-Control-Max-Age": "86400",
      },
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
      // --- TAMBAHAN BARU ---
      date_of_birth, // Akan berupa string YYYY-MM-DD atau null
      address, // Akan berupa string atau null
      // --------------------
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
    console.log("LOG: Inserting profile record for user_id:", newUserId);
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: newUserId,
        full_name: fullName,
        email: email,
        phone: phone || null,
        role: role,
        status: status,
        // --- TAMBAHAN BARU ---
        date_of_birth: date_of_birth || null,
        address: address || null,
        // --------------------
      })
      .select("id")
      .single();

    if (profileError) {
      console.error("Gagal insert ke profiles:", profileError.message);
      // Rollback Auth User, yang seharusnya menghapus profile juga karena ON DELETE CASCADE
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw profileError;
    }

    newProfileId = profileData.id;
    console.log("LOG: Profile created with ID:", newProfileId);

    // 5. Menyisipkan data ke tabel 'employees'
    console.log("LOG: Inserting employee record for profile_id:", newProfileId);
    const { error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        profile_id: newProfileId,
        position: position || null,
        group_id: groupId || null,
      });

    if (employeeError) {
      console.error("Gagal insert ke employees:", employeeError.message);
      // Rollback Auth User, yang seharusnya menghapus profile & employee karena ON DELETE CASCADE
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw employeeError;
    }
    employeeRecordCreated = true;
    console.log("LOG: Employee record created successfully.");

    // 6. Kirim respon sukses
    console.log("FUNCTION END: User successfully created and response sent.");
    return new Response(JSON.stringify({ message: "User berhasil dibuat!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    // Tangani semua error
    console.error("Kesalahan umum di create-user:", error.message);

    // Kirim respons error yang lebih mudah dipahami
    const friendlyErrorMessage = error.message.includes("duplicate key")
      ? "Email, Username, atau Profile ID sudah terdaftar. Gunakan yang lain."
      : error.message.includes("violates foreign key constraint")
        ? "Grup ID yang dipilih tidak valid."
        : error.message;

    return new Response(JSON.stringify({ error: friendlyErrorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500, // Mengembalikan 500 sebagai indikasi internal error (meski sudah difilter)
    });
  }
}

// Ekspor handler sebagai default
export default handler;