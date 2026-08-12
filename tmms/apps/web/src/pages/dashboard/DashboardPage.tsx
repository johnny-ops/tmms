import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, FileText, AlertTriangle, ClipboardCheck, ParkingSquare,
  Building2, Camera, Bell, CheckCircle, XCircle, Clock,
  ShieldAlert, ArrowRight, RefreshCw, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { useTable, useRealtime } from '@/hooks/useSupabase';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  alert?: boolean;
  onClick?: () => void;
}

function StatCard({ icon, label, value, sub, color = '#3a65ae', alert, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        border: `1px solid ${alert ? '#fecaca' : '#e2e8f0'}`,
        borderRadius: 8,
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: 6 }}>{label}</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: alert ? '#dc2626' : '#0f172a', lineHeight: 1 }}>
            {value}
          </p>
          {sub && <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>{sub}</p>}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      {onClick && (
        <div style={{ marginTop: 12, fontSize: '0.72rem', color: '#3a65ae', display: 'flex', alignItems: 'center', gap: 4 }}>
          View details <ArrowRight size={10} />
        </div>
      )}
    </div>
  );
}

function AlertBanner({ icon, text, variant = 'warning' }: { icon: React.ReactNode; text: string; variant?: 'warning' | 'danger' | 'success' | 'info' }) {
  const styles = {
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    danger:  { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  };
  const s = styles[variant];
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: s.text, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '0.82rem', color: s.text }}>{text}</span>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const { data: vehicles } = useTable('vehicles');
  const { data: franchises } = useTable('franchises');
  const { data: aiCandidates, refetch: refetchAI } = useTable('ai_violation_candidates', [], { orderBy: 'created_at', ascending: false });
  const { data: parkingSlots } = useTable('parking_slots');
  const { data: tickets } = useTable('traffic_tickets');

  useRealtime('ai_violation_candidates', () => {
    refetchAI();
    setLastUpdated(new Date());
  });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const stats = {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === 'ACTIVE').length,
    inactiveVehicles: vehicles.filter(v => v.status === 'INACTIVE').length,
    expiredFranchises: franchises.filter(f => f.status === 'EXPIRED').length,
    franchisesExpiringSoon: franchises.filter(f => {
      if (!f.validity_end) return false;
      const exp = new Date(f.validity_end);
      return exp > now && exp <= in30Days;
    }).length,
    vehiclesDueForInspection: vehicles.filter(v => v.status === 'FOR_INSPECTION').length,
    failedInspections: 0, // Need inspections table for this
    pendingViolations: tickets.filter(t => t.status === 'ISSUED' || t.status === 'CONTESTED' || t.status === 'UNDER_REVIEW').length,
    todayViolations: tickets.filter(t => new Date(t.created_at).toDateString() === now.toDateString()).length,
    occupiedParkingSlots: parkingSlots.filter((s: any) => s.slot_status === 'OCCUPIED').length,
    availableParkingSlots: parkingSlots.filter((s: any) => s.slot_status === 'AVAILABLE').length,
    activeTerminals: 2, // Hardcoded for now unless terminals table is fetched
    aiDetectionsToday: aiCandidates.filter((c: any) => new Date(c.created_at).toDateString() === now.toDateString()).length,
    aiCandidatesPendingVerification: aiCandidates.filter((c: any) => c.verification_status === 'AI_SUGGESTED').length,
  };

  const parkingPct = (stats.occupiedParkingSlots + stats.availableParkingSlots) > 0
    ? Math.round((stats.occupiedParkingSlots / (stats.occupiedParkingSlots + stats.availableParkingSlots)) * 100)
    : 0;

  // Build real monthly trend data from tickets
  const monthlyViolations = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = new Array(12).fill(0);
    tickets.forEach((t: any) => {
      if (t.incident_date || t.created_at) {
        const d = new Date(t.incident_date || t.created_at);
        if (!isNaN(d.getTime())) counts[d.getMonth()]++;
      }
    });
    return months.map((month, i) => ({ month, count: counts[i] }));
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* GOVSERVE Logo */}
          <img
            src="/govserve-logo.png"
            alt="GOVSERVE"
            style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }}
          />
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2, letterSpacing: '-0.02em' }}>
              GOV<span style={{ color: '#3b82f6' }}>SERVE</span> Dashboard
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              LGU Transport & Mobility Management System — Live Overview
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#64748b' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
            Live · Updated {lastUpdated.toLocaleTimeString()}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { refetchAI(); setLastUpdated(new Date()); }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {(stats.franchisesExpiringSoon > 0 || stats.vehiclesDueForInspection > 0 || stats.aiCandidatesPendingVerification > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {stats.franchisesExpiringSoon > 0 && (
            <AlertBanner icon={<AlertTriangle size={14} />} text={`${stats.franchisesExpiringSoon} franchise(s) are expiring within 30 days — action required.`} variant="warning" />
          )}
          {stats.vehiclesDueForInspection > 0 && (
            <AlertBanner icon={<ClipboardCheck size={14} />} text={`${stats.vehiclesDueForInspection} vehicle(s) are overdue for inspection.`} variant="warning" />
          )}
          {stats.aiCandidatesPendingVerification > 0 && (
            <AlertBanner icon={<Camera size={14} />} text={`${stats.aiCandidatesPendingVerification} AI-detected violation(s) pending human verification.`} variant="danger" />
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard icon={<Car size={18} />} label="Total Registered PUVs" value={stats.totalVehicles} color="#3a65ae" onClick={() => navigate('/puv')} />
        <StatCard icon={<CheckCircle size={18} />} label="Active PUVs" value={stats.activeVehicles} sub={`${stats.inactiveVehicles} inactive`} color="#22c55e" onClick={() => navigate('/puv')} />
        <StatCard icon={<FileText size={18} />} label="Expired Franchises" value={stats.expiredFranchises} alert color="#ef4444" onClick={() => navigate('/franchise')} />
        <StatCard icon={<Clock size={18} />} label="Expiring Franchises" value={stats.franchisesExpiringSoon} sub="Within 30 days" color="#f59e0b" alert={stats.franchisesExpiringSoon > 0} onClick={() => navigate('/franchise')} />
        <StatCard icon={<ClipboardCheck size={18} />} label="Due for Inspection" value={stats.vehiclesDueForInspection} color="#d97706" onClick={() => navigate('/inspections')} />
        <StatCard icon={<XCircle size={18} />} label="Failed Inspections" value={stats.failedInspections} color="#dc2626" onClick={() => navigate('/inspections')} />
        <StatCard icon={<ShieldAlert size={18} />} label="Pending Violations" value={stats.pendingViolations} color="#dc2626" alert onClick={() => navigate('/violations')} />
        <StatCard icon={<ParkingSquare size={18} />} label="Parking Utilization" value={`${parkingPct}%`} sub={`${stats.occupiedParkingSlots} occupied · ${stats.availableParkingSlots} free`} color="#3a65ae" onClick={() => navigate('/parking/slots')} />
        <StatCard icon={<Building2 size={18} />} label="Active Terminals" value={stats.activeTerminals} color="#22c55e" onClick={() => navigate('/terminals')} />
        <StatCard icon={<Camera size={18} />} label="AI Detections Today" value={stats.aiDetectionsToday} color="#7c3aed" onClick={() => navigate('/ai-monitor')} />
        <StatCard icon={<Bell size={18} />} label="Pending AI Review" value={stats.aiCandidatesPendingVerification} color="#ef4444" alert={stats.aiCandidatesPendingVerification > 0} onClick={() => navigate('/ai-monitor')} />
        <StatCard icon={<Activity size={18} />} label="Today's Violations" value={stats.todayViolations} color="#f59e0b" onClick={() => navigate('/tickets')} />
      </div>

      {/* Charts + Recent Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Violations Trend */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '20px' }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Violations Trend</h3>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Monthly traffic violation count</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyViolations}>
              <defs>
                <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3a65ae" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3a65ae" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.8rem' }} />
              <Area type="monotone" dataKey="count" stroke="#3a65ae" fill="url(#vGrad)" strokeWidth={2} dot={{ r: 3, fill: '#3a65ae' }} name="Violations" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent AI Detections */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>AI Detection Feed</h3>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Latest violation candidates</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ai-monitor')}>
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {aiCandidates.slice(0, 5).map((c: any) => (
              <div key={c.id} style={{ padding: '10px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{c.rule_triggered}</div>
                  <code style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.plate_number}</code>
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700,
                  color: c.ai_confidence >= 0.85 ? '#dc2626' : '#d97706',
                  background: c.ai_confidence >= 0.85 ? '#fef2f2' : '#fffbeb',
                  padding: '2px 8px', borderRadius: 4
                }}>
                  {(c.ai_confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {aiCandidates.length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                No detections yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent PUV Table */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Recent PUV Records</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/puv')}>
            View all <ArrowRight size={11} />
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Plate No.</th>
              <th>Make / Model</th>
              <th>Status</th>
              <th>Reg. Expiry</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.slice(0, 5).map(v => (
              <tr key={v.id}>
                <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>{v.plate_number}</code></td>
                <td style={{ color: '#64748b' }}>{v.make} {v.model}</td>
                <td><span className={`badge ${getStatusBadgeClass(v.status)}`}>{formatStatus(v.status)}</span></td>
                <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{formatDate(v.registration_expiry)}</td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No PUVs registered yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
