import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SensitiveDataViewer } from '@/components/ui/SensitiveDataViewer';
import {
  CheckCircle, XCircle, Clock, Search, Eye, EyeOff, X, UserCheck,
  Building2, Phone, Mail, FileImage, AlertTriangle, Car, FileText, ClipboardCheck,
  ShieldAlert, Lock
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FOR_CORRECTION';
type VehicleVerificationStatus = 'PENDING' | 'APPROVED' | 'FOR_CORRECTION' | 'REJECTED';

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  role: string;
  approval_status: ApprovalStatus;
  rejection_reason?: string;
  created_at: string;
  // Joined from drivers or operators
  driver?: {
    id: string;
    contact_number?: string;
    license_image_url?: string;
    license_expiry?: string;
    address?: string;
  } | null;
  operator?: {
    id: string;
    contact_number?: string;
    organization?: string;
    address?: string;
    license_image_url?: string;
  } | null;
}

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  PENDING:  { label: 'Pending',  icon: <Clock size={13} />,       color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  APPROVED: { label: 'Approved', icon: <CheckCircle size={13} />, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  REJECTED: { label: 'Rejected', icon: <XCircle size={13} />,     color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: '0.72rem', fontWeight: 700,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// Modal for viewing user detail + approval/rejection
function UserDetailModal({
  user,
  onClose,
  onApprove,
  onReject,
  actionLoading,
  isAdmin,
}: {
  user: PendingUser;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  actionLoading: boolean;
  isAdmin: boolean;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseRevealed, setLicenseRevealed] = useState(false);

  const isDriver = user.role === 'DRIVER';
  const isOperator = user.role === 'OPERATOR';
  const driver = user.driver;
  const operator = user.operator;
  const contactNumber = isDriver ? driver?.contact_number : operator?.contact_number;
  const address = isDriver ? driver?.address : operator?.address;
  const licenseUrl = driver?.license_image_url;
  const licenseExpiry = driver?.license_expiry;

  return (
    <>
      {/* Main detail modal */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          background: 'white', borderRadius: 16, width: '100%', maxWidth: 620,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                Applicant Details
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Review registration information</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            {/* Role badge */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: isDriver ? '#eff6ff' : '#f5f3ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isDriver ? <UserCheck size={24} color="#1d4ed8" /> : <Building2 size={24} color="#7c3aed" />}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                  {user.role === 'DRIVER' ? 'Driver' : 'Operator'} Applicant
                </div>
                <StatusBadge status={user.approval_status} />
              </div>
            </div>

            {/* Name fields */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 10 }}>NAME INFORMATION</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>LAST NAME</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{user.last_name || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>FIRST NAME</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{user.first_name || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>MIDDLE NAME</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{user.middle_name || '—'}</div>
                </div>
              </div>
            </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Mail size={16} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>EMAIL</div>
                  <SensitiveDataViewer value={user.email} type="email" />
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Phone size={16} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>CONTACT NUMBER</div>
                  <SensitiveDataViewer value={contactNumber || ''} type="phone" fallback="—" />
                </div>
              </div>
            </div>

            {/* Address */}
            {address && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2, minWidth: 60 }}>ADDRESS</div>
                <SensitiveDataViewer value={address} type="address" />
              </div>
            )}

            {/* Operator-specific info */}
            {isOperator && operator?.organization && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>ORGANIZATION / COOPERATIVE</div>
                <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>{operator.organization}</div>
              </div>
            )}

            {/* Driver's license image */}
            {isDriver && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>DRIVER'S LICENSE</span>
                  {licenseExpiry && (
                    <span style={{ fontSize: '0.7rem', background: new Date(licenseExpiry) < new Date() ? '#fef2f2' : '#f0fdf4', color: new Date(licenseExpiry) < new Date() ? '#dc2626' : '#16a34a', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                      {new Date(licenseExpiry) < new Date() ? '⚠ EXPIRED' : '✓ VALID'} · Expiry: {new Date(licenseExpiry).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {licenseUrl ? (
                  <div style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    {/* Blurred by default — click to reveal */}
                    <div
                      style={{ position: 'relative', cursor: licenseRevealed ? 'zoom-in' : 'pointer' }}
                      onClick={() => licenseRevealed ? setShowLicenseModal(true) : setLicenseRevealed(true)}
                    >
                      <img
                        src={licenseUrl}
                        alt="Driver's License"
                        style={{
                          width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block', background: '#f8fafc',
                          filter: licenseRevealed ? 'none' : 'blur(12px)',
                          transition: 'filter 0.3s ease',
                        }}
                      />
                      {!licenseRevealed && (
                        <div style={{
                          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 8,
                          background: 'rgba(15,23,42,0.4)',
                        }}>
                          <div style={{ background: 'white', borderRadius: '50%', padding: 10 }}>
                            <Eye size={22} color="#1d4ed8" />
                          </div>
                          <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>Click to reveal ID</span>
                        </div>
                      )}
                      {licenseRevealed && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '3px 8px',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setLicenseRevealed(false); }}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600 }}
                          >
                            <EyeOff size={13} /> Hide
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '6px 10px', background: '#eff6ff', fontSize: '0.72rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileImage size={12} /> {licenseRevealed ? 'Click image to view full size' : 'Click to reveal license image'}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', background: '#f8fafc', borderRadius: 8, textAlign: 'center', border: '2px dashed #e2e8f0', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <FileImage size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                    No license image uploaded
                  </div>
                )}
              </div>
            )}


            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 16 }}>
              Submitted: {formatDate(user.created_at)}
            </div>

            {/* Rejection reason (if rejected) */}
            {user.approval_status === 'REJECTED' && user.rejection_reason && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>REJECTION REASON</div>
                <div style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>{user.rejection_reason}</div>
              </div>
            )}

            {/* Action buttons — Admin only for approve/reject */}
            {user.approval_status === 'PENDING' && (
              isAdmin ? (
              <div>
                {!showRejectForm ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => {
                        if (window.confirm(`Approve registration for ${user.full_name || user.email}?\n\nThis will grant them access to the system.`)) {
                          onApprove();
                        }
                      }}
                      disabled={actionLoading}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 8,
                        background: actionLoading ? '#86efac' : '#16a34a',
                        color: 'white', fontWeight: 700, border: 'none',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        fontSize: '0.875rem',
                      }}
                    >
                      <CheckCircle size={16} />
                      {actionLoading ? 'Processing...' : 'Approve Registration'}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={actionLoading}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 8,
                        background: '#fef2f2', color: '#dc2626',
                        border: '1px solid #fecaca', fontWeight: 700,
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        fontSize: '0.875rem',
                      }}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Rejection Reason</div>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Please provide a reason for rejection (optional)..."
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #fca5a5',
                        borderRadius: 8, fontSize: '0.85rem', resize: 'vertical',
                        minHeight: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => {
                          if (window.confirm(`Reject the registration for ${user.full_name || user.email}?\n\nThis action will deny their access.`)) {
                            onReject(rejectReason);
                          }
                        }}
                        disabled={actionLoading}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 8,
                          background: '#dc2626', color: 'white',
                          border: 'none', fontWeight: 700,
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                      </button>
                      <button
                        onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                        style={{
                          padding: '10px 16px', borderRadius: 8,
                          background: '#f8fafc', color: '#64748b',
                          border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.85rem',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              ) : (
                /* Staff: read-only notice */
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: '0.85rem' }}>
                  <Lock size={16} />
                  <span>Only <strong>Admins</strong> can approve or reject registrations. Staff can view details only.</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Full-size license image modal */}
      {showLicenseModal && licenseUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: 24,
          }}
          onClick={() => setShowLicenseModal(false)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={licenseUrl}
              alt="Full size license"
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            />
            <button
              onClick={() => setShowLicenseModal(false)}
              style={{
                position: 'absolute', top: -12, right: -12,
                width: 32, height: 32, borderRadius: '50%',
                background: '#dc2626', color: 'white', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function ApprovalPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [mainTab, setMainTab] = useState<'accounts' | 'vehicles' | 'franchises'>('accounts');
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Vehicle review state
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleVerificationStatus | 'ALL'>('PENDING');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [vehicleActionLoading, setVehicleActionLoading] = useState(false);
  const [vehicleRemarks, setVehicleRemarks] = useState('');
  const [vehicleCorrectionReason, setVehicleCorrectionReason] = useState('');

  // Franchise review state
  const [franchises, setFranchises] = useState<any[]>([]);
  const [franchisesLoading, setFranchisesLoading] = useState(false);
  const [franchiseFilter, setFranchiseFilter] = useState<string>('PENDING');
  const [franchiseSearch, setFranchiseSearch] = useState('');
  const [selectedFranchise, setSelectedFranchise] = useState<any | null>(null);
  const [franchiseActionLoading, setFranchiseActionLoading] = useState(false);
  const [franchiseCorrectionReason, setFranchiseCorrectionReason] = useState('');

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { if (mainTab === 'vehicles') loadVehicles(); }, [mainTab]);
  useEffect(() => { if (mainTab === 'franchises') loadFranchises(); }, [mainTab]);


  async function loadUsers() {
    setLoading(true);
    try {
      // Load profiles with DRIVER or OPERATOR role
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, middle_name, role, approval_status, rejection_reason, created_at')
        .in('role', ['DRIVER', 'OPERATOR'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const profileList = profiles || [];

      // Load linked driver records
      const driverIds = profileList.filter(p => p.role === 'DRIVER').map(p => p.id);
      const operatorIds = profileList.filter(p => p.role === 'OPERATOR').map(p => p.id);

      const [{ data: drivers }, { data: operators }] = await Promise.all([
        driverIds.length > 0
          ? supabase.from('drivers').select('id, profile_id, full_name, first_name, last_name, middle_name, contact_number, license_image_url, address').in('profile_id', driverIds)
          : Promise.resolve({ data: [] }),
        operatorIds.length > 0
          ? supabase.from('operators').select('id, profile_id, full_name, first_name, last_name, middle_name, contact_number, organization, address').in('profile_id', operatorIds)
          : Promise.resolve({ data: [] }),
      ]);

      const driverMap = new Map((drivers || []).map(d => [d.profile_id, d]));
      const operatorMap = new Map((operators || []).map(o => [o.profile_id, o]));

      const enriched: PendingUser[] = profileList.map(p => {
        const driverRecord = p.role === 'DRIVER' ? (driverMap.get(p.id) || null) : null;
        const operatorRecord = p.role === 'OPERATOR' ? (operatorMap.get(p.id) || null) : null;

        // Backfill name fields from driver/operator record if profile fields are empty
        const firstName = p.first_name || driverRecord?.first_name || operatorRecord?.first_name || '';
        const lastName = p.last_name || driverRecord?.last_name || operatorRecord?.last_name || '';
        const middleName = p.middle_name || driverRecord?.middle_name || operatorRecord?.middle_name || '';
        const fullName = p.full_name || driverRecord?.full_name || operatorRecord?.full_name || p.email;

        return {
          ...p,
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          full_name: fullName,
          approval_status: (p.approval_status || 'PENDING') as ApprovalStatus,
          driver: driverRecord,
          operator: operatorRecord,
        };
      });

      setUsers(enriched);
    } catch (err: any) {
      setErrorMsg('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(user: PendingUser) {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: 'APPROVED', rejection_reason: null })
        .eq('id', user.id);
      if (error) throw error;

      // Also update driver/operator status to ACTIVE
      if (user.role === 'DRIVER' && user.driver?.id) {
        await supabase.from('drivers').update({ status: 'ACTIVE' }).eq('id', user.driver.id);
      } else if (user.role === 'OPERATOR' && user.operator?.id) {
        await supabase.from('operators').update({ status: 'ACTIVE' }).eq('id', user.operator.id);
      }

      // Send approval notification email via Supabase Auth admin invite trick
      // We send a password reset email which acts as an "activation" notification
      try {
        await supabase.functions.invoke('send-approval-email', {
          body: {
            to: user.email,
            name: user.full_name || user.email,
            role: user.role,
          },
        });
      } catch (emailErr) {
        // Email send is non-critical — don't block the approval
        console.warn('[TMMS] Could not send approval email:', emailErr);
      }

      setSuccessMsg(`${user.full_name || user.email} has been approved. A notification email has been sent.`);
      setSelectedUser(null);
      await loadUsers();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg('Failed to approve: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(user: PendingUser, reason: string) {
    setActionLoading(true);
    setErrorMsg('');
    try {
      // Step 1: Update profile status to REJECTED
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: 'REJECTED', rejection_reason: reason || null })
        .eq('id', user.id);
      if (error) throw error;

      // Step 2: Update driver/operator status
      if (user.role === 'DRIVER' && user.driver?.id) {
        await supabase.from('drivers').update({ status: 'INACTIVE' }).eq('id', user.driver.id);
      } else if (user.role === 'OPERATOR' && user.operator?.id) {
        await supabase.from('operators').update({ status: 'INACTIVE' }).eq('id', user.operator.id);
      }

      // Step 3: Delete the user from Supabase Auth so they cannot log in
      // This uses a secure server-side RPC function that runs with service_role privileges
      const { error: deleteErr } = await supabase.rpc('delete_auth_user', { target_user_id: user.id });
      if (deleteErr) {
        // Non-critical — log but don't block the rejection UI
        console.warn('[TMMS] Could not delete auth user (run the SQL migration to enable this):', deleteErr.message);
      } else {
        console.log('[TMMS] Auth user deleted successfully for rejected applicant:', user.email);
      }

      setSuccessMsg(`${user.full_name || user.email}'s registration has been rejected and their account removed.`);
      setSelectedUser(null);
      await loadUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Failed to reject: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function loadVehicles() {
    setVehiclesLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select('*, operator:operators(full_name, profile_id, contact_number)')
      .order('created_at', { ascending: false });
    setVehicles(data || []);
    setVehiclesLoading(false);
  }

  async function handleVehicleAction(vehicleId: string, status: VehicleVerificationStatus, reason?: string) {
    setVehicleActionLoading(true);
    try {
      await supabase.from('vehicles').update({
        verification_status: status,
        verification_reason: reason || null,
        status: status === 'APPROVED' ? 'ACTIVE' : 'UNDER_REVIEW',
      }).eq('id', vehicleId);
      setSuccessMsg(`Vehicle has been ${status.toLowerCase().replace('_', ' ')}.`);
      setSelectedVehicle(null);
      setVehicleRemarks('');
      setVehicleCorrectionReason('');
      await loadVehicles();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Vehicle action failed: ' + err.message);
    } finally {
      setVehicleActionLoading(false);
    }
  }

  async function loadFranchises() {
    setFranchisesLoading(true);
    const { data } = await supabase
      .from('franchises')
      .select('*, operator:operators(full_name, contact_number), route:routes(name, route_code), vehicle:vehicles(plate_number, vehicle_type)')
      .order('created_at', { ascending: false });
    setFranchises(data || []);
    setFranchisesLoading(false);
  }

  async function handleFranchiseAction(franchiseId: string, status: string, reason?: string) {
    setFranchiseActionLoading(true);
    try {
      await supabase.from('franchises').update({
        status,
        correction_reason: reason || null,
      }).eq('id', franchiseId);
      setSuccessMsg(`Franchise has been ${status.toLowerCase().replace('_', ' ')}.`);
      setSelectedFranchise(null);
      setFranchiseCorrectionReason('');
      await loadFranchises();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Franchise action failed: ' + err.message);
    } finally {
      setFranchiseActionLoading(false);
    }
  }

  const counts = {
    ALL: users.length,
    PENDING: users.filter(u => u.approval_status === 'PENDING').length,
    APPROVED: users.filter(u => u.approval_status === 'APPROVED').length,
    REJECTED: users.filter(u => u.approval_status === 'REJECTED').length,
  };

  const filtered = users.filter(u => {
    if (filter !== 'ALL' && u.approval_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.last_name || '').toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={20} color="#16a34a" /> Registration Approval
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Review and approve or reject pending driver and operator registrations
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', color: '#16a34a', fontSize: '0.85rem' }}>
          <CheckCircle size={15} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', color: '#dc2626', fontSize: '0.85rem' }}>
          <AlertTriangle size={15} /> {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        {[
          { id: 'accounts', label: 'Accounts', icon: <UserCheck size={16} /> },
          { id: 'vehicles', label: 'Vehicles', icon: <Car size={16} /> },
          { id: 'franchises', label: 'Franchises', icon: <FileText size={16} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8,
              fontSize: '0.87rem', fontWeight: 700, cursor: 'pointer', border: 'none',
              background: mainTab === t.id ? '#1e293b' : 'transparent',
              color: mainTab === t.id ? '#fff' : '#64748b',
              transition: 'all 0.2s'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Accounts Tab */}
      {mainTab === 'accounts' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total', value: counts.ALL, color: '#1d4ed8', bg: '#eff6ff' },
              { label: 'Pending', value: counts.PENDING, color: '#d97706', bg: '#fffbeb', alert: counts.PENDING > 0 },
              { label: 'Approved', value: counts.APPROVED, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Rejected', value: counts.REJECTED, color: '#dc2626', bg: '#fef2f2' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, borderRadius: 10, padding: '14px 16px',
                border: `1px solid ${s.color}30`,
                boxShadow: s.alert ? `0 0 0 2px ${s.color}30` : 'none',
              }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs + Search */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1.5px solid ${filter === f ? '#1d4ed8' : '#e2e8f0'}`,
                  background: filter === f ? '#eff6ff' : 'white',
                  color: filter === f ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                }}>
                  {f === 'ALL' ? 'All' : STATUS_CONFIG[f as ApprovalStatus].label} ({counts[f]})
                </button>
              ))}
            </div>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
                placeholder="Search name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                Loading registrations...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <CheckCircle size={40} color="#cbd5e1" style={{ display: 'block', margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4 }}>No registrations found</div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  {filter === 'PENDING' ? 'No pending registrations at this time.' : `No ${filter.toLowerCase()} registrations.`}
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const displayName = u.last_name && u.first_name
                      ? `${u.last_name}, ${u.first_name}${u.middle_name ? ' ' + u.middle_name : ''}`
                      : u.full_name || 'Unknown';
                    const contactNumber = u.role === 'DRIVER' ? u.driver?.contact_number : u.operator?.contact_number;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: u.role === 'DRIVER' ? '#eff6ff' : '#f5f3ff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              {u.role === 'DRIVER'
                                ? <UserCheck size={16} color="#1d4ed8" />
                                : <Building2 size={16} color="#7c3aed" />
                              }
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{displayName}</div>
                              {u.operator?.organization && (
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{u.operator.organization}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{u.email}</td>
                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{contactNumber || '—'}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 700,
                            background: u.role === 'DRIVER' ? '#eff6ff' : '#f5f3ff',
                            color: u.role === 'DRIVER' ? '#1d4ed8' : '#7c3aed',
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{formatDate(u.created_at)}</td>
                        <td><StatusBadge status={u.approval_status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setSelectedUser(u)}
                              title="View details"
                            >
                              <Eye size={13} /> Review
                            </button>
                            {u.approval_status === 'PENDING' && (
                              <>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
                                  onClick={() => {
                                    if (window.confirm(`Approve registration for ${displayName}?\n\nThis will grant them access to the system.`)) {
                                      handleApprove(u);
                                    }
                                  }}
                                  title="Approve"
                                >
                                  <CheckCircle size={13} />
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                  onClick={() => setSelectedUser(u)}
                                  title="Reject"
                                >
                                  <XCircle size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Modal */}
          {selectedUser && (
            <UserDetailModal
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onApprove={() => handleApprove(selectedUser)}
              onReject={(reason) => handleReject(selectedUser, reason)}
              actionLoading={actionLoading}
              isAdmin={isAdmin}
            />
          )}
        </>
      )}

      {/* Vehicles Tab */}
      {mainTab === 'vehicles' && (
        <>
          {vehiclesLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}><Car size={40} style={{ opacity: 0.2, marginBottom: 10 }} /><div>Loading vehicles...</div></div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {vehicles.filter(v => vehicleFilter === 'ALL' || v.verification_status === vehicleFilter).map(v => (
                <div key={v.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Car size={20} color="#3b82f6" />
                      </div>
                      <div>
                        <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>{v.plate_number}</code>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                          {v.operator?.full_name} · {v.operator?.contact_number}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: v.verification_status === 'APPROVED' ? '#f0fdf4' : v.verification_status === 'FOR_CORRECTION' ? '#fef2f2' : '#fffbeb', color: v.verification_status === 'APPROVED' ? '#16a34a' : v.verification_status === 'FOR_CORRECTION' ? '#dc2626' : '#d97706', border: `1px solid ${v.verification_status === 'APPROVED' ? '#bbf7d0' : v.verification_status === 'FOR_CORRECTION' ? '#fecaca' : '#fde68a'}`, fontSize: '0.72rem', fontWeight: 700 }}>
                        {v.verification_status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: 2 }}>TYPE</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{v.vehicle_type}</div></div>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: 2 }}>MAKE/MODEL</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{v.make} {v.model}</div></div>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: 2 }}>ENGINE NO.</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{v.engine_number}</div></div>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: 2 }}>CHASSIS NO.</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{v.chassis_number}</div></div>
                  </div>

                  {v.verification_status === 'PENDING' && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <a href={v.document_or_url} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>View OR</a>
                      <a href={v.document_cr_url} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>View CR</a>
                      {v.document_coc_url && <a href={v.document_coc_url} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>View COC</a>}
                      
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button onClick={() => { setSelectedVehicle(v); setVehicleCorrectionReason(''); }} style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>For Correction</button>
                        <button onClick={() => { if(window.confirm('Approve this vehicle?')) handleVehicleAction(v.id, 'APPROVED'); }} disabled={vehicleActionLoading} style={{ padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Approve Vehicle</button>
                      </div>
                    </div>
                  )}

                  {selectedVehicle?.id === v.id && (
                    <div style={{ marginTop: 16, background: '#fef2f2', padding: 16, borderRadius: 8, border: '1px solid #fecaca' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Reason for Correction</label>
                      <textarea style={{ width: '100%', padding: 12, border: '1px solid #fca5a5', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }} rows={3} placeholder="e.g. Blurry OR document. Please re-upload." value={vehicleCorrectionReason} onChange={e => setVehicleCorrectionReason(e.target.value)} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => setSelectedVehicle(null)} style={{ padding: '8px 16px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleVehicleAction(v.id, 'FOR_CORRECTION', vehicleCorrectionReason)} disabled={!vehicleCorrectionReason.trim() || vehicleActionLoading} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Submit for Correction</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Franchises Tab */}
      {mainTab === 'franchises' && (
        <>
          {franchisesLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}><FileText size={40} style={{ opacity: 0.2, marginBottom: 10 }} /><div>Loading franchises...</div></div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {franchises.filter(f => franchiseFilter === 'ALL' || f.status === franchiseFilter).map(f => (
                <div key={f.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>{f.franchise_number}</code>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                        {f.operator?.full_name} · {f.operator?.contact_number}
                      </div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: f.status === 'ACTIVE' ? '#f0fdf4' : f.status === 'FOR_CORRECTION' ? '#fef2f2' : '#fffbeb', color: f.status === 'ACTIVE' ? '#16a34a' : f.status === 'FOR_CORRECTION' ? '#dc2626' : '#d97706', border: `1px solid ${f.status === 'ACTIVE' ? '#bbf7d0' : f.status === 'FOR_CORRECTION' ? '#fecaca' : '#fde68a'}`, fontSize: '0.72rem', fontWeight: 700 }}>
                        {f.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: 2 }}>ROUTE</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{f.route?.name}</div></div>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: 2 }}>VEHICLE</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{f.vehicle?.plate_number}</div></div>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: 2 }}>VALID FROM</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{f.validity_start ? new Date(f.validity_start).toLocaleDateString() : '—'}</div></div>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}><div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: 2 }}>VALID UNTIL</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{f.validity_end ? new Date(f.validity_end).toLocaleDateString() : '—'}</div></div>
                  </div>

                  {f.status === 'PENDING' && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {f.document_cpc_url && <a href={f.document_cpc_url} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>View CPC</a>}
                      {f.document_route_url && <a href={f.document_route_url} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>View Route Doc</a>}
                      
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button onClick={() => { setSelectedFranchise(f); setFranchiseCorrectionReason(''); }} style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>For Correction</button>
                        <button onClick={() => { if(window.confirm('Approve this franchise?')) handleFranchiseAction(f.id, 'ACTIVE'); }} disabled={franchiseActionLoading} style={{ padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Approve Franchise</button>
                      </div>
                    </div>
                  )}

                  {selectedFranchise?.id === f.id && (
                    <div style={{ marginTop: 16, background: '#fef2f2', padding: 16, borderRadius: 8, border: '1px solid #fecaca' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Reason for Correction</label>
                      <textarea style={{ width: '100%', padding: 12, border: '1px solid #fca5a5', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }} rows={3} placeholder="e.g. Franchise number does not match document." value={franchiseCorrectionReason} onChange={e => setFranchiseCorrectionReason(e.target.value)} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => setSelectedFranchise(null)} style={{ padding: '8px 16px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleFranchiseAction(f.id, 'FOR_CORRECTION', franchiseCorrectionReason)} disabled={!franchiseCorrectionReason.trim() || franchiseActionLoading} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Submit for Correction</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}

