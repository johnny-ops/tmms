import { useAuth } from '@/contexts/AuthContext';
import { FileText, AlertTriangle, ImageIcon, Upload } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';

export function DriverLicensePage() {
  const { user } = useAuth();
  
  // Filter by profile_id (= auth user UUID)
  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const { data: drivers, loading } = useTable<any>('drivers', [], profileFilter ? { filter: profileFilter } : undefined);

  const driverProfile = user?.id && drivers.length > 0 ? drivers[0] : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#64748b', fontSize: '0.9rem' }}>
        Loading license data...
      </div>
    );
  }

  const licenseImageUrl = driverProfile?.license_image_url || null;

  return (
    <div className="max-w-4xl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
          License Information
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          View your uploaded driver's license on file with the LGU.
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 10,
            background: licenseImageUrl ? '#f0fdf4' : '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: licenseImageUrl ? '#22c55e' : '#94a3b8',
            flexShrink: 0,
          }}>
            {licenseImageUrl ? <FileText size={28} /> : <ImageIcon size={28} />}
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              {driverProfile?.full_name || user?.full_name || 'Driver'}
            </h2>
            <span style={{
              display: 'inline-block', fontSize: '0.72rem', fontWeight: 700,
              padding: '2px 10px', borderRadius: 9999,
              background: licenseImageUrl ? '#f0fdf4' : '#fffbeb',
              color: licenseImageUrl ? '#16a34a' : '#92400e',
              border: `1px solid ${licenseImageUrl ? '#bbf7d0' : '#fde68a'}`,
            }}>
              {licenseImageUrl ? 'LICENSE ON FILE' : 'NO LICENSE UPLOADED'}
            </span>
          </div>
        </div>

        {/* License Image */}
        {licenseImageUrl ? (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Uploaded License Image
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#f8fafc' }}>
              <img
                src={licenseImageUrl}
                alt="Driver's License"
                style={{ width: '100%', maxHeight: 380, objectFit: 'contain', display: 'block' }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
              This is the driver's license image you submitted during registration. If you need to update it, please contact the LGU office.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 8, border: '2px dashed #e2e8f0' }}>
            <Upload size={36} color="#94a3b8" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontWeight: 600, color: '#475569', marginBottom: 6 }}>No License Image on File</div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: 320, margin: '0 auto' }}>
              Your driver's license image was not uploaded during registration or is still being processed. Please contact the LGU office.
            </p>
          </div>
        )}

        {/* Not yet approved warning */}
        {!driverProfile && (
          <div style={{ marginTop: 16, padding: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, color: '#92400e', fontSize: '0.85rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', marginBottom: 4 }}>Account Pending</strong>
              Your driver profile has not been linked yet. This may occur if your account is still pending admin approval.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
