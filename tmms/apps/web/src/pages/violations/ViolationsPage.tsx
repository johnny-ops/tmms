import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, Filter, Eye, Download, Edit, ChevronLeft, ChevronRight, CheckCircle, X, Trash2 } from 'lucide-react';
import { getStatusBadgeClass, formatStatus, formatDate, formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { EvidenceViewer } from '@/components/ui/EvidenceViewer';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'CONTESTED', label: 'Contested' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function CreateTicketModal({ onClose, onSuccess, initialData, violationTypes }: { onClose: () => void, onSuccess: () => void, initialData?: any, violationTypes: any[] }) {
  const [plate, setPlate] = useState(initialData?.plate_number || '');
  const [violation, setViolation] = useState('');
  const [location, setLocation] = useState(initialData?.location || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [loading, setLoading] = useState(false);

  const selectedViol = violationTypes.find(v => v.id === violation);

  // If initialData provides a rule name, try to map it to a violation_type_id
  useEffect(() => {
    if (initialData?.rule_triggered) {
      const match = violationTypes.find(v => 
        v.name.toLowerCase().includes(initialData.rule_triggered.toLowerCase()) ||
        initialData.rule_triggered.toLowerCase().includes(v.name.toLowerCase())
      );
      if (match) setViolation(match.id);
    }
  }, [initialData, violationTypes]);

  async function handleSave() {
    if (!plate || !violation || !location || !date || !time) {
      alert('Please fill all required fields');
      return;
    }
    setLoading(true);

    try {
      const ticketNumber = `TKT-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      
      const { error } = await supabase.from('traffic_tickets').insert({
        ticket_number: ticketNumber,
        plate_number: plate,
        violation_type_id: violation,
        location: location,
        incident_date: date,
        incident_time: time,
        penalty_amount: selectedViol?.penalty_amount || 0,
        status: 'ISSUED',
        payment_status: 'UNPAID',
        notes: notes,
        evidence_url: initialData?.evidence_image_url || initialData?.evidence_frame || null
      });

      if (error) throw error;
      
      // If this came from AI Monitor, update the candidate status
      if (initialData?.id) {
        await supabase.from('ai_violation_candidates').update({ verification_status: 'VERIFIED' }).eq('id', initialData.id);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error saving ticket: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: 'white', borderRadius: 12, width: '100%', maxWidth: 560,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'auto'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Issue Traffic Ticket</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Create a new traffic violation ticket</p>
        </div>
        <div style={{ padding: '20px 24px' }}>
          
          {(initialData?.evidence_image_url || initialData?.evidence_frame) && (
            <div style={{ marginBottom: 16 }}>
               <label className="form-label">AI Evidence</label>
               <img src={initialData.evidence_image_url || initialData.evidence_frame} alt="Evidence" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Plate Number <span style={{ color: '#dc2626' }}>*</span></label>
              <input className="form-input" style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
                placeholder="ABC1234" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Violation Type <span style={{ color: '#dc2626' }}>*</span></label>
              <select className="form-input" value={violation} onChange={e => setViolation(e.target.value)}>
                <option value="">Select violation...</option>
                {violationTypes.map(v => (
                  <option key={v.id} value={v.id}>{v.code} — {v.name}</option>
                ))}
              </select>
              {selectedViol && (
                <div style={{ marginTop: 6, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '6px 10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#9a3412' }}>
                    Penalty: <strong>{formatCurrency(selectedViol.penalty_amount)}</strong>
                  </span>
                </div>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Location <span style={{ color: '#dc2626' }}>*</span></label>
              <input className="form-input" placeholder="Street, Barangay, Lipa City" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Time <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="time" className="form-input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes / Remarks</label>
              <textarea className="form-input" rows={3} placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'white' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            <AlertTriangle size={14} /> {loading ? 'Saving...' : 'Issue Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ViolationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<any>(null);
  const limit = 10;

  const [tickets, setTickets] = useState<any[]>([]);
  const [violationTypes, setViolationTypes] = useState<any[]>([]);

  const load = async () => {
    const [tRes, vRes] = await Promise.all([
      supabase.from('traffic_tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('violation_types').select('*'),
    ]);
    setTickets(tRes.data || []);
    setViolationTypes(vRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      const { error } = await supabase.from('traffic_tickets').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      console.error('Ticket delete failed:', err);
      alert(`Failed to delete ticket.\n\nReason: ${err?.message || 'Unknown error'}`);
    }
  };

  const violTypeMap = Object.fromEntries(violationTypes.map(v => [v.id, v]));

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.ticket_number.toLowerCase().includes(q) ||
      t.plate_number.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return (
    <div>
      {viewingTicket && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Ticket Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewingTicket(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 4px 0' }}>Ticket Number</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>{viewingTicket.ticket_number || 'N/A'}</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 4px 0' }}>Notes</p>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>{viewingTicket.notes || 'No notes provided.'}</p>
              </div>
              
              {viewingTicket.evidence_url && (
                <div style={{ marginTop: 24 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Attached Evidence</p>
                  <EvidenceViewer url={viewingTicket.evidence_url} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showCreate && <CreateTicketModal violationTypes={violationTypes} onClose={() => setShowCreate(false)} onSuccess={() => {
        setShowCreate(false);
        load();
      }} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="#ef4444" /> Traffic Violations & Tickets
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Issue, track, and manage traffic violation tickets
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Issue Ticket
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Tickets', value: tickets.length, color: '#3a65ae' },
          { label: 'Unpaid', value: tickets.filter(t => t.payment_status === 'UNPAID').length, color: '#ef4444' },
          { label: 'Settled', value: tickets.filter(t => t.payment_status === 'PAID').length, color: '#22c55e' },
          { label: 'Contested', value: tickets.filter(t => t.status === 'CONTESTED').length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-input" style={{ paddingLeft: 32 }}
            placeholder="Search ticket no., plate, location..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-input" style={{ flex: '0 0 180px' }}
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Plate</th>
                <th>Violation</th>
                <th>Location</th>
                <th>Date/Time</th>
                <th>Penalty</th>
                <th>Status</th>
                <th>Payment</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No ticket records found</td></tr>
              ) : paginated.map(t => {
                const vtype = violTypeMap[t.violation_type_id];
                return (
                  <tr key={t.id}>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                        {t.ticket_number}
                      </code>
                    </td>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: '#3a65ae' }}>
                        {t.plate_number}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.82rem', color: '#1e293b' }}>{vtype?.name ?? '—'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{vtype?.code}</div>
                    </td>
                    <td style={{ color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.location}
                    </td>
                    <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                      <div>{formatDate(t.incident_date)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t.incident_time}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{formatCurrency(t.penalty_amount)}</td>
                    <td><span className={`badge ${getStatusBadgeClass(t.status)}`}>{formatStatus(t.status)}</span></td>
                    <td><span className={`badge ${getStatusBadgeClass(t.payment_status)}`}>{formatStatus(t.payment_status)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" title="View" onClick={() => setViewingTicket(t)}><Eye size={13} /></button>
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => alert('Edit form not implemented')}><Edit size={13} /></button>
                        <button className="btn btn-ghost btn-sm" title="Delete" style={{ color: '#ef4444' }} onClick={() => handleDelete(t.id)}>
                          <Trash2 size={13} />
                        </button>
                        {t.payment_status === 'UNPAID' && (
                          <button className="btn btn-primary btn-sm" onClick={async () => {
                            if (!window.confirm(`Mark ticket ${t.ticket_number} as settled/paid?`)) return;
                            try {
                              const { error } = await supabase.from('traffic_tickets').update({
                                payment_status: 'PAID',
                                status: 'SETTLED',
                                updated_at: new Date().toISOString(),
                              }).eq('id', t.id);
                              if (error) throw error;
                              await load();
                            } catch (err: any) {
                              console.error('Settle failed:', err);
                              alert(`Failed to settle ticket: ${err.message}`);
                            }
                          }}>Settle</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{total} ticket records</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
