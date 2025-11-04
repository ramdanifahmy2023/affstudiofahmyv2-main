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
  const navigate = useNavigate();

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
            description: "Anda berhasil masuk ke FINTRACK Affiliate System.",
            duration: 2000,
        });
        
        navigate("/dashboard");
    
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
        <CardHeader className="text-center space-y-2 sm:space-y-4">
          <Zap className="h-10 w-10 sm:h-12 sm:w-12 text-primary mx-auto" />
          <CardTitle className="text-xl sm:text-2xl font-bold text-primary">
            FINTRACK Affiliate Sytem
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sistem Manajemen Affiliate Marketing by FahmyID Group
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {(isLoading && !user) || isSubmitting ? (
             <div className="flex flex-col justify-center items-center h-40 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-gray-500">Memproses...</span>
             </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="emailkamu@gmail.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 sm:h-11"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 h-10 sm:h-11 text-sm sm:text-base"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Login Sekarang"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center px-4 sm:px-6">
            <p className="text-xs text-muted-foreground text-center">
              © 2025 PT FAHMYID DIGITAL GROUP
            </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;