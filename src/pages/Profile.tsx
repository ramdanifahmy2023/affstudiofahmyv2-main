import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, MapPin, Calendar, Eye, EyeOff, Settings, Bell, Shield, LogOut } from "lucide-react";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  avatar_url: string;
  role: string;
  status: string;
  join_date: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  commission_alerts: boolean;
  attendance_reminders: boolean;
  report_reminders: boolean;
}

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    id: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    avatar_url: "",
    role: "",
    status: "",
    join_date: ""
  });
  
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    commission_alerts: true,
    attendance_reminders: true,
    report_reminders: true
  });
  
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        id: profile.id,
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        date_of_birth: profile.date_of_birth || "",
        avatar_url: profile.avatar_url || "",
        role: profile.role || "",
        status: profile.status || "",
        join_date: profile.join_date || ""
      });
    }
  }, [profile]);

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          address: profileData.address,
          date_of_birth: profileData.date_of_birth || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", profileData.id);

      if (error) throw error;

      toast.success("Profil berhasil diperbarui!");
    } catch (error: any) {
      toast.error("Gagal memperbarui profil: " + error.message);
    }
    setIsLoading(false);
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Password baru tidak cocok!");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Password minimal 8 karakter!");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success("Password berhasil diubah!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error: any) {
      toast.error("Gagal mengubah password: " + error.message);
    }
    setIsLoading(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setIsLoading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', profileData.id);

      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, avatar_url: data.publicUrl }));
      toast.success("Avatar berhasil diperbarui!");
    } catch (error: any) {
      toast.error("Gagal mengupload avatar: " + error.message);
    }
    setIsLoading(false);
  };

  const generateAvatar = () => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const initials = profileData.full_name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase();
    
    return (
      <div className={`w-full h-full ${randomColor} flex items-center justify-center text-white font-bold text-2xl`}>
        {initials}
      </div>
    );
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logout berhasil!");
    } catch (error: any) {
      toast.error("Gagal logout: " + error.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-500';
      case 'leader': return 'bg-blue-500';
      case 'admin': return 'bg-green-500';
      case 'staff': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pengaturan Akun</h1>
          <p className="text-gray-600 dark:text-gray-400">Kelola informasi profil dan pengaturan akun Anda</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Keamanan
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifikasi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Profil</CardTitle>
                <CardDescription>
                  Perbarui informasi profil dan foto Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profileData.avatar_url} />
                    <AvatarFallback>
                      {generateAvatar()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatar">Foto Profil</Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="w-auto"
                    />
                    <p className="text-xs text-gray-500">
                      PNG, JPG hingga 2MB
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Profile Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nama Lengkap</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">No. HP</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Tanggal Lahir</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={profileData.date_of_birth}
                      onChange={(e) => setProfileData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Role and Status Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleBadgeColor(profileData.role)}>
                          {profileData.role?.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Role Anda</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2">
                        <Badge variant={profileData.status === 'active' ? 'default' : 'secondary'}>
                          {profileData.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Status Akun</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {profileData.join_date ? new Date(profileData.join_date).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Bergabung</p>
                    </CardContent>
                  </Card>
                </div>

                <Button onClick={handleProfileUpdate} disabled={isLoading} className="w-full">
                  {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ubah Password</CardTitle>
                <CardDescription>
                  Pastikan akun Anda menggunakan password yang kuat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Password Saat Ini</Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showPassword.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new_password">Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showPassword.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showPassword.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button onClick={handlePasswordChange} disabled={isLoading} className="w-full">
                  {isLoading ? "Mengubah..." : "Ubah Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Notifikasi</CardTitle>
                <CardDescription>
                  Kelola preferensi notifikasi Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-500">Terima notifikasi melalui email</p>
                    </div>
                    <Switch
                      checked={notifications.email_notifications}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, email_notifications: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-gray-500">Terima notifikasi push di browser</p>
                    </div>
                    <Switch
                      checked={notifications.push_notifications}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, push_notifications: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Komisi Alert</Label>
                      <p className="text-sm text-gray-500">Notifikasi saat komisi cair</p>
                    </div>
                    <Switch
                      checked={notifications.commission_alerts}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, commission_alerts: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Pengingat Absensi</Label>
                      <p className="text-sm text-gray-500">Reminder absensi setiap jam 08:00</p>
                    </div>
                    <Switch
                      checked={notifications.attendance_reminders}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, attendance_reminders: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Pengingat Laporan</Label>
                      <p className="text-sm text-gray-500">Reminder jurnal harian setiap jam 16:00</p>
                    </div>
                    <Switch
                      checked={notifications.report_reminders}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, report_reminders: checked }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Logout Section */}
        <Card className="mt-6 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-red-700 dark:text-red-400">Logout</h3>
                <p className="text-sm text-red-600 dark:text-red-500">
                  Keluar dari akun Anda
                </p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Profile;