import { useState, useEffect } from 'react';
import { ShieldCheck, Car, CheckCircle, XCircle, Clock, AlertCircle, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type InspectionResult = 'PENDING' | 'PASSED' | 'FAILED' | 'FOR_REINSPECTION';

const INSPECTION_CONFIG: Record<InspectionResult, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  PENDING:          { label: 'Pending Inspection', color: '#d97706', bg: '#fffbeb', border: '#fde68a',  icon: <Clock size={13} /> },
  PASSED:           { label: 'Passed',             color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',  icon: <CheckCircle size={13} /> },
  FAILED:           { label: 'Failed',             color: '#dc2626', bg: '#fef2f2', border: '#fecaca',  icon: <XCircle size={13} /> },
  FOR_REINSPECTION: { label: 'For Reinspection',  color: '#ea580c', bg: '#fff7ed', border: '#fed7aa',  icon: <AlertCircle size={13} /> },
};

function InspectionBadge({ result }: { result: InspectionResult }) {
  const cfg = INSPECTION_CONFIG[result] ?? INSPECTION_CONFIG.PENDING;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.72rem', fontWeight: 700 }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export function OperatorStatusPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      const { data: op } = await supabase.from('operators').select('id').eq('profile_id', user.id).maybeSingle();
      if (!op) { setLoading(false); return; }

      const { data: veh } = await supabase
        .from('vehicles')
        .select('*')
        .eq('operator_id', op.id)
        .order('created_at', { ascending: false });

      if (!veh) { setLoading(false); return; }

      // Load inspections for each vehicle
      const vehicleIds = veh.map(v => v.id);
      const { data: inspections } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .order('inspection_date', { ascending: false });

      // Group inspections by vehicle
      const inspMap: Record<string, any[]> = {};
      (inspections || []).forEach(ins => {
        if (!inspMap[ins.vehicle_id]) inspMap[ins.vehicle_id] = [];
        inspMap[ins.vehicle_id].push(ins);
      });

      setVehicles(veh.map(v => ({ ...v, inspections: inspMap[v.id] || [] })));
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
        <ShieldCheck size={40} style={{ marginBottom: 10, opacity: 0.3 }} /><div>Loading status data...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} color="#3a65ae" /> Vehicle Status
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Real-time vehicle registration and inspection status for your fleet.
        </p>
      </div>

      {/* Summary row */}
      {vehicles.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Vehicles', value: vehicles.length, color: '#0f172a' },
            { label: 'Verified', value: vehicles.filter(v => v.verification_status === 'APPROVED').length, color: '#16a34a' },
            { label: 'Pending', value: vehicles.filter(v => v.verification_status === 'PENDING').length, color: '#d97706' },
            { label: 'For Correction', value: vehicles.filter(v => v.verification_status === 'FOR_CORRECTION').length, color: '#dc2626' },
          ].map(item => (
            <div key={item.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 20px', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Vehicle Cards with Inspection History */}
      {vehicles.length === 0 ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <Car size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No vehicles registered</div>
          <div style={{ fontSize: '0.82rem' }}>Go to "My Vehicles" to register your first vehicle.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {vehicles.map(v => {
            const latestInspection = v.inspections[0];
            const isExpanded = expandedVehicle === v.id;
            return (
              <div key={v.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {/* Main row */}
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Car size={20} color="#3b82f6" />
                      </div>
                      <div>
                        <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>{v.plate_number}</code>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{v.vehicle_type} · {v.make} {v.model}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, marginBottom: 3 }}>REGISTRATION</div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: v.verification_status === 'APPROVED' ? '#f0fdf4' : '#fffbeb', color: v.verification_status === 'APPROVED' ? '#16a34a' : '#d97706', border: `1px solid ${v.verification_status === 'APPROVED' ? '#bbf7d0' : '#fde68a'}`, fontSize: '0.72rem', fontWeight: 700 }}>
                          {v.verification_status === 'APPROVED' ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {v.verification_status === 'APPROVED' ? 'Verified' : v.verification_status || 'Pending'}
                        </span>
                      </div>
                      {latestInspection && (
                        <div>
                          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, marginBottom: 3 }}>INSPECTION</div>
                          <InspectionBadge result={latestInspection.result} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Latest inspection summary */}
                  {latestInspection && (
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>LAST INSPECTION</div>
                          <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>{new Date(latestInspection.inspection_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                        {latestInspection.remarks && (
                          <div style={{ maxWidth: 300 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>REMARKS</div>
                            <div style={{ fontSize: '0.82rem', color: latestInspection.result === 'FAILED' ? '#dc2626' : '#374151' }}>{latestInspection.remarks}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse Inspection History */}
                  {v.inspections.length > 0 && (
                    <button onClick={() => setExpandedVehicle(isExpanded ? null : v.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}>
                      <ClipboardList size={14} />
                      {isExpanded ? 'Hide' : 'View'} Inspection History ({v.inspections.length})
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>

                {/* Inspection History */}
                {isExpanded && v.inspections.length > 0 && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '0 20px 20px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 12, marginTop: 16 }}>INSPECTION HISTORY</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {v.inspections.map((ins: any, idx: number) => (
                        <div key={ins.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, background: '#f8fafc', borderRadius: 8, border: `1px solid ${idx === 0 ? '#e2e8f0' : '#f1f5f9'}` }}>
                          <div style={{ flexShrink: 0 }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>#{v.inspections.length - idx}</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{new Date(ins.inspection_date).toLocaleDateString()}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <InspectionBadge result={ins.result} />
                            {ins.remarks && <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 6 }}>{ins.remarks}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
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
