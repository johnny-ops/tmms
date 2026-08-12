import { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Download, Edit, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { getStatusBadgeClass, formatStatus, formatDate } from '@/lib/utils';

export function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
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
    license_number: '',
    license_expiry: '',
    contact_number: '',
    operator_id: '',
    status: 'ACTIVE'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [drRes, opRes] = await Promise.all([
      supabase.from('drivers').select('*').order('created_at', { ascending: false }),
      supabase.from('operators').select('id, full_name'),
    ]);
    setDrivers(drRes.data || []);
    setOperators(opRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenModal = (driver?: any) => {
    if (driver) {
      setEditingId(driver.id);
      setFormData({
        full_name: driver.full_name || '',
        license_number: driver.license_number || '',
        license_expiry: driver.license_expiry || '',
        contact_number: driver.contact_number || '',
        operator_id: driver.operator_id || '',
        status: driver.status || 'ACTIVE'
      });
    } else {
      setEditingId(null);
      setFormData({ full_name: '', license_number: '', license_expiry: '', contact_number: '', operator_id: '', status: 'ACTIVE' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.license_number.trim() || !formData.license_expiry) {
      alert('Full name, license number, and license expiry are required.');
      return;
    }
    setIsSubmitting(true);
    
    // license_expiry must be a valid DATE, not an empty string
    // operator_id must be a valid UUID or null (not empty string)
    const payload = {
      ...formData,
      license_expiry: formData.license_expiry || null,
      operator_id: formData.operator_id || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('drivers').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('drivers').insert([payload]);
        if (error) throw error;
      }
      await load();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Driver save failed:', err);
      alert(`Failed to save driver.\n\nReason: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      console.error('Driver delete failed:', err);
      alert(`Failed to delete driver.\n\nReason: ${err?.message || 'Unknown error'}`);
    }
  };


  const operatorMap = Object.fromEntries(operators.map(o => [o.id, o.full_name]));

  const isExpired = (dateStr: string) => dateStr && new Date(dateStr) < new Date();
  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 90;
  };

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase();
    return !q || d.full_name?.toLowerCase().includes(q) || d.license_number?.toLowerCase().includes(q) || d.contact_number?.toLowerCase().includes(q);
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={20} color="#3a65ae" /> Drivers Database
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage licensed PUV drivers, assignments, and license validity tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()}><Plus size={14} /> Add Driver</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Drivers', value: drivers.length, color: '#3a65ae' },
          { label: 'Active', value: drivers.filter(d => d.status === 'ACTIVE').length, color: '#22c55e' },
          { label: 'License Expired', value: drivers.filter(d => isExpired(d.license_expiry)).length, color: '#ef4444' },
          { label: 'Expiring Soon', value: drivers.filter(d => isExpiringSoon(d.license_expiry)).length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 9 }} />
            <input type="text" placeholder="Search drivers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License No.</th>
                <th>License Expiry</th>
                <th>Contact</th>
                <th>Operator</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No drivers found.</td></tr>
              ) : paginated.map(drv => (
                <tr key={drv.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                        {drv.full_name?.charAt(0) || '?'}
                      </div>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>{drv.full_name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.83rem', color: '#475569' }}>{drv.license_number}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isExpired(drv.license_expiry) && <AlertTriangle size={13} color="#ef4444" />}
                      {isExpiringSoon(drv.license_expiry) && !isExpired(drv.license_expiry) && <AlertTriangle size={13} color="#f59e0b" />}
                      <span style={{ color: isExpired(drv.license_expiry) ? '#ef4444' : isExpiringSoon(drv.license_expiry) ? '#f59e0b' : '#475569', fontSize: '0.83rem' }}>
                        {drv.license_expiry ? formatDate(drv.license_expiry) : '—'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.83rem', color: '#475569' }}>{drv.contact_number || '—'}</td>
                  <td style={{ fontSize: '0.83rem', color: '#475569' }}>{operatorMap[drv.operator_id] || '—'}</td>
                  <td><span className={getStatusBadgeClass(drv.status || 'ACTIVE')}>{formatStatus(drv.status || 'ACTIVE')}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleOpenModal(drv)} style={{ padding: '4px 8px', border: '1px solid #dbeafe', borderRadius: 5, background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#3a65ae' }}><Edit size={13} /> Edit</button>
                      <button onClick={() => handleDelete(drv.id)} style={{ padding: '4px 8px', border: '1px solid #fee2e2', borderRadius: 5, background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#ef4444' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Showing {Math.min((page-1)*limit+1,total)}–{Math.min(page*limit,total)} of {total} drivers</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid #e2e8f0', background: page===1?'#f8fafc':'white', cursor: page===1?'not-allowed':'pointer', fontSize: '0.8rem' }}>Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid #e2e8f0', background: page===totalPages?'#f8fafc':'white', cursor: page===totalPages?'not-allowed':'pointer', fontSize: '0.8rem' }}>Next</button>
          </div>
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Driver' : 'Add New Driver'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Full Name</label>
            <input required type="text" className="form-input" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">License Number</label>
              <input required type="text" className="form-input" value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} />
            </div>
            <div>
              <label className="form-label">License Expiry</label>
              <input required type="date" className="form-input" value={formData.license_expiry} onChange={e => setFormData({...formData, license_expiry: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Contact Number</label>
              <input type="text" className="form-input" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Operator (Employer)</label>
            <select className="form-input" value={formData.operator_id} onChange={e => setFormData({...formData, operator_id: e.target.value})}>
              <option value="">-- No Operator --</option>
              {operators.map(op => (
                <option key={op.id} value={op.id}>{op.full_name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Driver'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
