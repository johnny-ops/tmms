import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, AlertTriangle, ShieldCheck,
  ArrowRight, Building2, MapPin
} from 'lucide-react';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { useTable } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

function StatCard({ icon, label, value, color = '#3a65ae', alert }: any) {
  return (
    <div
      style={{
        background: 'white', border: `1px solid ${alert ? '#fecaca' : '#e2e8f0'}`,
        borderRadius: 8, padding: '20px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: 6 }}>{label}</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: alert ? '#dc2626' : '#0f172a', lineHeight: 1 }}>
            {value}
          </p>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<any>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);

  useEffect(() => {
    if (user?.id) loadAssignment();
  }, [user]);

  async function loadAssignment() {
    setLoadingAssignment(true);
    try {
      // Get driver record
      let driverId = user?.driver_id;
      if (!driverId) {
        const { data: dr } = await supabase
          .from('drivers')
          .select('id')
          .eq('profile_id', user?.id)
          .maybeSingle();
        driverId = dr?.id;
      }
      if (!driverId) { setLoadingAssignment(false); return; }

      // Fetch active assignment with vehicle, operator, and route
      const { data } = await supabase
        .from('driver_assignments')
        .select(`
          *,
          unit:vehicles(*),
          operator:operators(full_name, organization, contact_number),
          route:routes(route_code, name, origin, destination)
        `)
        .eq('driver_id', driverId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      setAssignment(data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssignment(false);
    }
  }

  // Violations — use vehicle_id if available, otherwise empty
  const vehicleFilter = assignment?.unit_id
    ? { column: 'vehicle_id', value: assignment.unit_id }
    : null;
  const { data: rawTickets } = useTable<any>('traffic_tickets', [], vehicleFilter ? { filter: vehicleFilter } : undefined);
  const tickets = assignment?.unit_id ? rawTickets : [];

  const vehicle = assignment?.unit ?? null;
  const operator = assignment?.operator ?? null;
  const route = assignment?.route ?? null;

  const stats = {
    pendingViolations: tickets.filter((t: any) => t.status === 'ISSUED' || t.status === 'CONTESTED' || t.status === 'UNDER_REVIEW').length,
    totalViolations: tickets.length,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
          Welcome, Driver {user?.full_name}
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Driver Dashboard — View your assignments and records
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard
          icon={<Car size={18} />}
          label="Assigned Vehicle"
          value={loadingAssignment ? '...' : (vehicle ? vehicle.plate_number : 'None')}
          color="#3a65ae"
        />
        <StatCard icon={<AlertTriangle size={18} />} label="Pending Violations" value={stats.pendingViolations} color="#dc2626" alert={stats.pendingViolations > 0} />
        <StatCard icon={<ShieldCheck size={18} />} label="Total Violations" value={stats.totalViolations} color="#7c3aed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Current Assignment Card */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Current Assignment</h3>
            {assignment && (
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/driver/vehicle')}>
                Details <ArrowRight size={11} />
              </button>
            )}
          </div>
          <div style={{ padding: '20px' }}>
            {loadingAssignment ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>
                Loading...
              </div>
            ) : !assignment ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                <Car size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4, fontSize: '0.9rem' }}>No assignment yet</div>
                <div style={{ fontSize: '0.78rem' }}>Apply to an operator from My Applications.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Vehicle */}
                {vehicle ? (
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 4 }}>PLATE NUMBER</div>
                    <code style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em' }}>
                      {vehicle.plate_number}
                    </code>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                      {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
                    </div>
                    <span className={`badge ${getStatusBadgeClass(vehicle.status)}`} style={{ marginTop: 6, display: 'inline-block', fontSize: '0.7rem' }}>
                      {formatStatus(vehicle.status)}
                    </span>
                  </div>
                ) : (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⚠ No vehicle assigned yet. Your operator will assign one soon.
                  </div>
                )}

                {/* Operator */}
                {operator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={14} color="#3b82f6" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>OPERATOR</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{operator.organization || operator.full_name || 'My Operator'}</div>
                    </div>
                  </div>
                )}

                {/* Route */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={14} color="#a855f7" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>CURRENT ROUTE</div>
                    {route ? (
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#7c3aed' }}>
                        [{route.route_code}] {route.origin} → {route.destination}
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate('/driver/routing')}
                        style={{ fontSize: '0.78rem', color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, textDecoration: 'underline' }}
                      >
                        Set your route →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Violations */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Recent Violations</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/driver/violations')}>
              View all <ArrowRight size={11} />
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.slice(0, 5).map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontSize: '0.85rem' }}>{formatDate(t.incident_date || t.created_at)}</td>
                  <td><span className={`badge ${getStatusBadgeClass(t.status)}`}>{formatStatus(t.status)}</span></td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    You have a clean record!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
