import { useState } from 'react';
import { Search, AlertTriangle, CreditCard } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function OperatorViolationsPage() {
  const { data: tickets, loading } = useTable('traffic_tickets');
  const { data: vehicles } = useTable('vehicles');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTickets = tickets.filter(t => 
    t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.plate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
            Violation Records
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Track and manage traffic tickets issued to your vehicles.
          </p>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 10 }} />
            <input
              type="text"
              placeholder="Search by ticket or plate number..."
              className="input-field"
              style={{ paddingLeft: 36, width: '100%', maxWidth: 400 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Incident Details</th>
                <th>Vehicle Plate</th>
                <th>Penalty</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Loading violation records...</td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={32} color="#cbd5e1" />
                      <span>No violations found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map(t => {
                  const vehicle = vehicles.find(v => v.id === t.vehicle_id);
                  return (
                    <tr key={t.id}>
                      <td><code style={{ fontWeight: 700, color: '#0f172a' }}>{t.ticket_number}</code></td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(t.incident_date)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.location}</div>
                      </td>
                      <td>
                        <code style={{ color: '#475569', fontWeight: 600 }}>{t.plate_number}</code>
                        {vehicle && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{vehicle.make}</div>}
                      </td>
                      <td style={{ fontWeight: 600, color: '#dc2626' }}>
                        ₱{t.penalty_amount.toLocaleString()}
                      </td>
                      <td><span className={`badge ${getStatusBadgeClass(t.status)}`}>{formatStatus(t.status)}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.payment_status === 'PAID' ? (
                            <span className="badge badge-active">PAID</span>
                          ) : (
                            <>
                              <span className="badge badge-inactive">UNPAID</span>
                              <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CreditCard size={12} /> Pay
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
