import { useAuth } from '@/contexts/AuthContext';
import { UserCheck, MapPin, Phone, Mail, FileText } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';

export function DriverProfilePage() {
  const { user } = useAuth();
  
  // Use the linked driver_id from the Auth fallback to fetch the specific driver
  const filter = user?.driver_id ? { column: 'id', value: user.driver_id } : undefined;
  const { data: drivers, loading } = useTable<any>('drivers', [], { filter });
  
  const driverProfile = drivers.length > 0 ? drivers[0] : null;

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading profile data...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
          My Profile
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          View and manage your driver account details.
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(to right, #059669, #047857)', height: 120 }}></div>
        
        <div style={{ padding: '0 24px 24px 24px', position: 'relative' }}>
          {/* Avatar / Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginTop: -40, marginBottom: 16,
            border: '4px solid white'
          }}>
            <UserCheck size={32} color="#059669" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            {driverProfile?.last_name && driverProfile?.first_name 
              ? `${driverProfile.last_name}, ${driverProfile.first_name}${driverProfile.middle_name ? ' ' + driverProfile.middle_name : ''}`
              : driverProfile?.full_name || user?.full_name || 'Driver Name'}
          </h2>
          <span className="badge badge-active" style={{ marginBottom: 24, display: 'inline-block', background: '#d1fae5', color: '#065f46' }}>
            VERIFIED DRIVER
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 16 }}>
            {/* Left Column: Contact */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                Contact Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Mail size={16} color="#64748b" />
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{user?.email || 'email@example.com'}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Phone size={16} color="#64748b" />
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{driverProfile?.contact_number || 'Not provided'}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <MapPin size={16} color="#64748b" style={{ marginTop: 2 }} />
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{driverProfile?.address || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Right Column: License/Account Summary */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                Account Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <FileText size={16} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>DRIVER LICENSE NUMBER</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
                      {driverProfile?.license_number || 'PENDING'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <UserCheck size={16} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>ACCOUNT ID</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a', fontFamily: 'monospace' }}>
                      {driverProfile?.id?.slice(0, 12) || user?.id.slice(0, 12)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
