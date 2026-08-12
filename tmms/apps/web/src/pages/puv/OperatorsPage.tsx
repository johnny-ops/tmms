import { useState, useEffect } from 'react';
import { Users, Plus, Download, Search, Phone, MapPin, Building2, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { getStatusBadgeClass, formatStatus, formatDate } from '@/lib/utils';

export function OperatorsPage() {
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    contact_number: '',
    address: '',
    organization: '',
    status: 'ACTIVE'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('operators').select('*').order('created_at', { ascending: false });
    setOperators(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenModal = (operator?: any) => {
    if (operator) {
      setEditingId(operator.id);
      setFormData({
        full_name: operator.full_name || '',
        contact_number: operator.contact_number || '',
        address: operator.address || '',
        organization: operator.organization || '',
        status: operator.status || 'ACTIVE'
      });
    } else {
      setEditingId(null);
      setFormData({ full_name: '', contact_number: '', address: '', organization: '', status: 'ACTIVE' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      alert('Full name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('operators').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('operators').insert([formData]);
        if (error) throw error;
      }
      await load();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Operator save failed:', err);
      const msg = err?.message || 'Unknown error';
      alert(`Failed to save operator.\n\nReason: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this operator?')) return;
    try {
      const { error } = await supabase.from('operators').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      console.error('Operator delete failed:', err);
      alert(`Failed to delete operator.\n\nReason: ${err?.message || 'Unknown error'}`);
    }
  };


  const filtered = operators.filter(o => {
    const q = search.toLowerCase();
    return !q || o.full_name?.toLowerCase().includes(q) || o.contact_number?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q) || o.organization?.toLowerCase().includes(q);
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={20} color="#3a65ae" /> Operators Management
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage PUV operators, cooperatives, and associations registered with the LGU</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()}><Plus size={14} /> Add Operator</button>
        </div>
      </div>

      {/* Summary Pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Operators', value: operators.length, color: '#3a65ae' },
          { label: 'Active', value: operators.filter(o => o.status === 'ACTIVE').length, color: '#22c55e' },
          { label: 'Inactive', value: operators.filter(o => o.status === 'INACTIVE').length, color: '#94a3b8' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Search bar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search by name, contact, org..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Organization</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Status</th>
                <th>Registered</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading operators...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No operators found.</td></tr>
              ) : paginated.map(op => (
                <tr key={op.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a65ae', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                        {op.full_name?.charAt(0) || '?'}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{op.full_name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={13} color="#94a3b8" />
                      <span style={{ color: '#475569', fontSize: '0.83rem' }}>{op.organization || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} color="#94a3b8" />
                      <span style={{ fontSize: '0.83rem' }}>{op.contact_number || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 200 }}>
                      <MapPin size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.address || '—'}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${getStatusBadgeClass(op.status || 'ACTIVE')}`}>{formatStatus(op.status || 'ACTIVE')}</span></td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{formatDate(op.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(op)}><Pencil size={13} /> Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(op.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total} operators
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
            <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Operator' : 'Add New Operator'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Full Name</label>
            <input required type="text" className="form-input" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Contact Number</label>
              <input type="text" className="form-input" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Organization</label>
              <input type="text" className="form-input" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="form-label">Address</label>
            <input type="text" className="form-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Operator'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
