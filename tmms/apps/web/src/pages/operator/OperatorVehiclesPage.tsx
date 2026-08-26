import { useState } from 'react';
import { Search, Filter, Car } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function OperatorVehiclesPage() {
  const { data: vehicles, loading } = useTable('vehicles');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVehicles = vehicles.filter(v => 
    v.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
            My Vehicles
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            View all vehicles registered under your operator account.
          </p>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 10 }} />
            <input
              type="text"
              placeholder="Search by plate number, make, or model..."
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
                <th>Plate Number</th>
                <th>Body Number</th>
                <th>Make & Model</th>
                <th>Capacity</th>
                <th>Reg. Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Loading vehicles...</td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Car size={32} color="#cbd5e1" />
                      <span>No vehicles found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(v => (
                  <tr key={v.id}>
                    <td><code style={{ fontWeight: 700, color: '#0f172a' }}>{v.plate_number}</code></td>
                    <td>{v.body_number || '-'}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{v.make}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.model} ({v.year || 'N/A'})</div>
                    </td>
                    <td>{v.capacity} pax</td>
                    <td>{v.registration_expiry ? formatDate(v.registration_expiry) : '-'}</td>
                    <td><span className={`badge ${getStatusBadgeClass(v.status)}`}>{formatStatus(v.status)}</span></td>
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
