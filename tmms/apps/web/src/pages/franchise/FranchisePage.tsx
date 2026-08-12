import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Plus, Search, Download, Eye, Edit, CheckCircle, XCircle, ChevronLeft, ChevronRight, Clock, FileText, Trash2 } from 'lucide-react';
import { getStatusBadgeClass, formatStatus, formatDate, daysUntilExpiry } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { DocumentUpload } from '@/components/ui/DocumentUpload';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'EXPIRING', label: 'Expiring' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'RENEWAL_PENDING', label: 'Renewal Pending' },
];

function ApprovalModal({ franchise, operators, routes, onClose, onApprove, onReject }: {
  franchise: any;
  operators: any[];
  routes: any[];
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [notes, setNotes] = useState('');
  const operatorMap = Object.fromEntries(operators.map(o => [o.id, o.full_name]));
  const routeMap = Object.fromEntries(routes.map(r => [r.id, r.name]));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: 'white', borderRadius: 12, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Franchise Review</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>#{franchise.franchise_number}</p>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Operator', value: operatorMap[franchise.operator_id] ?? '—' },
              { label: 'Route', value: franchise.route_id ? routeMap[franchise.route_id] ?? '—' : '—' },
              { label: 'Applied', value: formatDate(franchise.application_date) },
              { label: 'Capacity', value: franchise.authorized_capacity ? `${franchise.authorized_capacity} pax` : '—' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, marginBottom: 2 }}>{item.label}</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Review Notes</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Add notes for the applicant..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onReject} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <XCircle size={14} /> Reject
          </button>
          <button className="btn btn-primary btn-sm" onClick={onApprove} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

