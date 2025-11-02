import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type UserRole = "superadmin" | "leader" | "admin" | "staff" | "viewer";

// Tipe data dari tabel Profiles
interface Profile {
  id: string; // Ini adalah profile_id
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  status: string;
  // Tambahkan group_id jika ada di profiles, atau kita ambil dari employees
}

// Tipe data dari tabel Employees
interface Employee {
  id: string; // Ini adalah employee_id (YANG KITA BUTUHKAN)
  profile_id: string;
  group_id: string | null;
  position: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  employee: Employee | null; // <-- TAMBAHAN
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null); // <-- TAMBAHAN
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fungsi untuk fetch data user (profile & employee)
    const fetchUserData = async (userId: string) => {
      setLoading(true);
      try {
        // 1. Ambil data profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // 2. Jika profile ada, ambil data employee
        if (profileData) {
          const { data: employeeData, error: employeeError } = await supabase
            .from("employees")
            .select("*")
            .eq("profile_id", profileData.id) // Link via profile.id
            .single();

          if (employeeError) {
            console.warn("User profile found, but no employee record linked.");
            setEmployee(null);
          } else {
            setEmployee(employeeData); // <-- SET EMPLOYEE
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setProfile(null);
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setEmployee(null); // <-- TAMBAHAN
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // navigate("/dashboard"); // Dihapus agar navigasi ditangani di Login.tsx
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    setEmployee(null); // <-- TAMBAHAN
    if (error) throw error;
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, profile, employee, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};