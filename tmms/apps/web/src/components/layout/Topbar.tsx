import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabel } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';

interface TopbarProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  puv: 'PUV Database',
  operators: 'Operators',
  drivers: 'Drivers',
  routes: 'Routes',
  franchise: 'Franchise',
  applications: 'Applications',
  renewals: 'Renewals',
  violations: 'Traffic Violations',
  tickets: 'Tickets',
  'ai-monitor': 'AI Detection Monitor',
  evidence: 'Evidence',
  inspections: 'Vehicle Inspection',
  registrations: 'Registration',
  parking: 'Parking',
  areas: 'Areas',
  slots: 'Slots',
  sessions: 'Sessions',
  terminals: 'Terminals',
  operations: 'Operations',
  analytics: 'Transportation Analytics',
  forecasting: 'Demand Forecast',
  'route-optimization': 'Route Optimization',
  'ai-analytics': 'AI Analytics',
  reports: 'Reports',
  users: 'Users',
  roles: 'Roles & Permissions',
  notifications: 'Notifications',
  'audit-logs': 'Audit Logs',
  'ai-models': 'AI Models',
  settings: 'Settings',
};

function useBreadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  return parts.map((part, i) => ({
    label: routeLabels[part] ?? part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    path: '/' + parts.slice(0, i + 1).join('/'),
    isLast: i === parts.length - 1,
  }));
}

export function Topbar({ onMenuToggle, isMobileMenuOpen }: TopbarProps) {
  const { user, isDemoMode } = useAuth();
  const breadcrumbs = useBreadcrumbs();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const unreadCount = 0;

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0 24px',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 40,
      flexShrink: 0,
    }}>
      {/* Breadcrumbs */}
      <nav style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {breadcrumbs.map((bc, i) => (
          <span key={bc.path} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>/</span>}
            <span style={{
              fontSize: '0.875rem',
              fontWeight: bc.isLast ? 500 : 400,
              color: bc.isLast ? '#0f172a' : '#64748b',
              whiteSpace: 'nowrap',
            }}>
              {bc.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Demo badge */}
      {isDemoMode && (
        <div style={{
          background: '#f3eeff', color: '#6d28d9',
          border: '1px solid #ddd6fe',
          borderRadius: 4, padding: '2px 8px',
          fontSize: '0.6875rem', fontWeight: 600,
          letterSpacing: '0.05em', flexShrink: 0,
        }}>
          DEMO
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            width: 32, height: 32, borderRadius: 6,
            background: showSearch ? '#f1f5f9' : 'transparent',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: showSearch ? '#0f172a' : '#64748b',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={e => {
            if (!showSearch) {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#0f172a';
            }
          }}
          onMouseLeave={e => {
            if (!showSearch) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }
          }}
          title="Search"
        >
          <Search size={18} />
        </button>

        {showSearch && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => { setShowSearch(false); setSearchVal(''); }} />
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#ffffff', borderRadius: 8,
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
              padding: 16, width: 320, zIndex: 50,
            }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
                <input
                  autoFocus
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder="Search plates, tickets, operators..."
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px',
                    border: '1px solid #cbd5e1', borderRadius: 6, outline: 'none',
                    fontSize: '0.875rem', color: '#0f172a',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#0f172a'}
                  onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>
                Press Enter to search across all modules
              </p>
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          style={{
            width: 32, height: 32, borderRadius: 6,
            background: showNotifs ? '#f1f5f9' : 'transparent',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: showNotifs ? '#0f172a' : '#64748b',
            position: 'relative',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={e => {
            if (!showNotifs) {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#0f172a';
            }
          }}
          onMouseLeave={e => {
            if (!showNotifs) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }
          }}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: '#dc2626',
            }} />
          )}
        </button>

        {showNotifs && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowNotifs(false)} />
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#ffffff', borderRadius: 8,
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
              width: 360, zIndex: 50,
              maxHeight: 420, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                padding: '16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>Notifications</span>
                <span style={{
                  background: '#fef2f2', color: '#dc2626',
                  fontSize: '0.75rem', fontWeight: 500, padding: '2px 8px', borderRadius: 4,
                }}>
                  {unreadCount} unread
                </span>
              </div>
              <div style={{ overflowY: 'auto' }}>
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No new notifications
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                <a href="/notifications" style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                  View all notifications &rarr;
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
