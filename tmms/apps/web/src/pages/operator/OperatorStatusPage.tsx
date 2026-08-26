import { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function OperatorStatusPage() {
  const { data: vehicles, loading } = useTable('vehicles');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredVehicles = vehicles.filter(v => 
    filterStatus === 'ALL' ? true : v.status === filterStatus
  );

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
            Vehicle Status Monitor
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Check the real-time operational status and compliance of your fleet.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'UNDER_REVIEW'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`badge ${filterStatus === status ? 'badge-active' : ''}`}
            style={{ 
              cursor: 'pointer', 
              padding: '6px 16px',
              border: filterStatus === status ? '2px solid #3b82f6' : '1px solid #cbd5e1',
              background: filterStatus === status ? '#eff6ff' : 'white',
              color: filterStatus === status ? '#1d4ed8' : '#64748b'
            }}
          >
            {formatStatus(status)}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Plate Number</th>
                <th>Vehicle Info</th>
                <th>Current Status</th>
                <th>Action Required</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Loading status data...</td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={32} color="#cbd5e1" />
                      <span>No vehicles match this status</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(v => (
                  <tr key={v.id}>
                    <td><code style={{ fontWeight: 700, color: '#0f172a' }}>{v.plate_number}</code></td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>{v.make} {v.model}</div>
                    </td>
                    <td><span className={`badge ${getStatusBadgeClass(v.status)}`}>{formatStatus(v.status)}</span></td>
                    <td>
                      {v.status === 'SUSPENDED' && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>Resolve Violations</span>}
                      {v.status === 'FOR_INSPECTION' && <span style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: 600 }}>Schedule Inspection</span>}
                      {v.status === 'EXPIRED' && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>Renew Registration</span>}
                      {v.status === 'ACTIVE' && <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>None</span>}
                      {v.status === 'UNDER_REVIEW' && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Awaiting Approval</span>}
                      {v.status === 'INACTIVE' && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>None</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
