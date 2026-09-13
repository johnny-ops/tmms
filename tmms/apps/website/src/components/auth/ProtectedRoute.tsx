import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-gov-600 border-t-transparent rounded-full spinner mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading system...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasPermission(allowedRoles)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: 400 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <span style={{ fontSize: '2rem' }}>🚫</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Access Denied</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 24 }}>You do not have permission to view this page. This area is restricted to {allowedRoles.join(', ')}s.</p>
            <a href="/" style={{ display: 'inline-block', background: '#1d4ed8', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              Return to Home
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
