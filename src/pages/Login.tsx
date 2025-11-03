// src/pages/Login.tsx

import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Loader2, Zap } from "lucide-react";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, isLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate(); // <-- 1. Panggil hook navigasi

  // Redirect ke dashboard setelah login berhasil
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!email || !password) {
      toast({
        title: "Gagal Login ⚠️",
        description: "Email dan Password harus diisi.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
        await signIn(email, password);
        
        toast({
            title: "Login Berhasil 🎉",
            description: "Anda berhasil masuk ke FAHMYID Digital Marketing System.",
            duration: 2000,
        });
        
        // --- 2. PERBAIKAN DI SINI: Arahkan ke dashboard ---
        navigate("/dashboard");
        // ------------------------------------------
    
    } catch (error: any) {
        let errorMessage = "Terjadi kesalahan saat login. Silakan coba lagi.";
        
        if (error.message && (error.message.includes("Invalid login credentials") || error.message.includes("invalid_grant"))) {
            errorMessage = "Email atau Password salah. Mohon periksa kembali.";
        } else if (error.message && error.message.includes("Email not confirmed")) {
            errorMessage = "Akun Anda belum terverifikasi. Mohon cek email Anda.";
        } else if (error.message && error.message.includes("User not found")) {
            errorMessage = "Akun tidak ditemukan. Silakan hubungi Superadmin.";
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast({
            title: "Login Gagal 🔴",
            description: errorMessage,
            variant: "destructive",
        });

    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Zap className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl font-bold text-primary">FAHMYID DMS</CardTitle>
          <CardDescription>
            Sistem Manajemen Affiliate Marketing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(isLoading && !user) || isSubmitting ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-gray-500">Memproses...</span>
             </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@fahmy.id"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Masuk ke Sistem"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
            <p className="text-xs text-muted-foreground">© 2024 PT FAHMYID DIGITAL GROUP</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;