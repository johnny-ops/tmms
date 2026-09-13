import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserCheck, MapPin, Phone, Mail, FileText, Trash2, AlertTriangle,
  Camera, Edit3, Save, X, Loader2, BadgeCheck, IdCard
} from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function DriverProfilePage() {
  const { user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const driverIdFilter = user?.driver_id ? { column: 'id', value: user.driver_id } : undefined;
  const filter = profileFilter ?? driverIdFilter;

  const { data: drivers, loading, refetch } = useTable<any>('drivers', [], filter ? { filter } : undefined);
  const driverProfile = drivers.length > 0 ? drivers[0] : null;

  const [form, setForm] = useState({
    full_name: '',
    contact_number: '',
    address: '',
  });

  // Sync form when profile loads
  const formInitialized = useRef(false);
  if (driverProfile && !formInitialized.current) {
    formInitialized.current = true;
    form.full_name = driverProfile.full_name || '';
    form.contact_number = driverProfile.contact_number || '';
    form.address = driverProfile.address || '';
  }

  // Avatar URL: prefer profile avatar_url, fallback to generated initials
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const avatarUrl = localAvatarUrl || (user as any)?.avatar_url || null;
  const displayName = driverProfile?.full_name || user?.full_name || 'Driver';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setAvatarUploading(true);
    setAvatarError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}.${ext}`;   // flat path inside 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes('bucket')) {
          setAvatarError('Storage bucket not found. Please run the latest SQL migration in your Supabase SQL Editor first.');
        } else {
          setAvatarError('Upload failed: ' + uploadError.message);
        }
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Save to profiles table
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setLocalAvatarUrl(publicUrl + `?t=${Date.now()}`);
      await refreshProfile();
    } catch (err: any) {
      setAvatarError('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSave() {
    if (!driverProfile?.id) return;
    setSaving(true);
    setSaveError('');
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          full_name: form.full_name,
          contact_number: form.contact_number,
          address: form.address,
        })
        .eq('id', driverProfile.id);
      if (error) throw error;
      await refetch();
      formInitialized.current = false;
      setEditMode(false);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      if (driverProfile?.id) {
        await supabase.from('drivers').delete().eq('id', driverProfile.id);
      }
      await supabase.auth.admin?.deleteUser?.(user!.id).catch(() => null);
      await signOut();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please contact support.');
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, flexDirection: 'column', gap: 12, color: '#94a3b8' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.85rem' }}>Loading profile...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const InfoRow = ({ icon, label, value, editField }: { icon: React.ReactNode; label: string; value: string; editField?: keyof typeof form }) => (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
        {editMode && editField ? (
          <input
            value={form[editField]}
            onChange={e => setForm(prev => ({ ...prev, [editField]: e.target.value }))}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #3b82f6',
              fontSize: '0.88rem', color: '#0f172a', outline: 'none', background: '#eff6ff', boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ fontSize: '0.9rem', color: value ? '#0f172a' : '#94a3b8', fontWeight: value ? 500 : 400 }}>
            {value || 'Not provided'}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>My Profile</h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>View and manage your driver account information.</p>
      </div>

      {/* Main profile card */}
      <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: 16 }}>

        {/* Hero banner */}
        <div style={{
          height: 130, background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #06b6d4 100%)',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        </div>

        <div style={{ padding: '0 28px 28px 28px' }}>
          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -52, marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              {/* Avatar circle */}
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                border: '4px solid white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative'
              }} onClick={() => fileInputRef.current?.click()}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>{initials}</span>
                )}
                {/* Upload overlay */}
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.2s',
                  borderRadius: '50%'
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  {avatarUploading ? (
                    <Loader2 size={20} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Camera size={20} color="white" />
                  )}
                </div>
              </div>
              {/* Upload button badge */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#1d4ed8', border: '2px solid white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                <Camera size={12} color="white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>

            {/* Edit/Save controls */}
            <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
              {editMode ? (
                <>
                  <button
                    onClick={() => { setEditMode(false); setSaveError(''); formInitialized.current = false; }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: 'white', fontWeight: 600, fontSize: '0.82rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', color: '#374151', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Name & badge */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              {driverProfile?.last_name && driverProfile?.first_name
                ? `${driverProfile.last_name}, ${driverProfile.first_name}${driverProfile.middle_name ? ' ' + driverProfile.middle_name : ''}`
                : driverProfile?.full_name || user?.full_name || 'Driver Name'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20,
                background: '#dcfce7', color: '#15803d',
                fontSize: '0.72rem', fontWeight: 700
              }}>
                <BadgeCheck size={12} /> VERIFIED DRIVER
              </span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{user?.email}</span>
            </div>
          </div>

          {saveError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#dc2626' }}>
              {saveError}
            </div>
          )}

          {avatarError && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#92400e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{avatarError}</span>
            </div>
          )}

          {/* Two-column info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
            {/* Left col */}
            <div>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Contact Information
              </h3>
              <InfoRow icon={<Mail size={15} color="#64748b" />} label="Email Address" value={user?.email || ''} />
              <InfoRow icon={<Phone size={15} color="#64748b" />} label="Contact Number" value={driverProfile?.contact_number || ''} editField="contact_number" />
              <InfoRow icon={<MapPin size={15} color="#64748b" />} label="Home Address" value={driverProfile?.address || ''} editField="address" />
            </div>

            {/* Right col */}
            <div>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                License & Account
              </h3>
              <InfoRow icon={<FileText size={15} color="#64748b" />} label="License Expiry" value={driverProfile?.license_expiry ? new Date(driverProfile.license_expiry).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'} />
              <InfoRow icon={<UserCheck size={15} color="#64748b" />} label="Account ID" value={driverProfile?.id?.slice(0, 12) || user?.id?.slice(0, 12) || ''} />
              
              {/* License Image Display */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <IdCard size={15} color="#64748b" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Driver's License Photo</span>
                </div>
                {driverProfile?.license_image_url ? (
                  <div style={{ 
                    width: '100%', height: 140, borderRadius: 8, overflow: 'hidden', 
                    border: '1px solid #e2e8f0', background: '#f8fafc' 
                  }}>
                    <img 
                      src={driverProfile.license_image_url} 
                      alt="Driver's License" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onClick={() => window.open(driverProfile.license_image_url, '_blank')}
                      title="Click to view full size"
                    />
                  </div>
                ) : (
                  <div style={{ 
                    width: '100%', padding: '16px', borderRadius: 8, border: '1px dashed #cbd5e1', 
                    background: '#f8fafc', color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center' 
                  }}>
                    No license image uploaded
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #fecaca', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #fef2f2', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#dc2626" />
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#dc2626' }}>Danger Zone</span>
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a', marginBottom: 4 }}>Delete Account</div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Permanently delete your account and all associated data. This cannot be undone.</p>
            {deleteError && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 8 }}>{deleteError}</p>}
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ padding: '8px 16px', background: 'white', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 24 }}
          >
            <Trash2 size={14} /> Remove Account
          </button>
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