export function FranchisePage() {
  const [franchises, setFranchises] = useState<any[]>([]);
  const [operatorsList, setOperatorsList] = useState<any[]>([]);
  const [routesList, setRoutesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Modals
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    franchise_number: '',
    operator_id: '',
    route_id: '',
    status: 'PENDING',
    application_date: new Date().toISOString().split('T')[0],
    validity_start: '',
    validity_end: '',
    authorized_capacity: 12
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [fRes, oRes, rRes] = await Promise.all([
      supabase.from('franchises').select('*').order('created_at', { ascending: false }),
      supabase.from('operators').select('id, full_name'),
      supabase.from('routes').select('id, name')
    ]);
    setFranchises(fRes.data || []);
    setOperatorsList(oRes.data || []);
    setRoutesList(rRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenModal = (franchise?: any) => {
    if (franchise) {
      setEditingId(franchise.id);
      setFormData({
        franchise_number: franchise.franchise_number || '',
        operator_id: franchise.operator_id || '',
        route_id: franchise.route_id || '',
        status: franchise.status || 'PENDING',
        application_date: franchise.application_date || new Date().toISOString().split('T')[0],
        validity_start: franchise.validity_start || '',
        validity_end: franchise.validity_end || '',
        authorized_capacity: franchise.authorized_capacity || 12
      });
    } else {
      setEditingId(null);
      setFormData({
        franchise_number: '', operator_id: '', route_id: '',
        status: 'PENDING', application_date: new Date().toISOString().split('T')[0],
        validity_start: '', validity_end: '', authorized_capacity: 12
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.franchise_number.trim() || !formData.operator_id) {
      alert('Franchise number and operator are required.');
      return;
    }
    setIsSubmitting(true);
    
    const payload = { 
      ...formData, 
      operator_id: formData.operator_id || null,
      route_id: formData.route_id || null,
      validity_start: formData.validity_start || null,
      validity_end: formData.validity_end || null,
      application_date: formData.application_date || null,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from('franchises').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('franchises').insert([payload]);
        if (error) throw error;
      }
      await load();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Franchise save failed:', err);
      const msg = err?.message || 'Unknown error';
      if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('23505')) {
        alert(`Failed to save franchise.\n\nReason: Franchise number "${formData.franchise_number}" already exists.`);
      } else {
        alert(`Failed to save franchise.\n\nReason: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this franchise?')) return;
    try {
      const { error } = await supabase.from('franchises').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      console.error('Franchise delete failed:', err);
      alert(`Failed to delete franchise.\n\nReason: ${err?.message || 'Unknown error'}`);
    }
  };
  
  const handleReviewAction = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('franchises').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      await load();
      setReviewingId(null);
    } catch (err: any) {
      console.error('Review action failed:', err);
      alert(`Failed to update franchise status.\n\nReason: ${err?.message || 'Unknown error'}`);
    }
  };


  const operatorMap = Object.fromEntries(operatorsList.map(o => [o.id, o.full_name]));
  const routeMap = Object.fromEntries(routesList.map(r => [r.id, r.name]));

  const filtered = franchises.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.franchise_number.toLowerCase().includes(q) ||
      (operatorMap[f.operator_id] ?? '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const reviewing = reviewingId ? franchises.find(f => f.id === reviewingId) : null;

  return (
    <div>
      {reviewing && (
        <ApprovalModal
          franchise={reviewing}
          operators={operatorsList}
          routes={routesList}
          onClose={() => setReviewingId(null)}
          onApprove={() => handleReviewAction(reviewing.id, 'ACTIVE')}
          onReject={() => handleReviewAction(reviewing.id, 'REJECTED')}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={20} color="#3a65ae" /> Franchise Management
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Manage PUV franchise applications, approvals, and renewals
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()}><Plus size={14} /> New Application</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: franchises.length, color: '#3a65ae' },
          { label: 'Active', value: franchises.filter(f => f.status === 'ACTIVE').length, color: '#22c55e' },
          { label: 'Pending', value: franchises.filter(f => f.status === 'PENDING' || f.status === 'UNDER_REVIEW').length, color: '#3b82f6' },
          { label: 'Expiring', value: franchises.filter(f => f.status === 'EXPIRING').length, color: '#f59e0b' },
          { label: 'Expired', value: franchises.filter(f => f.status === 'EXPIRED').length, color: '#ef4444' },
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
            placeholder="Search franchise number, operator..."
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
                <th>Franchise No.</th>
                <th>Operator</th>
                <th>Route</th>
                <th>Applied</th>
                <th>Valid Until</th>
                <th>Expires In</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No franchise records found</td></tr>
              ) : paginated.map(f => {
                const days = daysUntilExpiry(f.validity_end);
                return (
                  <tr key={f.id}>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                        {f.franchise_number}
                      </code>
                    </td>
                    <td style={{ fontWeight: 500 }}>{operatorMap[f.operator_id] ?? '—'}</td>
                    <td style={{ color: '#64748b' }}>{f.route_id ? routeMap[f.route_id] ?? '—' : '—'}</td>
                    <td style={{ color: '#64748b' }}>{formatDate(f.application_date)}</td>
                    <td style={{ color: '#64748b' }}>{f.validity_end ? formatDate(f.validity_end) : '—'}</td>
                    <td>
                      {f.validity_end ? (
                        <span style={{
                          fontSize: '0.78rem', fontWeight: 600,
                          color: days < 0 ? '#dc2626' : days <= 30 ? '#d97706' : '#22c55e',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <Clock size={11} />
                          {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d`}
                        </span>
                      ) : '—'}
                    </td>
                    <td><span className={`badge ${getStatusBadgeClass(f.status)}`}>{formatStatus(f.status)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" title="View"><Eye size={13} /></button>
                        {(f.status === 'PENDING' || f.status === 'UNDER_REVIEW') && (
                          <button className="btn btn-primary btn-sm" onClick={() => setReviewingId(f.id)}>
                            Review
                          </button>
                        )}
                        {(f.status === 'ACTIVE' || f.status === 'EXPIRING') && (
                          <button className="btn btn-secondary btn-sm" onClick={() => toast.info('Renewal form not implemented yet.')}>
                            Renew
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => handleOpenModal(f)}><Edit size={13} /></button>
                        <button className="btn btn-ghost btn-sm" title="Delete" style={{ color: '#ef4444' }} onClick={() => handleDelete(f.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {total} franchise records
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Franchise' : 'New Franchise Application'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Franchise Number</label>
              <input required type="text" className="form-input" value={formData.franchise_number} onChange={e => setFormData({...formData, franchise_number: e.target.value})} placeholder="e.g. F-2026-001" />
            </div>
            <div>
              <label className="form-label">Application Date</label>
              <input required type="date" className="form-input" value={formData.application_date} onChange={e => setFormData({...formData, application_date: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Operator</label>
              <select required className="form-input" value={formData.operator_id} onChange={e => setFormData({...formData, operator_id: e.target.value})}>
                <option value="">-- Select Operator --</option>
                {operatorsList.map(op => <option key={op.id} value={op.id}>{op.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Route</label>
              <select className="form-input" value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})}>
                <option value="">-- Select Route --</option>
                {routesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                {STATUS_OPTIONS.filter(o => o.value !== '').map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Capacity (pax)</label>
              <input type="number" className="form-input" value={formData.authorized_capacity} onChange={e => setFormData({...formData, authorized_capacity: parseInt(e.target.value) || 12})} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Validity Start</label>
              <input type="date" className="form-input" value={formData.validity_start} onChange={e => setFormData({...formData, validity_start: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Validity End</label>
              <input type="date" className="form-input" value={formData.validity_end} onChange={e => setFormData({...formData, validity_end: e.target.value})} />
            </div>
          </div>
          <DocumentUpload 
            bucket="puv-documents"
            folderPath="franchises"
            onUploadSuccess={(url) => console.log('Uploaded:', url)}
            label="Upload Franchise Documents (PDF)"
            accept=".pdf"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Franchise'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
