// supabase/functions/create-user/index.ts
// FIXED VERSION - Proper rollback & transaction handling
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Response Helper
function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// Main Handler
async function handler(req: Request): Promise<Response> {
  // Handle Preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  console.log("CREATE-USER FUNCTION INVOKED");
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  let newUserId: string | null = null;
  let newProfileId: string | null = null;

  try {
    // Step 1: Parse Request Body
    const body = await req.json();
    console.log("Request Body Received:", {
      email: body.email,
      role: body.role,
      position: body.position,
      groupId: body.groupId
    });

    const {
      email,
      password,
      fullName,
      phone,
      role,
      position,
      groupId,
      status = "active",
      date_of_birth,
      address,
    } = body;

    // Step 2: Validate Input
    if (!email || !password || !fullName || !role || !position) {
      console.error("Validation failed: Missing required fields");
      return jsonResponse(
        { 
          success: false, 
          error: "Email, password, nama lengkap, role, dan jabatan wajib diisi." 
        },
        400
      );
    }

    if (password.length < 8) {
      console.error("Validation failed: Password too short");
      return jsonResponse(
        { 
          success: false, 
          error: "Password minimal 8 karakter." 
        },
        400
      );
    }

    // Step 3: Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables");
      return jsonResponse(
        { 
          success: false, 
          error: "Server configuration error. Contact administrator." 
        },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Step 4: Check if email already exists
    console.log("Checking if email already exists:", email);
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("email", email.trim())
      .single();

    if (existingProfile) {
      console.error("Email already exists in profiles");
      return jsonResponse({
        success: false,
        error: "Email sudah terdaftar. Gunakan email lain."
      }, 400);
    }

    // Step 5: Create Auth User
    console.log("Creating auth user for:", email);
    const { data: authData, error: authError } = 
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          role: role
        }
      });

    if (authError) {
      console.error("Auth creation failed:", authError);
      
      if (authError.message.includes("already registered")) {
        return jsonResponse({
          success: false,
          error: "Email sudah terdaftar. Gunakan email lain."
        }, 400);
      }
      
      throw new Error(`Auth error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("User creation succeeded but no user data returned");
    }

    newUserId = authData.user.id;
    console.log("Auth user created successfully. ID:", newUserId);

    // Step 6: Insert Profile
    console.log("Creating profile for user:", newUserId);
    const { data: profileData, error: profileError } = 
      await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: newUserId,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone?.trim() || null,
          role: role,
          status: status,
          address: address?.trim() || null,
          date_of_birth: date_of_birth || null,
        })
        .select("id")
        .single();

    if (profileError) {
      console.error("Profile creation failed:", profileError);
      // Rollback: Delete auth user
      console.log("Rolling back: Deleting auth user", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      
      if (profileError.message.includes("duplicate key")) {
        return jsonResponse({
          success: false,
          error: "Email sudah terdaftar di sistem."
        }, 400);
      }
      
      throw new Error(`Profile error: ${profileError.message}`);
    }

    if (!profileData) {
      console.log("Rolling back: No profile data returned");
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error("Profile creation succeeded but no data returned");
    }

    newProfileId = profileData.id;
    console.log("Profile created successfully. ID:", newProfileId);

    // Step 7: Check if employee with this profile_id already exists
    console.log("Checking if employee record already exists for profile:", newProfileId);
    const { data: existingEmployee } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("profile_id", newProfileId)
      .single();

    if (existingEmployee) {
      console.error("Employee record already exists for this profile_id");
      // This profile already has an employee record, so we're done
      console.log("Employee already exists with ID:", existingEmployee.id);
      
      return jsonResponse({
        success: true,
        message: "Karyawan berhasil ditambahkan!",
        data: {
          userId: newUserId,
          profileId: newProfileId,
          employeeId: existingEmployee.id,
        },
      }, 201);
    }

    // Step 8: Insert Employee
    console.log("Creating employee record for profile:", newProfileId);
    
    // Handle "no-group" from frontend
    const finalGroupId = (groupId === "no-group" || !groupId) ? null : groupId;

    const { data: employeeData, error: employeeError } = 
      await supabaseAdmin
        .from("employees")
        .insert({
          profile_id: newProfileId,
          position: position?.trim() || null,
          group_id: finalGroupId,
        })
        .select("id")
        .single();

    if (employeeError) {
      console.error("Employee creation failed:", employeeError);
      
      // IMPORTANT: Rollback both profile AND auth user
      console.log("Rolling back: Deleting profile", newProfileId);
      await supabaseAdmin.from("profiles").delete().eq("id", newProfileId);
      
      console.log("Rolling back: Deleting auth user", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      
      if (employeeError.message.includes("foreign key")) {
        return jsonResponse({
          success: false,
          error: "Group ID tidak valid. Pilih group yang tersedia."
        }, 400);
      }
      
      if (employeeError.message.includes("duplicate key")) {
        return jsonResponse({
          success: false,
          error: "Data karyawan sudah ada untuk profile ini."
        }, 400);
      }
      
      throw new Error(`Employee error: ${employeeError.message}`);
    }

    if (!employeeData) {
      console.log("Rolling back: No employee data returned");
      await supabaseAdmin.from("profiles").delete().eq("id", newProfileId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error("Employee creation succeeded but no data returned");
    }

    const newEmployeeId = employeeData.id;
    console.log("Employee created successfully. ID:", newEmployeeId);

    // Step 9: Success Response
    console.log("USER CREATION COMPLETED SUCCESSFULLY");
    return jsonResponse({
      success: true,
      message: "Karyawan berhasil ditambahkan!",
      data: {
        userId: newUserId,
        profileId: newProfileId,
        employeeId: newEmployeeId,
      },
    }, 201);

  } catch (error: any) {
    console.error("ERROR IN CREATE-USER FUNCTION:", error);

    // Cleanup orphaned records if they exist
    if (newProfileId && newUserId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (supabaseUrl && supabaseKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
          
          console.log("Emergency cleanup: Deleting orphaned profile", newProfileId);
          await supabaseAdmin.from("profiles").delete().eq("id", newProfileId);
          
          console.log("Emergency cleanup: Deleting orphaned auth user", newUserId);
          await supabaseAdmin.auth.admin.deleteUser(newUserId);
        }
      } catch (cleanupError) {
        console.error("Cleanup failed:", cleanupError);
      }
    }

    // Enhanced error messages
    let friendlyMessage = error.message;

    if (error.message.includes("duplicate key value violates unique constraint")) {
      if (error.message.includes("profiles_email_key")) {
        friendlyMessage = "Email sudah terdaftar. Gunakan email lain.";
      } else if (error.message.includes("employees_profile_id_key")) {
        friendlyMessage = "Data karyawan sudah ada untuk profile ini.";
      } else {
        friendlyMessage = "Data sudah ada. Periksa email atau username.";
      }
    } else if (error.message.includes("violates foreign key constraint")) {
      friendlyMessage = "Group ID tidak valid. Pilih group yang tersedia.";
    } else if (error.message.includes("permission denied") || error.message.includes("JWT")) {
      friendlyMessage = "Akses ditolak. Hubungi administrator sistem.";
    } else if (error.message.includes("already registered")) {
      friendlyMessage = "Email sudah terdaftar di sistem.";
    }

    return jsonResponse({
      success: false,
      error: friendlyMessage,
      details: Deno.env.get("ENVIRONMENT") === "development" ? error.message : undefined,
    }, 500);
  }
}

// Export handler
Deno.serve(handler);