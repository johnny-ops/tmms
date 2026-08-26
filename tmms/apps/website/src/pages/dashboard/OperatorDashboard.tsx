import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, FileText, AlertTriangle, UserCheck,
  CheckCircle, ArrowRight
} from 'lucide-react';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { useTable } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';

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

export function OperatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step 1: Look up THIS operator's own record via profile_id (auth UUID)
  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const { data: operatorRecords } = useTable<any>('operators', [], profileFilter ? { filter: profileFilter } : undefined);
  const myOperatorId = user?.id ? (operatorRecords[0]?.id ?? null) : null;

  // Step 2: Filter all fleet data by this operator's ID — empty if not found yet
  const opFilter = myOperatorId ? { column: 'operator_id', value: myOperatorId } : null;

  const { data: rawVehicles }      = useTable<any>('vehicles',        [], opFilter ? { filter: opFilter } : undefined);
  const { data: rawFranchises }    = useTable<any>('franchises',      [], opFilter ? { filter: opFilter } : undefined);
  const { data: rawDrivers }       = useTable<any>('drivers',         [], opFilter ? { filter: opFilter } : undefined);
  const { data: rawTickets }       = useTable<any>('traffic_tickets', [], opFilter ? { filter: opFilter } : undefined);
  const { data: violationTypes }   = useTable<any>('violation_types');

  // Guard: new operators with no operator record see empty data
  const vehicles   = myOperatorId ? rawVehicles   : [];
  const franchises = myOperatorId ? rawFranchises : [];
  const drivers    = myOperatorId ? rawDrivers    : [];
  const tickets    = myOperatorId ? rawTickets    : [];

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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
          Welcome, {user?.full_name}
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Operator Dashboard — Manage your fleet and drivers
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard icon={<Car size={18} />} label="My Vehicles" value={stats.totalVehicles} color="#3a65ae" />
        <StatCard icon={<CheckCircle size={18} />} label="Active Vehicles" value={stats.activeVehicles} color="#22c55e" />
        <StatCard icon={<FileText size={18} />} label="Active Franchises" value={stats.activeFranchises} color="#7c3aed" />
        <StatCard icon={<UserCheck size={18} />} label="Assigned Drivers" value={stats.totalDrivers} color="#d97706" />
        <StatCard icon={<AlertTriangle size={18} />} label="Pending Violations" value={stats.pendingViolations} color="#dc2626" alert={stats.pendingViolations > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>My Fleet</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/operator/vehicles')}>
              View all <ArrowRight size={11} />
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Plate No.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.slice(0, 5).map(v => (
                <tr key={v.id}>
                  <td><code style={{ fontWeight: 700 }}>{v.plate_number}</code></td>
                  <td><span className={`badge ${getStatusBadgeClass(v.status)}`}>{formatStatus(v.status)}</span></td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No vehicles found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Assigned Drivers</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/operator/drivers')}>
              View all <ArrowRight size={11} />
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>License Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.slice(0, 5).map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.full_name}</td>
                  <td><span className={`badge ${getStatusBadgeClass(d.status)}`}>{formatStatus(d.status)}</span></td>
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No drivers assigned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Recent Violations</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/operator/tickets')}>
            View all <ArrowRight size={11} />
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Date</th>
              <th>Vehicle Plate</th>
              <th>Violation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.slice(0, 5).map(t => {
              const matchedVehicle = vehicles.find(v => v.id === t.vehicle_id);
              return (
                <tr key={t.id}>
                  <td><code style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.id.slice(0, 8)}</code></td>
                  <td>{formatDate(t.created_at)}</td>
                  <td><code style={{ fontWeight: 700 }}>{matchedVehicle ? matchedVehicle.plate_number : 'Unknown'}</code></td>
                  <td style={{ fontWeight: 600, color: '#374151', fontSize: '0.82rem' }}>{t.violation_type_id ? getViolationName(t.violation_type_id) : '—'}</td>
                  <td><span className={`badge ${getStatusBadgeClass(t.status)}`}>{formatStatus(t.status)}</span></td>
                </tr>
              );
            })}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  No violations recorded for your fleet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
