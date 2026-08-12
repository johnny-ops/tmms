import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Plus, Search, Filter, Download, Eye, Edit, Archive, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DocumentUpload } from '@/components/ui/DocumentUpload';
import { getStatusBadgeClass, formatStatus, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Vehicle, VehicleStatus } from '@/types';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'FOR_INSPECTION', label: 'For Inspection' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
];

export function PUVPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plate_number: '',
    body_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    capacity: 12,
    operator_id: '',
    status: 'ACTIVE',
    registration_expiry: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [vRes, oRes] = await Promise.all([
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
      supabase.from('operators').select('*')
    ]);
    setVehicles(vRes.data || []);
    setOperators(oRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (vehicle?: any) => {
    if (vehicle) {
      setEditingId(vehicle.id);
      setFormData({
        plate_number: vehicle.plate_number || '',
        body_number: vehicle.body_number || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || new Date().getFullYear(),
        capacity: vehicle.capacity || 12,
        operator_id: vehicle.operator_id || '',
        status: vehicle.status || 'ACTIVE',
        registration_expiry: vehicle.registration_expiry || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        plate_number: '', body_number: '', make: '', model: '',
        year: new Date().getFullYear(), capacity: 12, operator_id: '',
        status: 'ACTIVE', registration_expiry: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate_number.trim() || !formData.make.trim() || !formData.model.trim() || !formData.registration_expiry) {
      alert('Plate number, make, model, and registration expiry are required.');
      return;
    }
    setIsSubmitting(true);
    
    const payload = {
      ...formData,
      plate_number: formData.plate_number.toUpperCase().trim(),
      year: formData.year || null,
      capacity: Number(formData.capacity) || 1,
      operator_id: formData.operator_id || null,
      // registration_expiry must be a valid DATE string (YYYY-MM-DD)
      registration_expiry: formData.registration_expiry || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicles').insert([payload]);
        if (error) throw error;
      }
      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Vehicle save failed:', err);
      const msg = err?.message || 'Unknown error';
      if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('23505')) {
        alert(`Failed to save vehicle.\n\nReason: Plate number "${formData.plate_number}" already exists in the database.`);
      } else {
        alert(`Failed to save vehicle.\n\nReason: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Vehicle delete failed:', err);
      alert(`Failed to delete vehicle.\n\nReason: ${err?.message || 'Unknown error'}`);
    }
  };


  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.plate_number.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) ||
      (v.body_number ?? '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const operatorMap = Object.fromEntries(operators.map(o => [o.id, o.full_name]));

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Car size={20} color="#3a65ae" /> PUV Database
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Manage Public Utility Vehicle records, operators, and assignments
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm">
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()}>
            <Plus size={14} /> Add PUV
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: vehicles.length, color: '#3a65ae' },
          { label: 'Active', value: vehicles.filter(v => v.status === 'ACTIVE').length, color: '#22c55e' },
          { label: 'For Inspection', value: vehicles.filter(v => v.status === 'FOR_INSPECTION').length, color: '#f59e0b' },
          { label: 'Suspended', value: vehicles.filter(v => v.status === 'SUSPENDED').length, color: '#ef4444' },
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
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search plate, body number, make, model..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="form-input"
          style={{ flex: '0 0 160px' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm">
          <Filter size={13} /> More Filters
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Plate No.</th>
                <th>Body No.</th>
                <th>Type / Make</th>
                <th>Year</th>
                <th>Capacity</th>
                <th>Operator</th>
                <th>Reg. Expiry</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <Car size={32} color="#e2e8f0" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                    No PUV records found
                  </td>
                </tr>
              ) : paginated.map(v => (
                <tr key={v.id}>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      {v.plate_number}
                    </code>
                  </td>
                  <td style={{ color: '#64748b' }}>{v.body_number ?? '—'}</td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{v.make} {v.model}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{v.fuel_type}</div>
                  </td>
                  <td>{v.year}</td>
                  <td>{v.capacity} pax</td>
                  <td style={{ color: '#64748b' }}>{v.operator_id ? operatorMap[v.operator_id] ?? '—' : '—'}</td>
                  <td style={{ color: '#64748b' }}>{formatDate(v.registration_expiry)}</td>
                  <td><span className={`badge ${getStatusBadgeClass(v.status)}`}>{formatStatus(v.status)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => handleOpenModal(v)}>
                        <Edit size={13} /> Edit
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Delete" style={{ color: '#ef4444' }} onClick={() => handleDelete(v.id)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total} records
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Vehicle' : 'Add New Vehicle'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Plate Number</label>
              <input required type="text" className="form-input" value={formData.plate_number} onChange={e => setFormData({...formData, plate_number: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Body Number (Optional)</label>
              <input type="text" className="form-input" value={formData.body_number} onChange={e => setFormData({...formData, body_number: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Make</label>
              <input required type="text" className="form-input" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} placeholder="e.g. Toyota" />
            </div>
            <div>
              <label className="form-label">Model</label>
              <input required type="text" className="form-input" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="e.g. Hiace" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Year</label>
              <input required type="number" className="form-input" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value) || new Date().getFullYear()})} />
            </div>
            <div>
              <label className="form-label">Capacity (pax)</label>
              <input required type="number" className="form-input" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 12})} />
            </div>
            <div>
              <label className="form-label">Reg. Expiry</label>
              <input required type="date" className="form-input" value={formData.registration_expiry} onChange={e => setFormData({...formData, registration_expiry: e.target.value})} />
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
              <label className="form-label">Operator</label>
              <select className="form-input" value={formData.operator_id} onChange={e => setFormData({...formData, operator_id: e.target.value})}>
                <option value="">-- No Operator --</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: 8 }}>
             <DocumentUpload 
               bucket="puv-documents"
               folderPath="vehicles"
               onUploadSuccess={(url) => console.log('Uploaded:', url)}
               label="Upload Registration Document (Optional)"
             />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
