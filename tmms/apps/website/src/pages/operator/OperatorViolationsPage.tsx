import { useState } from 'react';
import { Search, AlertTriangle, CreditCard, CheckCircle2 } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function OperatorViolationsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const profileFilter = user?.id ? { column: 'profile_id', value: user.id } : undefined;
  const { data: operatorRecords } = useTable<any>('operators', [], profileFilter ? { filter: profileFilter } : undefined);
  const myOperatorId = user?.id ? (operatorRecords[0]?.id ?? null) : null;

  const opFilter = myOperatorId ? { column: 'operator_id', value: myOperatorId } : null;
  const { data: rawTickets, loading } = useTable<any>('traffic_tickets', [], opFilter ? { filter: opFilter } : undefined);
  const { data: rawVehicles } = useTable<any>('vehicles', [], opFilter ? { filter: opFilter } : undefined);
  const { data: violationTypes } = useTable<any>('violation_types');

  const tickets = myOperatorId ? rawTickets : [];
  const vehicles = myOperatorId ? rawVehicles : [];

  const filteredTickets = tickets.filter(t =>
    t.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.plate_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getViolationName = (id: string) => {
    const vt = violationTypes.find((v: any) => v.id === id);
    return vt?.name || vt?.code || 'Unknown Violation';
  };

  const totalPenalty = filteredTickets.reduce((sum: number, t: any) => sum + (t.penalty_amount || 0), 0);
  const unpaidCount = filteredTickets.filter((t: any) => t.payment_status !== 'PAID').length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={22} color="#3a65ae" /> Violation Records
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Track and manage traffic tickets issued to your vehicles.
          </p>
        </div>
      </div>

      {/* Summary Strip */}
      {tickets.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertTriangle size={18} color="#d97706" />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Tickets</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{tickets.length}</div>
            </div>
          </div>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <CreditCard size={18} color="#dc2626" />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unpaid</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: unpaidCount > 0 ? '#dc2626' : '#16a34a' }}>{unpaidCount}</div>
            </div>
          </div>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <CreditCard size={18} color="#7c3aed" />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Penalty</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#7c3aed' }}>₱{totalPenalty.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by ticket number or plate number..."
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
            <AlertTriangle size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: '0.9rem' }}>Loading violation records...</div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <CheckCircle2 size={48} style={{ marginBottom: 16, opacity: 0.2, color: '#16a34a' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No violations found</div>
            <div style={{ fontSize: '0.82rem' }}>Your fleet has a clean record. Keep it up!</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ticket No.</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date & Location</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vehicle</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Violation</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Penalty</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t: any, i: number) => {
                const vehicle = vehicles.find((v: any) => v.id === t.vehicle_id);
                const isPaid = t.payment_status === 'PAID';
                return (
                  <tr key={t.id} style={{ borderBottom: i < filteredTickets.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{t.ticket_number}</code>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{t.incident_date ? formatDate(t.incident_date) : formatDate(t.created_at)}</div>
                      {t.location && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{t.location}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <code style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.85rem' }}>{t.plate_number || (vehicle ? vehicle.plate_number : '—')}</code>
                      {vehicle && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{vehicle.make} {vehicle.model}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>
                        {t.violation_type_id ? getViolationName(t.violation_type_id) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.9rem' }}>
                        ₱{(t.penalty_amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${getStatusBadgeClass(t.status)}`} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px' }}>
                        {formatStatus(t.status)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {isPaid ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={14} color="#16a34a" />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a' }}>PAID</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, color: '#dc2626',
                            background: '#fef2f2', border: '1px solid #fecaca',
                            padding: '3px 8px', borderRadius: 6
                          }}>UNPAID</span>
                          <button style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                            background: '#1d4ed8', color: 'white', border: 'none', cursor: 'pointer'
                          }}>
                            <CreditCard size={11} /> Pay
                          </button>
                        </div>
                      )}
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
