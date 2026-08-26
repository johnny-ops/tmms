import { useState } from 'react';
import { Search, FileText, Calendar } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function OperatorFranchisesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const { data: operatorRecords } = useTable<any>('operators', [], profileFilter ? { filter: profileFilter } : undefined);
  const myOperatorId = user?.id ? (operatorRecords[0]?.id ?? null) : null;

  const opFilter = myOperatorId ? { column: 'operator_id', value: myOperatorId } : null;
  const { data: rawFranchises, loading } = useTable<any>('franchises', [], opFilter ? { filter: opFilter } : undefined);
  const franchises = myOperatorId ? rawFranchises : [];

  const filteredFranchises = franchises.filter(f =>
    f.franchise_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getValidityBadge = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const endDate = new Date(end);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: 'Expired', color: '#dc2626', bg: '#fef2f2' };
    if (daysLeft <= 30) return { label: `${daysLeft}d left`, color: '#d97706', bg: '#fef3c7' };
    return { label: `${daysLeft}d left`, color: '#16a34a', bg: '#f0fdf4' };
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={22} color="#3a65ae" /> My Franchises
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Manage your transport franchises and route assignments.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', borderRadius: 8, padding: '6px 14px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total:</span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{franchises.length}</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by franchise number..."
            style={{
              width: '100%', paddingLeft: 38, paddingRight: 16, height: 40,
              border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem',
              outline: 'none', background: '#f8fafc', color: '#1e293b', boxSizing: 'border-box'
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
            <FileText size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: '0.9rem' }}>Loading franchises...</div>
          </div>
        ) : filteredFranchises.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No franchises found</div>
            <div style={{ fontSize: '0.82rem' }}>No franchises are registered under your account yet.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Franchise No.</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Application Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Validity Period</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Capacity</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredFranchises.map((f, i) => {
                const validity = getValidityBadge(f.validity_start, f.validity_end);
                return (
                  <tr key={f.id} style={{ borderBottom: i < filteredFranchises.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={16} color="#7c3aed" />
                        </div>
                        <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{f.franchise_number}</code>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span style={{ fontSize: '0.85rem', color: '#374151' }}>{f.application_date ? formatDate(f.application_date) : '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                        {f.validity_start && f.validity_end ? (
                          <>
                            <span style={{ fontWeight: 600 }}>{formatDate(f.validity_start)}</span>
                            <span style={{ color: '#94a3b8', margin: '0 6px' }}>→</span>
                            <span style={{ fontWeight: 600 }}>{formatDate(f.validity_end)}</span>
                            {validity && (
                              <span style={{ marginLeft: 8, fontSize: '0.72rem', fontWeight: 700, color: validity.color, background: validity.bg, padding: '2px 7px', borderRadius: 6 }}>
                                {validity.label}
                              </span>
                            )}
                          </>
                        ) : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#374151' }}>
                        {f.authorized_capacity ? `${f.authorized_capacity} units` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${getStatusBadgeClass(f.status)}`} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px' }}>
                        {formatStatus(f.status)}
                      </span>
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
