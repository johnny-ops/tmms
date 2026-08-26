import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, AlertTriangle, ShieldCheck,
  CheckCircle, Bell, ArrowRight
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

export function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const filter = user?.driver_id ? { column: 'driver_id', value: user.driver_id } : undefined;
  
  // Actually, for traffic_tickets, it might not have driver_id directly in the DB currently, but we can try to filter by the vehicle plate or just use driver_id if it exists.
  // The schema for traffic_tickets has driver_id? No, it has issued_by (enforcer). 
  // Wait, let's look at types/index.ts for traffic_tickets: it has driver_id?: string.
  const { data: vehicles } = useTable<any>('vehicles', [], { filter });
  const { data: tickets } = useTable<any>('traffic_tickets', [], { filter });

  const assignedVehicle = vehicles[0]; 
  
  const stats = {
    pendingViolations: tickets.filter(t => t.status === 'ISSUED' || t.status === 'CONTESTED' || t.status === 'UNDER_REVIEW').length,
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
        <StatCard icon={<Car size={18} />} label="Assigned Vehicle" value={assignedVehicle ? assignedVehicle.plate_number : 'None'} color="#3a65ae" />
        <StatCard icon={<AlertTriangle size={18} />} label="Pending Violations" value={stats.pendingViolations} color="#dc2626" alert={stats.pendingViolations > 0} />
        <StatCard icon={<ShieldCheck size={18} />} label="Total Violations" value={stats.totalViolations} color="#7c3aed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Current Assignment</h3>
          </div>
          <div style={{ padding: '20px' }}>
            {assignedVehicle ? (
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a', marginBottom: 8 }}>
                  {assignedVehicle.plate_number}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 16 }}>
                  {assignedVehicle.make} {assignedVehicle.model}
                </div>
                <span className={`badge ${getStatusBadgeClass(assignedVehicle.status)}`}>{formatStatus(assignedVehicle.status)}</span>
              </div>
            ) : (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                No vehicle currently assigned.
              </div>
            )}
          </div>
        </div>
        
        {}
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
              {tickets.slice(0, 5).map(t => (
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
