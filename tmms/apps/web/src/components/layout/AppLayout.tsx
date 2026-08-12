import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/contexts/AuthContext';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isDemoMode } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-body)' }}>
      {/* Demo banner */}
      {isDemoMode && (
        <div style={{
          background: '#f3eeff', color: '#6d28d9', textAlign: 'center', padding: '8px',
          fontSize: '0.8125rem', fontWeight: 500, borderBottom: '1px solid #ddd6fe'
        }}>
          🚧 DEMO ENVIRONMENT — Data shown is sample data and does not represent real LGU records
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(prev => !prev)}
        />

        {/* Main content */}
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
