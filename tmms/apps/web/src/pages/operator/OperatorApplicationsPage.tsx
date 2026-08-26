import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Clock, Eye, UserCheck, Car, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type AppStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

interface Application {
  id: string;
  driver_id: string;
  operator_id: string;
  unit_id?: string;
  status: AppStatus;
  message?: string;
  operator_notes?: string;
  created_at: string;
  driver?: any;
  unit?: any;
}

export function OperatorApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AppStatus | 'ALL'>('ALL');
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => { loadAll(); }, [user]);

  async function loadAll() {
    setLoading(true);
    // Get operator record
    let opId = user?.operator_id;
    if (!opId) {
      const { data } = await supabase.from('operators').select('id').eq('profile_id', user?.id).maybeSingle();
      opId = data?.id;
    }
    if (!opId) { setLoading(false); return; }
    setOperatorId(opId);

    const [{ data: apps }, { data: veh }] = await Promise.all([
      supabase.from('driver_applications').select('*, driver:drivers(*)').eq('operator_id', opId).order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*').eq('operator_id', opId),
    ]);
    setApplications(apps || []);
    setVehicles(veh || []);
    setLoading(false);
  }

  async function updateStatus(app: Application, status: AppStatus) {
    setProcessingId(app.id);
    const note = notes[app.id] || '';
    await supabase.from('driver_applications').update({ status, operator_notes: note, updated_at: new Date().toISOString() }).eq('id', app.id);

    // If accepted and a vehicle is assigned, create assignment
    if (status === 'ACCEPTED' && assignVehicleId[app.id]) {
      await supabase.from('driver_assignments').insert({
        driver_id: app.driver_id,
        operator_id: operatorId!,
        unit_id: assignVehicleId[app.id],
        status: 'ACTIVE',
      });
      // Update vehicle to mark as occupied
      await supabase.from('vehicles').update({ driver_id: app.driver_id, is_available: false }).eq('id', assignVehicleId[app.id]);
      // Update application with unit_id
      await supabase.from('driver_applications').update({ unit_id: assignVehicleId[app.id] }).eq('id', app.id);
    }
    setProcessingId(null);
    await loadAll();
  }

  const statusConfig = {
    PENDING: { icon: <Clock size={14} />, color: '#d97706', bg: '#fffbeb', label: 'Pending' },
    ACCEPTED: { icon: <CheckCircle size={14} />, color: '#059669', bg: '#ecfdf5', label: 'Accepted' },
    REJECTED: { icon: <XCircle size={14} />, color: '#dc2626', bg: '#fef2f2', label: 'Rejected' },
    CANCELLED: { icon: <XCircle size={14} />, color: '#94a3b8', bg: '#f8fafc', label: 'Cancelled' },
  };

  const filtered = filter === 'ALL' ? applications : applications.filter(a => a.status === filter);
  const counts = { ALL: applications.length, PENDING: applications.filter(a => a.status === 'PENDING').length, ACCEPTED: applications.filter(a => a.status === 'ACCEPTED').length, REJECTED: applications.filter(a => a.status === 'REJECTED').length, CANCELLED: applications.filter(a => a.status === 'CANCELLED').length };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCheck size={20} color="#1d4ed8" /> Driver Applications
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Review and manage driver applications to your fleet.</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filter === f ? '#1d4ed8' : '#e2e8f0'}`,
            background: filter === f ? '#eff6ff' : 'white', color: filter === f ? '#1d4ed8' : '#64748b',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
          }}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading applications...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, border: '2px dashed #e2e8f0', padding: 48, textAlign: 'center' }}>
          <UserCheck size={40} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No Applications</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No driver applications found for this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(app => {
            const sc = statusConfig[app.status];
            const driver = app.driver as any;
            const isExpanded = expandedId === app.id;

            return (
              <div key={app.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserCheck size={20} color="#64748b" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{driver?.full_name || 'Driver'}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        License: {driver?.license_number || 'N/A'} · Applied {formatDate(app.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: sc.bg, color: sc.color, fontSize: '0.78rem', fontWeight: 700 }}>
                      {sc.icon} {sc.label}
                    </span>
                    {isExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 20px' }}>
                    {/* Driver info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      {[
                        ['Contact', driver?.contact_number],
                        ['Address', driver?.address],
                        ['License Expiry', driver?.license_expiry ? formatDate(driver.license_expiry) : 'N/A'],
                        ['Driver Status', driver?.status],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: '0.875rem', color: '#0f172a' }}>{val || '—'}</div>
                        </div>
                      ))}
                    </div>

                    {app.message && (
                      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10 }}>
                        <MessageSquare size={16} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>Driver's Message</div>
                          <div style={{ fontSize: '0.85rem', color: '#334155' }}>{app.message}</div>
                        </div>
                      </div>
                    )}

                    {/* Operator response */}
                    {app.status === 'PENDING' && (
                      <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Respond to Application</div>

                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Assign a Vehicle (optional)</label>
                          <select
                            value={assignVehicleId[app.id] || ''}
                            onChange={e => setAssignVehicleId(prev => ({ ...prev, [app.id]: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', background: 'white', outline: 'none', boxSizing: 'border-box' }}
                          >
                            <option value="">No vehicle assigned yet</option>
                            {vehicles.filter(v => v.is_available !== false).map(v => (
                              <option key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Notes (optional)</label>
                          <textarea
                            value={notes[app.id] || ''}
                            onChange={e => setNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                            placeholder="Add a note to the driver..."
                            rows={2}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => updateStatus(app, 'REJECTED')}
                            disabled={processingId === app.id}
                            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                          <button
                            onClick={() => updateStatus(app, 'ACCEPTED')}
                            disabled={processingId === app.id}
                            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            {processingId === app.id
                              ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.75s linear infinite', display: 'inline-block' }} /> Processing...</>
                              : <><CheckCircle size={14} /> Accept Driver</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
