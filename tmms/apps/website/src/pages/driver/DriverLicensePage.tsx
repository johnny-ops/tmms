import { useAuth } from '@/contexts/AuthContext';
import { FileText, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { formatDate } from '@/lib/utils';

export function DriverLicensePage() {
  const { user } = useAuth();
  
  // Filter by profile_id (= auth user UUID) — always available for newly registered drivers
  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const { data: drivers, loading } = useTable<any>('drivers', [], profileFilter ? { filter: profileFilter } : undefined);

  // Only show this driver's own data — null if not found (new/unlinked driver)
  const driverProfile = user?.id && drivers.length > 0 ? drivers[0] : null;

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading license data...</div>;
  }

  const expiryDate = driverProfile?.license_expiry ? new Date(driverProfile.license_expiry) : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;
  const isExpiringSoon = expiryDate ? expiryDate > new Date() && expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : false;

  return (
    <div className="max-w-4xl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
          License Information
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          View your driver's license details and status.
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', padding: 24 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 12, background: isExpired ? '#fef2f2' : (isExpiringSoon ? '#fffbeb' : '#f0fdf4'),
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: isExpired ? '#ef4444' : (isExpiringSoon ? '#f59e0b' : '#22c55e')
          }}>
            {isExpired ? <AlertTriangle size={32} /> : <FileText size={32} />}
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
              {driverProfile?.license_number || 'PENDING'}
            </h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <span className={`badge ${isExpired ? 'badge-suspended' : (isExpiringSoon ? 'badge-pending' : 'badge-active')}`}>
                {isExpired ? 'EXPIRED' : (isExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE')}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Professional Driver's License
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: 4 }}>NAME ON LICENSE</div>
            <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>{driverProfile?.full_name || user?.full_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: 4 }}>EXPIRY DATE</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Calendar size={16} color="#64748b" />
              <span style={{ fontSize: '1rem', color: isExpired ? '#dc2626' : '#0f172a', fontWeight: 600 }}>
                {driverProfile?.license_expiry ? formatDate(driverProfile.license_expiry) : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {isExpired && (
          <div style={{ marginTop: 24, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.85rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', marginBottom: 4 }}>License Expired</strong>
              Your driver's license has expired. You are not authorized to operate a PUV until you renew your license and update your records with the LGU.
            </div>
          </div>
        )}

        {isExpiringSoon && (
          <div style={{ marginTop: 24, padding: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, color: '#92400e', fontSize: '0.85rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', marginBottom: 4 }}>License Expiring Soon</strong>
              Your driver's license will expire within the next 30 days. Please ensure you renew it promptly to avoid suspension of your driving privileges.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
