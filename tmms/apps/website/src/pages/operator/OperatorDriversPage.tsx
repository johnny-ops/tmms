import { useState, useEffect } from 'react';
import { Search, UserCheck, Phone, CreditCard as IdCard, Car, ExternalLink, X, Loader2, PenLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export function OperatorDriversPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [operatorId, setOperatorId] = useState<string | null>(null);

  // Vehicle assignment modal state
  const [assignModalFor, setAssignModalFor] = useState<any | null>(null); // the assignment row being edited
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState('');

  useEffect(() => {
    if (user?.id) loadDrivers();
  }, [user]);

  async function loadDrivers() {
    setLoading(true);
    try {
      let opId = operatorId;
      if (!opId) {
        const { data } = await supabase.from('operators').select('id').eq('profile_id', user?.id).maybeSingle();
        opId = data?.id;
        if (opId) setOperatorId(opId);
      }
      if (!opId) { setAssignments([]); return; }

      const { data } = await supabase
        .from('driver_assignments')
        .select('*, driver:drivers(*), unit:vehicles(*), route:routes(*)')
        .eq('operator_id', opId)
        .eq('status', 'ACTIVE');

      setAssignments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function openAssignVehicleModal(assignment: any) {
    setAssignModalFor(assignment);
    setVehicleError('');
    setLoadingVehicles(true);

    try {
      let opId = operatorId;
      if (!opId) {
        const { data } = await supabase.from('operators').select('id').eq('profile_id', user?.id).maybeSingle();
        opId = data?.id;
        if (opId) setOperatorId(opId);
      }

      // Load operator's vehicles — exclude vehicles already assigned to another ACTIVE driver
      const { data: allVehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('operator_id', opId);

      // Get all vehicles currently used in active assignments (except this driver's current one)
      const { data: activeAssignments } = await supabase
        .from('driver_assignments')
        .select('unit_id')
        .eq('operator_id', opId!)
        .eq('status', 'ACTIVE')
        .neq('id', assignment.id);

      const usedVehicleIds = new Set((activeAssignments || []).map((a: any) => a.unit_id).filter(Boolean));
      const available = (allVehicles || []).filter(v => !usedVehicleIds.has(v.id));
      setAvailableVehicles(available);
    } catch (err) {
      setVehicleError('Failed to load vehicles.');
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function handleAssignVehicle(vehicleId: string | null) {
    if (!assignModalFor) return;
    setSavingVehicle(true);
    setVehicleError('');

    try {
      const { error } = await supabase
        .from('driver_assignments')
        .update({ unit_id: vehicleId })
        .eq('id', assignModalFor.id);

      if (error) throw error;

      setAssignModalFor(null);
      await loadDrivers();
    } catch (err: any) {
      setVehicleError(err.message || 'Failed to assign vehicle.');
    } finally {
      setSavingVehicle(false);
    }
  }

  const filteredAssignments = assignments.filter(a => {
    const d = a.driver;
    if (!d) return false;
    return (
      d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.license_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getInitials = (name: string) =>
    name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={22} color="#3a65ae" /> Assigned Drivers
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Drivers approved from applications. Assign each driver a vehicle to drive.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', borderRadius: 8, padding: '6px 14px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total:</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{assignments.length}</span>
          </div>
          <button
            onClick={() => navigate('/operator/applications')}
            style={{
              background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px',
              borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, display: 'flex',
              alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.2)'
            }}
          >
            Driver Applications <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Car size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: '0.82rem', color: '#1d4ed8', margin: 0 }}>
          <strong>How to assign a vehicle:</strong> Once a driver application is approved, click the <strong>Assign Vehicle</strong> button on their row to pick which vehicle from your fleet they will drive.
        </p>
      </div>

      {/* Search */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by driver name or license number..."
            style={{
              width: '100%', paddingLeft: 38, paddingRight: 16, height: 40,
              border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem',
              outline: 'none', background: '#f8fafc', color: '#1e293b', boxSizing: 'border-box'
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <UserCheck size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: '0.9rem' }}>Loading drivers...</div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <UserCheck size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No drivers assigned yet</div>
            <div style={{ fontSize: '0.82rem', marginBottom: 16 }}>Go to Driver Applications and approve a driver application first.</div>
            <button
              onClick={() => navigate('/operator/applications')}
              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Go to Applications
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Driver</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>License</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assigned Vehicle</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Route</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((a, i) => {
                const d = a.driver;
                const v = a.unit;
                const r = a.route;
                if (!d) return null;
                const isExpired = d.license_expiry && new Date(d.license_expiry) < new Date();
                return (
                  <tr
                    key={a.id}
                    style={{ borderBottom: i < filteredAssignments.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #3a65ae, #2d5193)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                        }}>
                          {getInitials(d.full_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{d.full_name}</div>
                          {d.address && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 1 }}>{d.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <IdCard size={13} color="#94a3b8" />
                          <code style={{ color: '#475569', fontWeight: 600, fontSize: '0.82rem' }}>{d.license_number}</code>
                        </div>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 600,
                          color: isExpired ? '#dc2626' : '#64748b',
                          background: isExpired ? '#fef2f2' : 'transparent',
                          padding: isExpired ? '2px 6px' : '0',
                          borderRadius: isExpired ? 4 : 0, display: 'inline-block'
                        }}>
                          Exp: {d.license_expiry ? formatDate(d.license_expiry) : '—'}
                          {isExpired && <span style={{ marginLeft: 4 }}>⚠</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {v ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Car size={14} color="#3b82f6" />
                          </div>
                          <div>
                            <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>{v.plate_number}</code>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{v.make} {v.model}</div>
                          </div>
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          color: '#f59e0b', fontSize: '0.82rem', fontWeight: 600,
                          background: '#fffbeb', padding: '3px 8px', borderRadius: 6,
                          border: '1px solid #fde68a'
                        }}>
                          ⚠ No vehicle yet
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {r ? (
                        <div>
                          <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.82rem' }}>{r.route_code}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{r.origin} → {r.destination}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic' }}>No route set</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {d.contact_number ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={13} color="#94a3b8" />
                          <span style={{ fontSize: '0.85rem', color: '#374151' }}>{d.contact_number}</span>
                        </div>
                      ) : <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => openAssignVehicleModal(a)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: v ? '#f1f5f9' : '#3b82f6',
                          color: v ? '#374151' : 'white',
                          border: 'none', padding: '7px 13px', borderRadius: 7,
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      >
                        <PenLine size={13} />
                        {v ? 'Change Vehicle' : 'Assign Vehicle'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign Vehicle Modal */}
      {assignModalFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 480, position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setAssignModalFor(null)}
                style={{ position: 'absolute', right: 16, top: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
              >
                <X size={20} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3a65ae, #2d5193)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700
                }}>
                  {getInitials(assignModalFor.driver?.full_name)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Assign Vehicle</h2>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>For: <strong>{assignModalFor.driver?.full_name}</strong></p>
                </div>
              </div>
            </div>

            {vehicleError && (
              <div style={{ margin: '12px 24px 0', padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.83rem' }}>
                {vehicleError}
              </div>
            )}

            {/* Vehicle list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingVehicles ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={24} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
                  Loading vehicles...
                </div>
              ) : availableVehicles.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  <Car size={36} style={{ marginBottom: 10, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No available vehicles</div>
                  <div style={{ fontSize: '0.8rem' }}>All your vehicles are already assigned to other drivers, or you have no vehicles registered yet.</div>
                </div>
              ) : (
                <div>
                  {/* Option to remove vehicle */}
                  {assignModalFor.unit_id && (
                    <div
                      style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      onClick={() => !savingVehicle && handleAssignVehicle(null)}
                    >
                      <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>Remove vehicle assignment</span>
                    </div>
                  )}
                  {availableVehicles.map(v => {
                    const isCurrent = assignModalFor.unit_id === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => !savingVehicle && !isCurrent && handleAssignVehicle(v.id)}
                        style={{
                          padding: '14px 24px', borderBottom: '1px solid #f8fafc',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          cursor: isCurrent ? 'default' : 'pointer',
                          background: isCurrent ? '#eff6ff' : 'white',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'white'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: isCurrent ? '#dbeafe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Car size={16} color={isCurrent ? '#3b82f6' : '#64748b'} />
                          </div>
                          <div>
                            <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{v.plate_number}</code>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.make} {v.model} {v.year ? `(${v.year})` : ''}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isCurrent ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', background: '#dbeafe', padding: '3px 8px', borderRadius: 6 }}>Current</span>
                          ) : savingVehicle ? (
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />
                          ) : (
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0' }}>Select</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setAssignModalFor(null)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
