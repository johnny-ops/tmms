import React, { useState } from 'react';
import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Sidebar, NavSection } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, UserCheck, Settings, Bell, FileText,
  Car, ClipboardList, RefreshCw, AlertTriangle, Ticket, Camera, Eye,
  ClipboardCheck, ShieldCheck, Map, ParkingSquare, Building2,
  BarChart3, TrendingUp, Route, Brain, BookOpen, Shield, Contact,
  Clock, XCircle, Edit, Upload, LogOut, Megaphone
} from 'lucide-react';
import { UserRole } from '@/types';




interface BaseLayoutProps {
  navSections: NavSection[];
  allowedRoles: UserRole[];
}

function BaseLayout({ navSections, allowedRoles }: BaseLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
          <AlertTriangle size={14} /> DEMO ENVIRONMENT — Data shown is sample data
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop sidebar — hidden on mobile via CSS */}
        <div className="desktop-sidebar">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(prev => !prev)}
            navSections={navSections}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-body)' }}>
          <Topbar />
          <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', paddingBottom: 80 }} className="page-enter">
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
      { to: '/admin/staff', icon: <Shield size={18} />, label: 'Staff Management' },
      { to: '/admin/operators', icon: <Building2 size={18} />, label: 'Operator Management' },
      { to: '/admin/drivers', icon: <UserCheck size={18} />, label: 'Driver Management' },
      { to: '/admin/applications', icon: <ClipboardList size={18} />, label: 'Applications' },
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




// ─── Operator Pending / For-Correction Screen ──────────────────────────────
function OperatorPendingScreen({ user }: { user: any }) {
  const { signOut } = useAuth();
  const isPending = user.approval_status === 'PENDING';
  const isCorrection = user.approval_status === 'FOR_CORRECTION';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Logo bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, background: '#0d1f5c', display: 'flex', alignItems: 'center', padding: '0 32px', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/govserve.png" alt="TMMS" style={{ width: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>TMMS <span style={{ color: '#f97316', fontWeight: 400, fontSize: '0.75rem' }}>Operator Portal</span></span>
        <button onClick={signOut} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 560, width: '100%', marginTop: 64 }}>
        {/* Status card */}
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: `1.5px solid ${isPending ? '#fde68a' : '#fecaca'}`, padding: 40, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: isPending ? '#fffbeb' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            {isPending ? <Clock size={36} color="#d97706" /> : <Edit size={36} color="#dc2626" />}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            {isPending ? 'Registration Under Review' : 'Action Required'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            {isPending
              ? 'Your operator registration has been submitted and is currently being reviewed by our staff. You will be notified once your account is approved.'
              : 'Your registration requires correction. Please review the reason below and resubmit the required information.'}
          </p>

          {/* Status badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 20, background: isPending ? '#fffbeb' : '#fef2f2', border: `1px solid ${isPending ? '#fde68a' : '#fecaca'}`, color: isPending ? '#d97706' : '#dc2626', fontWeight: 700, fontSize: '0.85rem', marginBottom: 28 }}>
            {isPending ? <Clock size={16} /> : <XCircle size={16} />}
            {isPending ? 'PENDING REVIEW' : 'FOR CORRECTION'}
          </div>

          {/* Correction reason */}
          {isCorrection && user.correction_reason && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 20, marginBottom: 28, textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 8 }}>CORRECTION REASON</div>
              <p style={{ color: '#dc2626', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{user.correction_reason}</p>
            </div>
          )}

          {/* Steps */}
          {isPending && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20, marginBottom: 28, textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 12 }}>WHAT HAPPENS NEXT</div>
              {['Admin reviews your submitted documents', 'You receive a notification upon approval', 'Login to access your full Operator Dashboard'].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={signOut} style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', marginTop: 16 }}>
          Need help? Contact the LGU Office or call your area transport authority.
        </p>
      </div>
    </div>
  );
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
      { to: '/operator/announcements', icon: <Megaphone size={18} />, label: 'Announcements' },
    ]
  }
];

export function OperatorLayout() {
  const { user } = useAuth();
  
  // If operator is pending or needs correction, show status screen
  if (user && user.role === 'OPERATOR') {
    const status = (user as any).approval_status;
    if (status === 'PENDING' || status === 'FOR_CORRECTION') {
      return <OperatorPendingScreen user={user} />;
    }
  }

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
      { to: '/driver/announcements', icon: <Megaphone size={18} />, label: 'Announcements' },
    ]
  }
];


export function DriverLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isDemoMode, hasPermission } = useAuth();

  if (!user || !hasPermission(['DRIVER', 'ADMIN'])) {
    if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  const mobileNavItems = [
    { to: '/driver/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
    { to: '/driver/vehicle', icon: <Car size={20} />, label: 'Vehicle' },
    { to: '/driver/announcements', icon: <Megaphone size={20} />, label: 'Notices' },
    { to: '/driver/violations', icon: <AlertTriangle size={20} />, label: 'Violations' },
    { to: '/driver/profile', icon: <Contact size={20} />, label: 'Profile' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-body)' }}>
      {isDemoMode && (
        <div style={{
          background: '#f3eeff', color: '#6d28d9', textAlign: 'center', padding: '8px',
          fontSize: '0.8125rem', fontWeight: 500, borderBottom: '1px solid #ddd6fe',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
        }}>
          <AlertTriangle size={14} /> DEMO ENVIRONMENT
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop sidebar */}
        <div className="desktop-sidebar">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(prev => !prev)}
            navSections={driverNav}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-body)' }}>
          <Topbar />
          <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="page-enter">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV BAR ── */}
      <nav style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#ffffff', borderTop: '1.5px solid #e2e8f0',
        zIndex: 100,
        padding: '8px 0 12px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }} className="mobile-bottom-nav">
        {mobileNavItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              flex: 1, padding: '4px 0', textDecoration: 'none',
              color: isActive ? '#0e1629' : '#94a3b8',
              transition: 'color 0.15s',
            })}
          >
            {item.icon}
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.02em' }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
