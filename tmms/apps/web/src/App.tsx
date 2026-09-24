import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

import { AdminLayout, StaffLayout } from './components/layout/RoleLayouts';

import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

import { AdminDashboard } from './pages/dashboard/AdminDashboard';
import { StaffDashboard } from './pages/dashboard/StaffDashboard';

import { PUVPage } from './pages/puv/PUVPage';
import { OperatorsPage } from './pages/puv/OperatorsPage';
import { DriversPage } from './pages/puv/DriversPage';
import { RoutesPage } from './pages/puv/RoutesPage';

import { FranchisePage } from './pages/franchise/FranchisePage';

import { ViolationsPage } from './pages/violations/ViolationsPage';
import { EvidencePage } from './pages/violations/EvidencePage';
import { AIMonitorPage } from './pages/ai/AIMonitorPage';
import { StaffAIReviewPage } from './pages/ai/StaffAIReviewPage';

import { InspectionsPage } from './pages/inspections/InspectionsPage';
import { RegistrationsPage } from './pages/compliance/RegistrationsPage';

import { ParkingAreasPage } from './pages/parking/ParkingAreasPage';
import { ParkingPage } from './pages/parking/ParkingPage';
import { TerminalsPage } from './pages/parking/TerminalsPage';

import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { ForecastingPage } from './pages/analytics/ForecastingPage';
import { RouteOptimizationPage } from './pages/analytics/RouteOptimizationPage';

import { ReportsPage } from './pages/system/ReportsPage';
import { UsersPage } from './pages/system/UsersPage';
import { SettingsPage } from './pages/system/SettingsPage';
import { NotificationsPage, AuditLogsPage, PlaceholderPage } from './pages/system/SystemPages';
import { ApprovalPage } from './pages/system/ApprovalPage';
import { SystemMonitoringPage } from './pages/system/SystemMonitoringPage';
import { AnnouncementsPage } from './pages/system/AnnouncementsPage';

import { Activity, UserCheck } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

function IndexRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'STAFF') return <Navigate to="/staff/dashboard" replace />;

  // Drivers & Operators belong on the website portal (port 5174)
  if (user.role === 'DRIVER' || user.role === 'OPERATOR') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#f8fafc' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Wrong Portal</h2>
        <p style={{ color: '#64748b' }}>Drivers and Operators use the Driver/Operator Portal.</p>
        <a href="http://localhost:5174/login" style={{ color: '#1d4ed8', fontWeight: 600, padding: '10px 20px', background: '#eff6ff', borderRadius: 8, textDecoration: 'none' }}>
          Go to Driver/Operator Portal →
        </a>
      </div>
    );
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<ProtectedRoute><IndexRedirect /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="operators" element={<OperatorsPage />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="approval" element={<ApprovalPage />} />
            <Route path="applications" element={<ApprovalPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="monitoring" element={<SystemMonitoringPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Staff-equivalent pages under admin — keeps Admin in AdminLayout */}
            <Route path="puv" element={<PUVPage />} />
            <Route path="franchise" element={<FranchisePage />} />
            <Route path="inspections" element={<InspectionsPage />} />
            <Route path="violations" element={<ViolationsPage />} />
            <Route path="ai-monitor" element={<AIMonitorPage />} />
            <Route path="ai-review" element={<StaffAIReviewPage />} />
            <Route path="parking-terminals" element={<ParkingAreasPage />} />
            <Route path="forecasting" element={<ForecastingPage />} />
            <Route path="routing" element={<RouteOptimizationPage />} />
          </Route>

          {/* Staff Routes */}
          <Route path="/staff" element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}><StaffLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="puv" element={<PUVPage />} />
            <Route path="franchise" element={<FranchisePage />} />
            <Route path="inspections" element={<InspectionsPage />} />
            <Route path="registrations" element={<RegistrationsPage />} />
            <Route path="approval" element={<ApprovalPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="violations" element={<ViolationsPage />} />
            <Route path="ai-review" element={<StaffAIReviewPage />} />
            <Route path="ai-monitor" element={<AIMonitorPage />} />
            <Route path="parking-terminals" element={<ParkingAreasPage />} />
            <Route path="forecasting" element={<ForecastingPage />} />
            <Route path="routing" element={<RouteOptimizationPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
