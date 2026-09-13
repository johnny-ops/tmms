import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar, NavSection } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, UserCheck, Settings, Bell, FileText,
  Car, ClipboardList, RefreshCw, AlertTriangle, Ticket, Camera, Eye,
  ClipboardCheck, ShieldCheck, Map, ParkingSquare, Building2,
  BarChart3, TrendingUp, Route, Brain, BookOpen, Shield, Contact
} from 'lucide-react';
import { UserRole } from '@/types';




interface BaseLayoutProps {
  navSections: NavSection[];
  allowedRoles: UserRole[];
}

function BaseLayout({ navSections, allowedRoles }: BaseLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isDemoMode, hasPermission } = useAuth();

  
  if (!user || !hasPermission(allowedRoles)) {
    
    
    if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'STAFF') return <Navigate to="/staff/dashboard" replace />;
    if (user?.role === 'OPERATOR') return <Navigate to="/operator/dashboard" replace />;
    if (user?.role === 'DRIVER') return <Navigate to="/driver/dashboard" replace />;
    
    
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-body)' }}>
      {isDemoMode && (
        <div style={{
          background: '#f3eeff', color: '#6d28d9', textAlign: 'center', padding: '8px',
          fontSize: '0.8125rem', fontWeight: 500, borderBottom: '1px solid #ddd6fe',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
        }}>
          <AlertTriangle size={14} /> DEMO ENVIRONMENT — Data shown is sample data and does not represent real LGU records
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(prev => !prev)}
          navSections={navSections}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-body)' }}>
          <Topbar />
          <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} className="page-enter">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}




const adminNav: NavSection[] = [
  {
    title: '',
    items: [
      { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    ]
  },
  {
    title: 'Management',
    items: [
      { to: '/admin/users', icon: <Users size={18} />, label: 'User Management' },
      { to: '/admin/operators', icon: <Building2 size={18} />, label: 'Operator Management' },
      { to: '/admin/drivers', icon: <UserCheck size={18} />, label: 'Driver Management' },
      { to: '/admin/approval', icon: <ClipboardList size={18} />, label: 'Approval' },
    ]
  },
  {
    title: 'System',
    items: [
      { to: '/admin/monitoring', icon: <ActivityIcon size={18} />, label: 'System Monitoring' },
      { to: '/admin/reports', icon: <BookOpen size={18} />, label: 'Reports' },
      { to: '/admin/settings', icon: <Settings size={18} />, label: 'Settings' },
    ]
  },
];

function ActivityIcon({ size }: { size: number }) {
  return <BarChart3 size={size} />;
}

export function AdminLayout() {
  return <BaseLayout navSections={adminNav} allowedRoles={['ADMIN']} />;
}




const staffNav: NavSection[] = [
  {
    title: '',
    items: [
      { to: '/staff/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    ]
  },
  {
    title: 'PUV & Transport',
    items: [
      { to: '/staff/puv', icon: <Car size={18} />, label: 'PUV Database' },
      { to: '/staff/franchise', icon: <FileText size={18} />, label: 'Franchise Management' },
      { to: '/staff/inspections', icon: <ClipboardCheck size={18} />, label: 'Vehicle Inspection' },
    ]
  },
  {
    title: 'Traffic & Enforcement',
    items: [
      { to: '/staff/violations', icon: <Ticket size={18} />, label: 'Traffic Violation' },
      { to: '/staff/ai-monitor', icon: <Camera size={18} />, label: 'Live AI Monitoring' },
      { to: '/staff/ai-review', icon: <Eye size={18} />, label: 'AI Detection Review' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { to: '/staff/parking-terminals', icon: <Map size={18} />, label: 'Parking & Terminals' },
      { to: '/staff/forecasting', icon: <TrendingUp size={18} />, label: 'Demand Forecasting' },
      { to: '/staff/routing', icon: <Route size={18} />, label: 'Route Optimization' },
    ]
  },
  {
    title: 'Analytics',
    items: [
      { to: '/staff/reports', icon: <BookOpen size={18} />, label: 'Reports' },
    ]
  }
];

export function StaffLayout() {
  return <BaseLayout navSections={staffNav} allowedRoles={['STAFF', 'ADMIN']} />;
}




const operatorNav: NavSection[] = [
  {
    title: '',
    items: [
      { to: '/operator/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { to: '/operator/profile', icon: <Contact size={18} />, label: 'My Profile' },
    ]
  },
  {
    title: 'Fleet Management',
    items: [
      { to: '/operator/vehicles', icon: <Car size={18} />, label: 'My Vehicles' },
      { to: '/operator/applications', icon: <ClipboardList size={18} />, label: 'Driver Applications' },
      { to: '/operator/drivers', icon: <UserCheck size={18} />, label: 'Assigned Drivers' },
      { to: '/operator/franchises', icon: <FileText size={18} />, label: 'My Franchises' },
    ]
  },
  {
    title: 'Monitoring',
    items: [
      { to: '/operator/status', icon: <ShieldCheck size={18} />, label: 'Vehicle Status' },
      { to: '/operator/violations', icon: <AlertTriangle size={18} />, label: 'Violation Records' },
      { to: '/operator/notifications', icon: <Bell size={18} />, label: 'Notifications' },
    ]
  }
];

export function OperatorLayout() {
  return <BaseLayout navSections={operatorNav} allowedRoles={['OPERATOR', 'ADMIN']} />;
}




const driverNav: NavSection[] = [
  {
    title: '',
    items: [
      { to: '/driver/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { to: '/driver/profile', icon: <Contact size={18} />, label: 'My Profile' },
      { to: '/driver/license', icon: <ClipboardList size={18} />, label: 'License Information' },
    ]
  },
  {
    title: 'My Fleet',
    items: [
      { to: '/driver/applications', icon: <ClipboardList size={18} />, label: 'My Applications' },
      { to: '/driver/vehicle', icon: <Car size={18} />, label: 'My Vehicle' },
      { to: '/driver/violations', icon: <AlertTriangle size={18} />, label: 'Traffic Violations' },
    ]
  },
  {
    title: 'Navigation',
    items: [
      { to: '/driver/routing', icon: <Route size={18} />, label: 'Route Optimization' },
      { to: '/driver/parking', icon: <ParkingSquare size={18} />, label: 'Parking & Terminals' },
      { to: '/driver/notifications', icon: <Bell size={18} />, label: 'Notifications' },
    ]
  }
];

export function DriverLayout() {
  return <BaseLayout navSections={driverNav} allowedRoles={['DRIVER', 'ADMIN']} />;
}
