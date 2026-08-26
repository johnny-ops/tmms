import { useState } from 'react';
import { Search, Car, Calendar, Hash } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function OperatorVehiclesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const { data: operatorRecords } = useTable<any>('operators', [], profileFilter ? { filter: profileFilter } : undefined);
  const myOperatorId = user?.id ? (operatorRecords[0]?.id ?? null) : null;

  const opFilter = myOperatorId ? { column: 'operator_id', value: myOperatorId } : null;
  const { data: rawVehicles, loading } = useTable<any>('vehicles', [], opFilter ? { filter: opFilter } : undefined);
  const vehicles = myOperatorId ? rawVehicles : [];

  const filteredVehicles = vehicles.filter(v =>
    v.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Car size={22} color="#3a65ae" /> My Vehicles
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            View all vehicles registered under your operator account.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', borderRadius: 8, padding: '6px 14px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total:</span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{vehicles.length}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by plate number, make, or model..."
            style={{
              width: '100%', paddingLeft: 38, paddingRight: 16, height: 40,
              border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem',
              outline: 'none', background: '#f8fafc', color: '#1e293b',
              boxSizing: 'border-box'
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <Car size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: '0.9rem' }}>Loading vehicles...</div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <Car size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No vehicles found</div>
            <div style={{ fontSize: '0.82rem' }}>No vehicles are registered under your account yet.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plate Number</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Body No.</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Make & Model</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Capacity</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reg. Expiry</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((v, i) => (
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
                    <span style={{ fontSize: '0.85rem', color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: 5, fontWeight: 600 }}>
                      {v.body_number || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem', textTransform: 'capitalize' }}>{v.make}</div>
                    <div style={{ fontSize: '0.77rem', color: '#64748b', marginTop: 2 }}>{v.model} · {v.year || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Hash size={13} color="#94a3b8" />
                      <span style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 600 }}>{v.capacity} pax</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={13} color="#94a3b8" />
                      <span style={{ fontSize: '0.85rem', color: '#374151' }}>{v.registration_expiry ? formatDate(v.registration_expiry) : '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge ${getStatusBadgeClass(v.status)}`} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px' }}>
                      {formatStatus(v.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
