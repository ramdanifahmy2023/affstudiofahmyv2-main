-- Create enum types for better data integrity
CREATE TYPE user_role AS ENUM ('superadmin', 'leader', 'admin', 'staff', 'viewer');
CREATE TYPE account_platform AS ENUM ('shopee', 'tiktok');
CREATE TYPE account_status AS ENUM ('active', 'banned_temporary', 'banned_permanent');
CREATE TYPE account_data_status AS ENUM ('empty', 'in_progress', 'rejected', 'verified');
CREATE TYPE shift_status AS ENUM ('smooth', 'dead_relive');
CREATE TYPE attendance_status AS ENUM ('present', 'leave', 'sick', 'absent');
CREATE TYPE expense_category AS ENUM ('fixed', 'variable');
CREATE TYPE commission_period AS ENUM ('M1', 'M2', 'M3', 'M4', 'M5');

-- 1. Profiles table (extends auth.users with additional info)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'viewer',
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  join_date DATE DEFAULT CURRENT_DATE,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Employees table (maps profiles to groups)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Devices table
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  imei TEXT NOT NULL,
  google_account TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(15,2),
  screenshot_url TEXT,
  group_id UUID UNIQUE REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Affiliate Accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform account_platform NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  phone TEXT,
  account_status account_status DEFAULT 'active',
  data_status account_data_status DEFAULT 'empty',
  group_id UUID UNIQUE REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Daily Reports table
CREATE TABLE public.daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_status shift_status NOT NULL,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  total_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, report_date)
);

-- 7. Attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status attendance_status DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

-- 8. Commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  period commission_period NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_commission DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_commission DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_commission DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Cashflow table
CREATE TABLE public.cashflow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category expense_category,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  proof_url TEXT,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_price DECIMAL(15,2) NOT NULL,
  current_value DECIMAL(15,2),
  condition TEXT,
  location TEXT,
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Debt and Receivables table
CREATE TABLE public.debt_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('debt', 'receivable')),
  counterparty TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  description TEXT,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. Knowledge Base table (SOP & Tutorials)
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13. KPI Targets table
CREATE TABLE public.kpi_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_month DATE NOT NULL,
  sales_target DECIMAL(15,2) NOT NULL DEFAULT 0,
  commission_target DECIMAL(15,2) NOT NULL DEFAULT 0,
  attendance_target INTEGER DEFAULT 22,
  actual_sales DECIMAL(15,2) DEFAULT 0,
  actual_commission DECIMAL(15,2) DEFAULT 0,
  actual_attendance INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, target_month)
);

-- 14. Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 15. Audit Logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Superadmin can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Superadmin and Leader can manage profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader'))
);

-- RLS Policies for Groups
CREATE POLICY "Everyone can view groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Superadmin and Leader can manage groups" ON public.groups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader'))
);

-- RLS Policies for Employees
CREATE POLICY "Everyone can view employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Superadmin and Leader can manage employees" ON public.employees FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader'))
);

-- RLS Policies for Devices
CREATE POLICY "Everyone can view devices" ON public.devices FOR SELECT USING (true);
CREATE POLICY "Superadmin and Leader can manage devices" ON public.devices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader'))
);

-- RLS Policies for Accounts
CREATE POLICY "Everyone can view accounts" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "Superadmin and Leader can manage accounts" ON public.accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader'))
);

-- RLS Policies for Daily Reports
CREATE POLICY "Staff can manage their own reports" ON public.daily_reports FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.profiles p ON p.id = e.profile_id
    WHERE e.id = daily_reports.employee_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Superadmin and Leader can view all reports" ON public.daily_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader', 'admin', 'viewer'))
);

-- RLS Policies for Attendance
CREATE POLICY "Staff can manage their own attendance" ON public.attendance FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.profiles p ON p.id = e.profile_id
    WHERE e.id = attendance.employee_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Everyone can view attendance" ON public.attendance FOR SELECT USING (true);

-- RLS Policies for Commissions
CREATE POLICY "Everyone can view commissions" ON public.commissions FOR SELECT USING (true);
CREATE POLICY "Superadmin and Leader can manage commissions" ON public.commissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader'))
);

-- RLS Policies for Cashflow
CREATE POLICY "Everyone can view cashflow" ON public.cashflow FOR SELECT USING (true);
CREATE POLICY "Superadmin, Leader, Admin can create cashflow" ON public.cashflow FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader', 'admin'))
);
CREATE POLICY "Superadmin can manage cashflow" ON public.cashflow FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'superadmin')
);

-- RLS Policies for other tables (simplified for viewer access)
CREATE POLICY "Everyone can view assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Superadmin and Admin can manage assets" ON public.assets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin'))
);

CREATE POLICY "Everyone can view debt_receivable" ON public.debt_receivable FOR SELECT USING (true);
CREATE POLICY "Superadmin and Admin can manage debt_receivable" ON public.debt_receivable FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin'))
);

CREATE POLICY "Everyone can view knowledge_base" ON public.knowledge_base FOR SELECT USING (true);
CREATE POLICY "Superadmin can manage knowledge_base" ON public.knowledge_base FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Everyone can view kpi_targets" ON public.kpi_targets FOR SELECT USING (true);
CREATE POLICY "Superadmin and Leader can manage kpi_targets" ON public.kpi_targets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader'))
);

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Everyone can view audit_logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader'))
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cashflow_updated_at BEFORE UPDATE ON public.cashflow FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_debt_receivable_updated_at BEFORE UPDATE ON public.debt_receivable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kpi_targets_updated_at BEFORE UPDATE ON public.kpi_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_employees_profile_id ON public.employees(profile_id);
CREATE INDEX idx_employees_group_id ON public.employees(group_id);
CREATE INDEX idx_devices_group_id ON public.devices(group_id);
CREATE INDEX idx_accounts_group_id ON public.accounts(group_id);
CREATE INDEX idx_daily_reports_employee_id ON public.daily_reports(employee_id);
CREATE INDEX idx_daily_reports_date ON public.daily_reports(report_date);
CREATE INDEX idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX idx_commissions_account_id ON public.commissions(account_id);
CREATE INDEX idx_cashflow_date ON public.cashflow(transaction_date);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);