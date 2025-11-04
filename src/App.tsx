// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Performance from "./pages/Performance";
import DailyReport from "./pages/DailyReport";
import Attendance from "./pages/Attendance";
import Commissions from "./pages/Commissions";
import Cashflow from "./pages/Cashflow";
import Employees from "./pages/Employees";
import Devices from "./pages/Devices";
import Accounts from "./pages/Accounts";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails"; 
import Assets from "./pages/Asset";
import DebtReceivable from "./pages/DebtReceivable";
import ProfitLoss from "./pages/ProfitLoss";
import KPI from "./pages/KPI";
import Knowledge from "./pages/Knowledge";
import Profile from "./pages/Profile";
import AuditLogs from "./pages/AuditLogs"; // <-- Import Rute Baru
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Definisi Role (MANAGEMENT_ROLES sudah disesuaikan untuk blokir Staff)
const MANAGEMENT_ROLES = ["superadmin", "leader", "admin", "viewer"];
const MANAGEMENT_ROLES_ADMIN_ONLY = ["superadmin", "leader", "admin"]; // Role untuk Audit Logs
const ALL_ROLES = ["superadmin", "leader", "admin", "staff", "viewer"];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            
            {/* --- DASHBOARD (Akses Semua Role) --- */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            {/* --- RESTRICTED PAGES (Block Staff) --- */}
            
            {/* Performance */}
            <Route
              path="/performance"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Performance />
                </ProtectedRoute>
              }
            />
            
            {/* Commissions */}
            <Route
              path="/commissions"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Commissions />
                </ProtectedRoute>
              }
            />
            
            {/* Cashflow */}
            <Route
              path="/cashflow"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Cashflow />
                </ProtectedRoute>
              }
            />
            
            {/* Employees */}
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            
            {/* Devices */}
            <Route
              path="/devices"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Devices />
                </ProtectedRoute>
              }
            />
            
            {/* Accounts */}
            <Route
              path="/accounts"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Accounts />
                </ProtectedRoute>
              }
            />
            
            {/* Groups & Group Details */}
            <Route
              path="/groups"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Groups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <GroupDetails />
                </ProtectedRoute>
              }
            />
            
            {/* Assets */}
            <Route
              path="/assets"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Assets />
                </ProtectedRoute>
              }
            />
            
            {/* Debt & Receivable */}
            <Route
              path="/debt-receivable"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <DebtReceivable />
                </ProtectedRoute>
              }
            />
            
            {/* KPI Targets */}
            <Route
              path="/kpi"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <KPI />
                </ProtectedRoute>
              }
            />
            
            {/* Profit/Loss */}
            <Route
              path="/profit-loss"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <ProfitLoss />
                </ProtectedRoute>
              }
            />

            {/* --- AUDIT LOGS (Hanya untuk Superadmin, Leader, Admin) --- */}
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES_ADMIN_ONLY}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            
            {/* --- STAFF ONLY / ALL ACCESS PAGES --- */}
            
            {/* Daily Report (Hanya Staff) */}
            <Route
              path="/daily-report"
              element={
                <ProtectedRoute allowedRoles={["staff"]}>
                  <DailyReport />
                </ProtectedRoute>
              }
            />
            
            {/* Attendance (Semua role, tapi tampilan beda) */}
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <Attendance />
                </ProtectedRoute>
              }
            />
            
            {/* Knowledge (Semua role) */}
            <Route
              path="/knowledge"
              element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <Knowledge />
                </ProtectedRoute>
              }
            />
            
            {/* Profile (Semua role) */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;