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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Definisi Role untuk akses ke halaman Management/Financial (Semua kecuali Staff)
const MANAGEMENT_ROLES = ["superadmin", "leader", "admin", "viewer"];
const ALL_ROLES = ["superadmin", "leader", "admin", "staff", "viewer"];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* --- RESTRICTED PAGES (Block Staff) --- */}
            <Route
              path="/performance"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Performance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commissions"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Commissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cashflow"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Cashflow />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/devices"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Devices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Accounts />
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/assets"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <Assets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debt-receivable"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <DebtReceivable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kpi"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <KPI />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profit-loss"
              element={
                <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
                  <ProfitLoss />
                </ProtectedRoute>
              }
            />
            
            {/* --- STAFF ONLY / ALL ACCESS PAGES --- */}
            <Route
              path="/daily-report"
              element={
                <ProtectedRoute allowedRoles={["staff"]}>
                  <DailyReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <Attendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge"
              element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <Knowledge />
                </ProtectedRoute>
              }
            />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;