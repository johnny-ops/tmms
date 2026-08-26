import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert, Calendar, MapPin, Hash, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { TrafficTicket } from '@/types';

export function DriverViolationsPage() {
  const { user } = useAuth();
  
  // We should ideally fetch violations linked to the specific driver or their vehicle
  // We can filter by driver_id directly. If none provided, this might return all depending on RLS.
  // We'll use the driver_id if available, otherwise fallback (for demo).
  const filter = user?.driver_id ? { column: 'driver_id', value: user.driver_id } : undefined;
  
  const { data: tickets, loading } = useTable<any>('traffic_tickets', [], {
    filter,
    orderBy: 'created_at',
    ascending: false
  });

  const { data: vehicles } = useTable<any>('vehicles');

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading violations data...</div>;
  }

  const activeViolations = tickets.filter(t => ['ISSUED', 'CONTESTED', 'UNDER_REVIEW', 'UNPAID'].includes(t.status));
  const totalFines = activeViolations.reduce((acc, curr) => acc + (Number(curr.penalty_amount) || 0), 0);

  return (
    <div className="max-w-5xl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
          Traffic Violations
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          View and manage your traffic tickets and penalties.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={24} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600, marginBottom: 4 }}>PENDING VIOLATIONS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400e', lineHeight: 1 }}>{activeViolations.length}</div>
          </div>
        </div>
        
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>
            ₱
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600, marginBottom: 4 }}>TOTAL UNPAID FINES</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b', lineHeight: 1 }}>₱{totalFines.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>Violation History</h3>
        </div>
        
        {tickets.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Clean Record!</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              You have no recorded traffic violations. Keep up the good work!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tickets.map((ticket: TrafficTicket) => {
              const vehicle = vehicles.find(v => v.id === ticket.vehicle_id);
              const isPending = ['ISSUED', 'CONTESTED', 'UNDER_REVIEW', 'UNPAID'].includes(ticket.status);
              
              return (
                <div key={ticket.id} style={{ 
                  padding: 20, 
                  borderBottom: '1px solid #f1f5f9',
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                  background: isPending ? '#fff' : '#f8fafc'
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Hash size={14} color="#64748b" />
                      {ticket.ticket_number || ticket.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={12} color="#64748b" />
                      {formatDate(ticket.incident_date || ticket.created_at)}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                      {ticket.violation_type_id} {/* Ideally would join with violation_types */}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={12} color="#64748b" />
                      {ticket.location}
                    </div>
                    {vehicle && (
                      <div style={{ fontSize: '0.75rem', color: '#3a65ae', fontWeight: 500, marginTop: 4, display: 'inline-block', background: '#3a65ae15', padding: '2px 6px', borderRadius: 4 }}>
                        Vehicle: {vehicle.plate_number}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: 4 }}>PENALTY</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isPending ? '#dc2626' : '#0f172a' }}>
                      ₱{Number(ticket.penalty_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                      {formatStatus(ticket.status)}
                    </span>
                    {isPending && (
                      <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
