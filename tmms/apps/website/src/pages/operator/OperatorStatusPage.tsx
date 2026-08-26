import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Car } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { getStatusBadgeClass, formatStatus } from '@/lib/utils';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'UNDER_REVIEW', 'FOR_INSPECTION', 'EXPIRED'];

const ACTION_MAP: Record<string, { label: string; color: string }> = {
  SUSPENDED: { label: '⚠ Resolve Violations', color: '#dc2626' },
  FOR_INSPECTION: { label: '🔍 Schedule Inspection', color: '#d97706' },
  EXPIRED: { label: '🔄 Renew Registration', color: '#dc2626' },
  ACTIVE: { label: '✓ None', color: '#16a34a' },
  UNDER_REVIEW: { label: '⏳ Awaiting Approval', color: '#64748b' },
  INACTIVE: { label: '— None', color: '#94a3b8' },
};

export function OperatorStatusPage() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const { data: operatorRecords } = useTable<any>('operators', [], profileFilter ? { filter: profileFilter } : undefined);
  const myOperatorId = user?.id ? (operatorRecords[0]?.id ?? null) : null;

  const opFilter = myOperatorId ? { column: 'operator_id', value: myOperatorId } : null;
  const { data: rawVehicles, loading } = useTable<any>('vehicles', [], opFilter ? { filter: opFilter } : undefined);
  const vehicles = myOperatorId ? rawVehicles : [];

  const filteredVehicles = filterStatus === 'ALL'
    ? vehicles
    : vehicles.filter(v => v.status === filterStatus);

  const statusCounts: Record<string, number> = vehicles.reduce((acc: any, v: any) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={22} color="#3a65ae" /> Vehicle Status Monitor
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Check the real-time operational status and compliance of your fleet.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {vehicles.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {['ACTIVE', 'FOR_INSPECTION', 'SUSPENDED', 'UNDER_REVIEW'].map(s => (
            statusCounts[s] ? (
              <div key={s} style={{
                background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>{statusCounts[s]}</span>
                <span className={`badge ${getStatusBadgeClass(s)}`} style={{ fontSize: '0.7rem', fontWeight: 700 }}>{formatStatus(s)}</span>
              </div>
            ) : null
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              cursor: 'pointer', padding: '7px 16px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
              border: filterStatus === status ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
              background: filterStatus === status ? '#eff6ff' : 'white',
              color: filterStatus === status ? '#1d4ed8' : '#64748b',
              transition: 'all 0.15s'
            }}
          >
            {status === 'ALL' ? `All (${vehicles.length})` : `${formatStatus(status)} ${statusCounts[status] ? `(${statusCounts[status]})` : ''}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <ShieldCheck size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: '0.9rem' }}>Loading status data...</div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <ShieldAlert size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No vehicles match this status</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plate Number</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vehicle</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Body No.</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action Required</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((v, i) => {
                const action = ACTION_MAP[v.status] || { label: '—', color: '#94a3b8' };
                return (
                  <tr key={v.id} style={{ borderBottom: i < filteredVehicles.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Car size={16} color="#3b82f6" />
                        </div>
                        <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', letterSpacing: '0.04em' }}>{v.plate_number}</code>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem', textTransform: 'capitalize' }}>{v.make}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{v.model} · {v.year || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: 5, fontWeight: 600 }}>
                        {v.body_number || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${getStatusBadgeClass(v.status)}`} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px' }}>
                        {formatStatus(v.status)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: action.color }}>{action.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
