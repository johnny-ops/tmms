import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

export function AppLayout() {
  const { isDemoMode } = useAuth();

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-body)' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} className="page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
