import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

// Core
import { DashboardPage } from './pages/dashboard/DashboardPage';

// PUV
import { PUVPage } from './pages/puv/PUVPage';
import { OperatorsPage } from './pages/puv/OperatorsPage';
import { DriversPage } from './pages/puv/DriversPage';
import { RoutesPage } from './pages/puv/RoutesPage';

// Franchise
import { FranchisePage } from './pages/franchise/FranchisePage';

// Traffic
import { ViolationsPage } from './pages/violations/ViolationsPage';
import { EvidencePage } from './pages/violations/EvidencePage';
import { AIMonitorPage } from './pages/ai/AIMonitorPage';

// Compliance
import { InspectionsPage } from './pages/inspections/InspectionsPage';
import { RegistrationsPage } from './pages/compliance/RegistrationsPage';

// Parking & Terminals
import { ParkingAreasPage } from './pages/parking/ParkingAreasPage';
import { ParkingPage } from './pages/parking/ParkingPage';
import { TerminalsPage } from './pages/parking/TerminalsPage';

// Analytics & AI
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { ForecastingPage } from './pages/analytics/ForecastingPage';
import { RouteOptimizationPage } from './pages/analytics/RouteOptimizationPage';

// System
import { ReportsPage } from './pages/system/ReportsPage';
import { UsersPage } from './pages/system/UsersPage';
import { SettingsPage } from './pages/system/SettingsPage';
import { NotificationsPage, AuditLogsPage } from './pages/system/SystemPages';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* PUV & Transport */}
            <Route path="puv" element={<PUVPage />} />
            <Route path="operators" element={<OperatorsPage />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="routes" element={<RoutesPage />} />

            {/* Franchise */}
            <Route path="franchise" element={<FranchisePage />} />
            <Route path="franchise/applications" element={<FranchisePage />} />
            <Route path="franchise/renewals" element={<FranchisePage />} />

            {/* Traffic */}
            <Route path="violations" element={<ViolationsPage />} />
            <Route path="tickets" element={<ViolationsPage />} />
            <Route path="evidence" element={<EvidencePage />} />
            <Route path="ai-monitor" element={<AIMonitorPage />} />

            {/* Compliance */}
            <Route path="inspections" element={<InspectionsPage />} />
            <Route path="registrations" element={<RegistrationsPage />} />

            {/* Parking & Terminals */}
            <Route path="parking/areas" element={<ParkingAreasPage />} />
            <Route path="parking/slots" element={<ParkingPage />} />
            <Route path="parking/sessions" element={<ParkingPage />} />
            <Route path="terminals" element={<TerminalsPage />} />
            <Route path="terminals/operations" element={<TerminalsPage />} />

            {/* Analytics & AI */}
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="forecasting" element={<ForecastingPage />} />
            <Route path="route-optimization" element={<RouteOptimizationPage />} />
            <Route path="ai-analytics" element={<AIMonitorPage />} />

            {/* System */}
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<UsersPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="ai-models" element={<AIMonitorPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

