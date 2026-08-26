import { useState } from 'react';
import { Search, Filter, FileText } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function OperatorFranchisesPage() {
  const { data: franchises, loading } = useTable('franchises');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFranchises = franchises.filter(f => 
    f.franchise_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
            My Franchises
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Manage your transport franchises and route assignments.
          </p>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 10 }} />
            <input
              type="text"
              placeholder="Search by franchise number..."
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
                <th>Franchise No.</th>
                <th>Application Date</th>
                <th>Validity Period</th>
                <th>Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Loading franchises...</td>
                </tr>
              ) : filteredFranchises.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <FileText size={32} color="#cbd5e1" />
                      <span>No franchises found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFranchises.map(f => (
                  <tr key={f.id}>
                    <td><code style={{ fontWeight: 700, color: '#0f172a' }}>{f.franchise_number}</code></td>
                    <td>{formatDate(f.application_date)}</td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        {f.validity_start ? formatDate(f.validity_start) : '-'} <br />
                        <span style={{ color: '#64748b' }}>to</span> <br />
                        {f.validity_end ? formatDate(f.validity_end) : '-'}
                      </div>
                    </td>
                    <td>{f.authorized_capacity ? `${f.authorized_capacity} units` : 'N/A'}</td>
                    <td><span className={`badge ${getStatusBadgeClass(f.status)}`}>{formatStatus(f.status)}</span></td>
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
