import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, FileText, AlertTriangle, UserCheck,
  CheckCircle, ArrowRight, Shield
} from 'lucide-react';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { useTable } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

function StatCard({ icon, label, value, color = '#3a65ae', bg = '#eff6ff', alert }: any) {
  return (
    <div style={{
      background: 'white',
      border: `1.5px solid ${alert && value > 0 ? '#fecaca' : '#f1f5f9'}`,
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: alert && value > 0 ? '#fef2f2' : bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: alert && value > 0 ? '#dc2626' : color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: '1.9rem', fontWeight: 800, color: alert && value > 0 ? '#dc2626' : '#0f172a', lineHeight: 1 }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ title, onViewAll, children }: { title: string; onViewAll: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
        <button
          onClick={onViewAll}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#3b82f6', background: '#eff6ff', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}
        >
          View all <ArrowRight size={12} />
        </button>
      </div>
      {children}
    </div>
  );
}

export function OperatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);

  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const { data: operatorRecords } = useTable<any>('operators', [], profileFilter ? { filter: profileFilter } : undefined);
  const myOperatorId = user?.id ? (operatorRecords[0]?.id ?? null) : null;

  const opFilter = myOperatorId ? { column: 'operator_id', value: myOperatorId } : undefined;

  const { data: vehicles }    = useTable<any>('vehicles',   [], opFilter ? { filter: opFilter } : undefined);
  const { data: franchises }  = useTable<any>('franchises', [], opFilter ? { filter: opFilter } : undefined);
  const { data: drivers }     = useTable<any>('drivers',    [], opFilter ? { filter: opFilter } : undefined);
  const { data: violationTypes } = useTable<any>('violation_types');

  // Load tickets by vehicle IDs only — avoids the broken operator_id filter
  useEffect(() => {
    if (!myOperatorId || vehicles.length === 0) { setTickets([]); return; }
    const vehicleIds = vehicles.map((v: any) => v.id);
    supabase
      .from('traffic_tickets')
      .select('*')
      .in('vehicle_id', vehicleIds)
      .order('created_at', { ascending: false })
      .then(({ data }) => setTickets(data ?? []));
  }, [myOperatorId, vehicles.length]);

  const getViolationName = (id: string) => {
    const vt = violationTypes.find((v: any) => v.id === id);
    return vt?.name || vt?.code || 'Violation';
  };

  const stats = {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === 'ACTIVE').length,
    totalDrivers: drivers.length,
    activeFranchises: franchises.filter(f => f.status === 'ACTIVE').length,
    pendingViolations: tickets.filter(t => t.status === 'ISSUED' || t.status === 'CONTESTED' || t.status === 'UNDER_REVIEW').length,
  };

  const firstName = user?.full_name?.split(' ')[0] || user?.full_name || 'Operator';

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          Welcome back, {firstName} <span style={{ fontSize: '1.2rem' }}>👋</span>
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Here's an overview of your fleet and drivers.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard icon={<Car size={22} />}           label="My Vehicles"        value={stats.totalVehicles}     color="#3b82f6" bg="#eff6ff" />
        <StatCard icon={<CheckCircle size={22} />}   label="Active Vehicles"    value={stats.activeVehicles}    color="#16a34a" bg="#f0fdf4" />
        <StatCard icon={<FileText size={22} />}      label="Active Franchises"  value={stats.activeFranchises}  color="#7c3aed" bg="#fdf4ff" />
        <StatCard icon={<UserCheck size={22} />}     label="Assigned Drivers"   value={stats.totalDrivers}      color="#d97706" bg="#fffbeb" />
        <StatCard icon={<AlertTriangle size={22} />} label="Pending Violations" value={stats.pendingViolations} color="#dc2626" bg="#fef2f2" alert />
      </div>

      {/* Fleet + Drivers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* My Fleet */}
        <SectionCard title="My Fleet" onViewAll={() => navigate('/operator/vehicles')}>
          <div style={{ padding: '8px 0' }}>
            {vehicles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                <Car size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                <div style={{ fontSize: '0.85rem' }}>No vehicles found</div>
              </div>
            ) : (
              vehicles.slice(0, 5).map((v, i) => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 20px',
                  borderBottom: i < Math.min(vehicles.length, 5) - 1 ? '1px solid #f8fafc' : 'none',
                  background: i % 2 === 0 ? 'white' : '#fafafa'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Car size={16} color="#3b82f6" />
                    </div>
                    <div>
                      <code style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '0.04em' }}>{v.plate_number}</code>
                      {v.body_number && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Body #{v.body_number}</div>}
                    </div>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(v.status)}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>{formatStatus(v.status)}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        {/* Assigned Drivers */}
        <SectionCard title="Assigned Drivers" onViewAll={() => navigate('/operator/drivers')}>
          <div style={{ padding: '8px 0' }}>
            {drivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                <UserCheck size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                <div style={{ fontSize: '0.85rem' }}>No drivers assigned</div>
              </div>
            ) : (
              drivers.slice(0, 5).map((d, i) => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 20px',
                  borderBottom: i < Math.min(drivers.length, 5) - 1 ? '1px solid #f8fafc' : 'none',
                  background: i % 2 === 0 ? 'white' : '#fafafa'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: '#f0fdf4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 700, color: '#16a34a'
                    }}>
                      {(d.full_name || 'D')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>{d.full_name || '—'}</div>
                      {d.license_number && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>LIC: {d.license_number}</div>}
                    </div>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(d.status)}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>{formatStatus(d.status)}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Recent Violations */}
      <SectionCard title="Recent Violations" onViewAll={() => navigate('/operator/tickets')}>
        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
            <Shield size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.25 }} />
            <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4 }}>No violations on record</div>
            <div style={{ fontSize: '0.82rem' }}>Your fleet is clean. Keep it up!</div>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 110px 1fr 1fr 110px', gap: 8, padding: '8px 20px 10px', borderBottom: '1px solid #f1f5f9' }}>
              {['Ticket ID', 'Date', 'Plate', 'Violation', 'Status'].map(h => (
                <div key={h} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {tickets.slice(0, 5).map((t, i) => {
              const matchedVehicle = vehicles.find(v => v.id === t.vehicle_id);
              return (
                <div key={t.id} style={{
                  display: 'grid', gridTemplateColumns: '120px 110px 1fr 1fr 110px',
                  gap: 8, padding: '11px 20px', alignItems: 'center',
                  borderBottom: i < Math.min(tickets.length, 5) - 1 ? '1px solid #f8fafc' : 'none',
                  background: i % 2 === 0 ? 'white' : '#fafafa'
                }}>
                  <code style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{t.id.slice(0, 8)}…</code>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>{formatDate(t.created_at)}</div>
                  <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                    {matchedVehicle ? matchedVehicle.plate_number : '—'}
                  </code>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.violation_type_id ? getViolationName(t.violation_type_id) : '—'}
                  </div>
                  <span className={`badge ${getStatusBadgeClass(t.status)}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>{formatStatus(t.status)}</span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
