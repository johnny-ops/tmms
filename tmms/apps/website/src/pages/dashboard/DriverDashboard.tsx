import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, AlertTriangle, ShieldCheck, ArrowRight,
  Building2, MapPin, User, FileText, Bell, ChevronRight,
  CheckCircle2, Clock, TrendingUp
} from 'lucide-react';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { useTable } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ── Mobile-aware stat card ──────────────────────────────────
function StatCard({ icon, label, value, color = '#3a65ae', alert, onClick }: any) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        border: `1.5px solid ${alert ? '#fecaca' : '#e2e8f0'}`,
        borderRadius: 14,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: alert ? '0 0 0 3px rgba(220,38,38,0.08)' : 'none',
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; } }}
      onMouseLeave={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = alert ? '0 0 0 3px rgba(220,38,38,0.08)' : 'none'; } }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: alert ? '#fef2f2' : `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: alert ? '#dc2626' : color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: '1.6rem', fontWeight: 800, color: alert ? '#dc2626' : '#0f172a', lineHeight: 1 }}>{value}</p>
      </div>
      {onClick && <ChevronRight size={16} color="#cbd5e1" style={{ flexShrink: 0 }} />}
    </div>
  );
}

// ── Quick action button ─────────────────────────────────────
function QuickAction({ icon, label, onClick, color = '#3a65ae' }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12,
        padding: '16px 12px', cursor: 'pointer', transition: 'all 0.15s', flex: 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}08`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </button>
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

  const vehicleFilter = assignment?.unit_id
    ? { column: 'vehicle_id', value: assignment.unit_id }
    : null;
  const { data: rawTickets } = useTable<any>('traffic_tickets', [], vehicleFilter ? { filter: vehicleFilter } : undefined);
  const tickets = assignment?.unit_id ? rawTickets : [];

  const vehicle = assignment?.unit ?? null;
  const operator = assignment?.operator ?? null;
  const route = assignment?.route ?? null;

  const stats = {
    pendingViolations: tickets.filter((t: any) =>
      t.status === 'ISSUED' || t.status === 'CONTESTED' || t.status === 'UNDER_REVIEW'
    ).length,
    totalViolations: tickets.length,
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';
  const driverName = user?.first_name || user?.full_name?.split(',')[1]?.trim() || user?.full_name || 'Driver';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0e1629 0%, #1e3a5f 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 20,
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, right: 60, width: 80, height: 80,
          borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
        }} />
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>{greeting},</p>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {driverName} 👋
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16 }}>
            Driver Portal — Here's your overview for today
          </p>
          {vehicle && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px',
              fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <Car size={14} />
              {vehicle.plate_number} · {vehicle.make} {vehicle.model}
            </div>
          )}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: 12, marginBottom: 20,
      }}>
        <StatCard
          icon={<Car size={22} />}
          label="Assigned Vehicle"
          value={loadingAssignment ? '...' : (vehicle ? vehicle.plate_number : 'None')}
          color="#3a65ae"
          onClick={() => navigate('/driver/vehicle')}
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Active Violations"
          value={stats.pendingViolations}
          color="#dc2626"
          alert={stats.pendingViolations > 0}
          onClick={() => navigate('/driver/violations')}
        />
        <StatCard
          icon={<ShieldCheck size={22} />}
          label="Total Violations"
          value={stats.totalViolations}
          color="#7c3aed"
          onClick={() => navigate('/driver/violations')}
        />
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <QuickAction icon={<User size={18} />} label="My Profile" onClick={() => navigate('/driver/profile')} color="#3a65ae" />
          <QuickAction icon={<FileText size={18} />} label="My License" onClick={() => navigate('/driver/license')} color="#059669" />
          <QuickAction icon={<TrendingUp size={18} />} label="Applications" onClick={() => navigate('/driver/applications')} color="#d97706" />
          <QuickAction icon={<MapPin size={18} />} label="My Route" onClick={() => navigate('/driver/routing')} color="#7c3aed" />
          <QuickAction icon={<Bell size={18} />} label="Notifications" onClick={() => navigate('/driver/notifications')} color="#0891b2" />
        </div>
      </div>

      {/* ── ASSIGNMENT + VIOLATIONS: stacked on mobile, side-by-side on desktop ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 16,
      }}>

        {/* Current Assignment */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Current Assignment</h3>
            {assignment && (
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/driver/vehicle')} style={{ fontSize: '0.75rem' }}>
                Details <ArrowRight size={11} />
              </button>
            )}
          </div>
          <div style={{ padding: '20px' }}>
            {loadingAssignment ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px', fontSize: '0.85rem' }}>
                <div style={{ width: 24, height: 24, border: '2px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 12px' }} />
                Loading...
              </div>
            ) : !assignment ? (
              <div style={{ textAlign: 'center', padding: '28px 20px' }}>
                <Car size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.2 }} />
                <div style={{ fontWeight: 700, color: '#64748b', marginBottom: 4, fontSize: '0.9rem' }}>No active assignment</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 16 }}>Apply to an operator to get assigned a vehicle</div>
                <button
                  onClick={() => navigate('/driver/applications')}
                  style={{ padding: '8px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Browse Operators →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Vehicle plate */}
                {vehicle && (
                  <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: 10, padding: '16px 18px', color: 'white' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', marginBottom: 4 }}>PLATE NUMBER</div>
                    <code style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.06em', color: '#ffffff', display: 'block' }}>
                      {vehicle.plate_number}
                    </code>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                      {vehicle.make} {vehicle.model} {vehicle.year ? `· ${vehicle.year}` : ''}
                    </div>
                  </div>
                )}

                {/* Operator */}
                {operator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={16} color="#3b82f6" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>OPERATOR</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{operator.organization || operator.full_name}</div>
                      {operator.contact_number && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{operator.contact_number}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Route */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#faf5ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={16} color="#7c3aed" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>ASSIGNED ROUTE</div>
                    {route ? (
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6d28d9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        [{route.route_code}] {route.origin} → {route.destination}
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate('/driver/routing')}
                        style={{ fontSize: '0.78rem', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                      >
                        Tap to set your route →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Violations */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Recent Violations</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/driver/violations')} style={{ fontSize: '0.75rem' }}>
              View all <ArrowRight size={11} />
            </button>
          </div>

          {tickets.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle2 size={28} color="#22c55e" />
              </div>
              <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4, fontSize: '0.9rem' }}>Clean Record!</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No violations on record</div>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {tickets.slice(0, 5).map((t: any) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px', borderBottom: '1px solid #f8fafc',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={15} color="#dc2626" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.violation_type?.name || 'Traffic Violation'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>
                      {formatDate(t.incident_date || t.created_at)}
                    </div>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(t.status)}`} style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                    {formatStatus(t.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
