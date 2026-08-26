import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserCheck, MapPin, Phone, Mail, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function DriverProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Filter by profile_id (always = auth user UUID) — most reliable for newly registered drivers.
  // Falls back to driver_id if profile_id column doesn't exist on older records.
  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const driverIdFilter = user?.driver_id ? { column: 'id', value: user.driver_id } : undefined;
  const filter = profileFilter ?? driverIdFilter;

  const { data: drivers, loading } = useTable<any>('drivers', [], filter ? { filter } : undefined);

  // Use the first matching driver, or null if not yet set up
  const driverProfile = drivers.length > 0 ? drivers[0] : null;

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      // Delete from drivers table first
      if (driverProfile?.id) {
        await supabase.from('drivers').delete().eq('id', driverProfile.id);
      }
      // Sign out and delete auth user
      await supabase.auth.admin?.deleteUser?.(user!.id).catch(() => null);
      await signOut();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please contact support.');
      setDeleteLoading(false);
    }
  }

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
            {driverProfile?.full_name || user?.full_name || 'Driver Name'}
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

        {/* Danger Zone */}
        <div style={{ margin: '24px 24px 0', padding: '20px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#dc2626' }}>Danger Zone</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#9f1239' }}>Permanently delete your account and all associated data. This cannot be undone.</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            >
              <Trash2 size={14} /> Remove Account
            </button>
          </div>
          {deleteError && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 8 }}>{deleteError}</p>}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>Delete Account?</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              This will permanently delete your account, driver profile, and all associated records. This action <strong>cannot</strong> be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: deleteLoading ? 'not-allowed' : 'pointer' }}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
