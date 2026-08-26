import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Building2, Car, Users, Send, CheckCircle, XCircle, Clock, AlertTriangle, Search, ChevronRight, MapPin, Phone } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

interface Operator {
  id: string;
  full_name: string;
  organization?: string;
  contact_number?: string;
  email?: string;
  address?: string;
}

interface Application {
  id: string;
  operator_id: string;
  status: ApplicationStatus;
  message?: string;
  operator_notes?: string;
  created_at: string;
  operator?: Operator;
}

export function DriverApplicationPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'browse' | 'my-applications'>('my-applications');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [applyTarget, setApplyTarget] = useState<Operator | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => { loadAll(); }, [user]);

  async function loadAll() {
    setLoading(true);
    // Get driver record for current user
    const { data: driverData } = await supabase
      .from('drivers')
      .select('id')
      .eq('profile_id', user?.id)
      .maybeSingle();

    if (driverData) {
      setDriverId(driverData.id);
      // Load applications
      const { data: apps } = await supabase
        .from('driver_applications')
        .select('*, operator:operators(*)')
        .eq('driver_id', driverData.id)
        .order('created_at', { ascending: false });
      setApplications(apps || []);
    } else if (user?.driver_id) {
      setDriverId(user.driver_id);
      const { data: apps } = await supabase
        .from('driver_applications')
        .select('*, operator:operators(*)')
        .eq('driver_id', user.driver_id)
        .order('created_at', { ascending: false });
      setApplications(apps || []);
    }

    // Load operators
    const { data: opData } = await supabase.from('operators').select('*').eq('status', 'ACTIVE');
    setOperators(opData || []);
    setLoading(false);
  }

  async function submitApplication() {
    if (!applyTarget || !driverId) return;
    setApplyLoading(true);
    setApplyError('');

    // Check for existing pending/accepted application to this operator
    const existing = applications.find(a => a.operator_id === applyTarget.id && ['PENDING', 'ACCEPTED'].includes(a.status));
    if (existing) {
      setApplyError('You already have an active application to this operator.');
      setApplyLoading(false);
      return;
    }

    const { error } = await supabase.from('driver_applications').insert({
      driver_id: driverId,
      operator_id: applyTarget.id,
      status: 'PENDING',
      message: applyMessage,
    });

    setApplyLoading(false);
    if (error) { setApplyError(error.message); return; }
    setApplySuccess(true);
    setApplyMessage('');
    await loadAll();
    setTimeout(() => { setApplyTarget(null); setApplySuccess(false); setTab('my-applications'); }, 1500);
  }

  async function cancelApplication(appId: string) {
    await supabase.from('driver_applications').update({ status: 'CANCELLED' }).eq('id', appId);
    await loadAll();
  }

  const statusConfig = {
    PENDING: { icon: <Clock size={14} />, color: '#d97706', bg: '#fffbeb', label: 'Pending' },
    ACCEPTED: { icon: <CheckCircle size={14} />, color: '#059669', bg: '#ecfdf5', label: 'Accepted' },
    REJECTED: { icon: <XCircle size={14} />, color: '#dc2626', bg: '#fef2f2', label: 'Rejected' },
    CANCELLED: { icon: <XCircle size={14} />, color: '#94a3b8', bg: '#f8fafc', label: 'Cancelled' },
  };

  const filteredOperators = operators.filter(o =>
    !search || o.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (o.organization || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Send size={20} color="#1d4ed8" /> Driver Applications
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Browse operators and apply to join their fleet.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        {(['my-applications', 'browse'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            color: tab === t ? '#1d4ed8' : '#64748b',
            borderBottom: `2px solid ${tab === t ? '#1d4ed8' : 'transparent'}`, marginBottom: -2, transition: 'all 0.15s'
          }}>
            {t === 'my-applications' ? `My Applications (${applications.length})` : 'Browse Operators'}
          </button>
        ))}
      </div>

      {/* Apply Modal */}
      {applyTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {applySuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={48} color="#22c55e" style={{ marginBottom: 12 }} />
                <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Application Sent!</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Your application to {applyTarget.full_name} has been submitted.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Apply to {applyTarget.full_name}</h3>
                <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 20 }}>{applyTarget.organization}</p>
                {applyError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#dc2626' }}>{applyError}</div>}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Message to Operator (optional)</label>
                  <textarea
                    value={applyMessage}
                    onChange={e => setApplyMessage(e.target.value)}
                    placeholder="Introduce yourself, mention your experience..."
                    rows={4}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setApplyTarget(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>Cancel</button>
                  <button onClick={submitApplication} disabled={applyLoading} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {applyLoading ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.75s linear infinite', display: 'inline-block' }} /> Sending...</> : <><Send size={14} /> Submit Application</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'my-applications' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading applications...</div>
          ) : applications.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, border: '2px dashed #e2e8f0', padding: 48, textAlign: 'center' }}>
              <Send size={40} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No Applications Yet</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 20 }}>Browse operators and apply to join a fleet.</p>
              <button onClick={() => setTab('browse')} style={{ padding: '10px 24px', borderRadius: 8, background: '#1d4ed8', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Browse Operators
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {applications.map(app => {
                const sc = statusConfig[app.status];
                return (
                  <div key={app.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                          {(app.operator as any)?.full_name || 'Operator'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 8 }}>
                          {(app.operator as any)?.organization} · Applied {formatDate(app.created_at)}
                        </div>
                        {app.message && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '8px 12px', borderRadius: 8, marginBottom: 8 }}>
                            "{app.message}"
                          </div>
                        )}
                        {app.operator_notes && (
                          <div style={{ fontSize: '0.8rem', color: '#1e293b', background: '#f0fdf4', padding: '8px 12px', borderRadius: 8, borderLeft: '3px solid #22c55e' }}>
                            Operator: "{app.operator_notes}"
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: sc.bg, color: sc.color, fontSize: '0.78rem', fontWeight: 700 }}>
                          {sc.icon} {sc.label}
                        </span>
                        {app.status === 'PENDING' && (
                          <button onClick={() => cancelApplication(app.id)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'browse' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 10 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search operators..."
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filteredOperators.map(op => (
              <div key={op.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={22} color="#1d4ed8" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{op.full_name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{op.organization || 'Independent Operator'}</div>
                  </div>
                </div>
                {op.address && <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {op.address}</div>}
                {op.contact_number && <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> {op.contact_number}</div>}
                <button
                  onClick={() => { setApplyTarget(op); setApplyError(''); setApplySuccess(false); }}
                  style={{ marginTop: 4, width: '100%', padding: '9px', borderRadius: 8, background: '#1d4ed8', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Send size={14} /> Apply Now
                </button>
              </div>
            ))}
            {filteredOperators.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#94a3b8' }}>No operators found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
