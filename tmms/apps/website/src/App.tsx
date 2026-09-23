import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import LandingPage from "./LandingPage";

import { OperatorLayout, DriverLayout } from "./components/layout/RoleLayouts";

import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { OTPVerificationPage } from "./pages/auth/OTPVerificationPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";

import { OperatorDashboard } from "./pages/dashboard/OperatorDashboard";
import { DriverDashboard } from "./pages/dashboard/DriverDashboard";

import { OperatorProfilePage } from "./pages/operator/OperatorProfilePage";
import { OperatorFranchisesPage } from "./pages/operator/OperatorFranchisesPage";
import { OperatorVehiclesPage } from "./pages/operator/OperatorVehiclesPage";
import { OperatorDriversPage } from "./pages/operator/OperatorDriversPage";
import { OperatorStatusPage } from "./pages/operator/OperatorStatusPage";
import { OperatorViolationsPage } from "./pages/operator/OperatorViolationsPage";
import { OperatorApplicationsPage } from "./pages/operator/OperatorApplicationsPage";

import { DriverProfilePage } from "./pages/driver/DriverProfilePage";
import { DriverLicensePage } from "./pages/driver/DriverLicensePage";
import { DriverVehiclePage } from "./pages/driver/DriverVehiclePage";
import { DriverViolationsPage } from "./pages/driver/DriverViolationsPage";
import { DriverApplicationPage } from "./pages/driver/DriverApplicationPage";

import { NotificationsPage } from "./pages/system/SystemPages";
import { ParkingAreasPage } from "./pages/parking/ParkingAreasPage";
import { RouteOptimizationPage } from "./pages/analytics/RouteOptimizationPage";
import { AnnouncementsPage } from "./pages/announcements/AnnouncementsPage";

function IndexRedirect() {
  const { user, loading } = useAuth();

  // ── CRITICAL: Detect Supabase password recovery token in URL hash ──────────
  // When a user clicks the reset password link in their email, Supabase redirects
  // them to the root domain with #access_token=...&type=recovery in the hash.
  // We must intercept this BEFORE showing any other page and send them to /reset-password.
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      return <Navigate to={`/reset-password${hash}`} replace />;
    }
  }

  if (loading) return <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  // Show landing page for unauthenticated visitors
  if (!user) return <LandingPage />;
  // Route logged-in users to their dashboard
  if (user.role === "OPERATOR") return <Navigate to="/operator/dashboard" replace />;
  if (user.role === "DRIVER") return <Navigate to="/driver/dashboard" replace />;
  // Staff/Admin → redirect to main dashboard
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, background: "#f8fafc" }}>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Staff / Admin Portal</h2>
      <p style={{ color: "#64748b" }}>Please use the Staff Dashboard on port 5173.</p>
      <a href="http://localhost:5173" style={{ color: "#1d4ed8", fontWeight: 600, padding: "10px 20px", background: "#eff6ff", borderRadius: 8, textDecoration: "none" }}>
        Go to Staff Dashboard →
      </a>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page / home */}
          <Route path="/" element={<IndexRedirect />} />

          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<OTPVerificationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Operator dashboard */}
          <Route path="/operator" element={<ProtectedRoute allowedRoles={['OPERATOR', 'ADMIN']}><OperatorLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/operator/dashboard" replace />} />
            <Route path="dashboard" element={<OperatorDashboard />} />
            <Route path="profile" element={<OperatorProfilePage />} />
            <Route path="franchises" element={<OperatorFranchisesPage />} />
            <Route path="vehicles" element={<OperatorVehiclesPage />} />
            <Route path="applications" element={<OperatorApplicationsPage />} />
            <Route path="drivers" element={<OperatorDriversPage />} />
            <Route path="status" element={<OperatorStatusPage />} />
            <Route path="violations" element={<OperatorViolationsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
          </Route>

          {/* Driver dashboard */}
          <Route path="/driver" element={<ProtectedRoute allowedRoles={['DRIVER', 'ADMIN']}><DriverLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/driver/dashboard" replace />} />
            <Route path="dashboard" element={<DriverDashboard />} />
            <Route path="profile" element={<DriverProfilePage />} />
            <Route path="license" element={<DriverLicensePage />} />
            <Route path="applications" element={<DriverApplicationPage />} />
            <Route path="vehicle" element={<DriverVehiclePage />} />
            <Route path="violations" element={<DriverViolationsPage />} />
            <Route path="routing" element={<RouteOptimizationPage />} />
            <Route path="parking" element={<ParkingAreasPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
