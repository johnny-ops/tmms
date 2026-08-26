import { useState } from 'react';
import { Search, Filter, UserCheck } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function OperatorDriversPage() {
  const { data: drivers, loading } = useTable('drivers');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDrivers = drivers.filter(d => 
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.license_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
            Driver Assignments
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            View and manage the drivers assigned to your fleet.
          </p>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 10 }} />
            <input
              type="text"
              placeholder="Search by driver name or license number..."
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', maxWidth: 400 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-outline" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={16} /> Filter
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License Number</th>
                <th>License Expiry</th>
                <th>Contact Number</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Loading drivers...</td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <UserCheck size={32} color="#cbd5e1" />
                      <span>No drivers assigned to your fleet</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{d.full_name}</td>
                    <td><code style={{ color: '#475569' }}>{d.license_number}</code></td>
                    <td>{d.license_expiry ? formatDate(d.license_expiry) : '-'}</td>
                    <td>{d.contact_number || 'N/A'}</td>
                    <td><span className={`badge ${getStatusBadgeClass(d.status)}`}>{formatStatus(d.status)}</span></td>
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
