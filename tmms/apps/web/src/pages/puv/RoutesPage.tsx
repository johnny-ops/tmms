import { useState, useEffect } from 'react';
import { Route, Plus, Download, Search, ArrowRight, Pencil, Power, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';

export function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    route_code: '',
    name: '',
    origin: '',
    destination: '',
    distance_km: '',
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('routes').select('*').order('route_code');
      if (error) throw error;
      setRoutes(data || []);
    } catch (err: any) {
      console.error('Failed to load routes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenModal = (route?: any) => {
    if (route) {
      setEditingId(route.id);
      setFormData({
        route_code: route.route_code || '',
        name: route.name || '',
        origin: route.origin || '',
        destination: route.destination || '',
        distance_km: route.distance_km || '',
        is_active: route.is_active ?? true
      });
    } else {
      setEditingId(null);
      setFormData({ route_code: '', name: '', origin: '', destination: '', distance_km: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.route_code.trim() || !formData.name.trim() || !formData.origin.trim() || !formData.destination.trim()) {
      alert('Route code, name, origin, and destination are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { ...formData, distance_km: formData.distance_km ? parseFloat(String(formData.distance_km)) : null };
      if (editingId) {
        const { error } = await supabase.from('routes').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('routes').insert([payload]);
        if (error) throw error;
      }
      await load();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Route save failed:', err);
      const msg = err?.message || 'Unknown error';
      if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('23505')) {
        alert(`Failed to save route.\n\nReason: Route code "${formData.route_code}" already exists. Please use a different route code.`);
      } else {
        alert(`Failed to save route.\n\nReason: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;
    try {
      const { error } = await supabase.from('routes').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      console.error('Route delete failed:', err);
      alert(`Failed to delete route.\n\nReason: ${err?.message || 'Unknown error'}`);
    }
  };
  
  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('routes').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      alert(`Failed to update route status.\n\nReason: ${err?.message || 'Unknown error'}`);
    }
  };

  const filtered = routes.filter(r => {
    const q = search.toLowerCase();
    return !q || r.name?.toLowerCase().includes(q) || r.route_code?.toLowerCase().includes(q) || r.origin?.toLowerCase().includes(q) || r.destination?.toLowerCase().includes(q);
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
            <Route size={20} color="#3a65ae" /> Routes Management
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage authorized public transport routes within the LGU jurisdiction</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()}><Plus size={14} /> Add Route</button>
        </div>
      </div>

      {/* Summary Pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Routes', value: routes.length, color: '#3a65ae' },
          { label: 'Active', value: routes.filter(r => r.is_active).length, color: '#22c55e' },
          { label: 'Inactive', value: routes.filter(r => !r.is_active).length, color: '#94a3b8' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="text" className="form-input" style={{ paddingLeft: 32 }}
              placeholder="Search routes..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Route Name</th>
                <th>Origin → Destination</th>
                <th>Distance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading routes...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No routes found.</td></tr>
              ) : paginated.map(rt => (
                <tr key={rt.id}>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                      {rt.route_code}
                    </code>
                  </td>
                  <td style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{rt.name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem' }}>
                      <span style={{ color: '#22c55e', fontWeight: 500 }}>{rt.origin}</span>
                      <ArrowRight size={12} color="#94a3b8" />
                      <span style={{ color: '#ef4444', fontWeight: 500 }}>{rt.destination}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.83rem', color: '#64748b' }}>{rt.distance_km ? `${rt.distance_km} km` : '—'}</td>
                  <td>
                    {rt.is_active
                      ? <span className="badge badge-active">Active</span>
                      : <span className="badge badge-inactive">Inactive</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" title={rt.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleStatus(rt.id, rt.is_active)}>
                        <Power size={13} color={rt.is_active ? '#ef4444' : '#22c55e'} />
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(rt)}><Pencil size={13} /> Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rt.id)}><Trash2 size={13} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total} routes
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
            <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Route' : 'Add New Route'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <div>
              <label className="form-label">Route Code</label>
              <input required type="text" className="form-input" value={formData.route_code} onChange={e => setFormData({...formData, route_code: e.target.value})} placeholder="e.g. R-01" />
            </div>
            <div>
              <label className="form-label">Route Name</label>
              <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. City Hall to Market" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Origin</label>
              <input required type="text" className="form-input" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Destination</label>
              <input required type="text" className="form-input" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Distance (km)</label>
              <input type="number" step="0.1" className="form-input" value={formData.distance_km} onChange={e => setFormData({...formData, distance_km: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={formData.is_active ? 'true' : 'false'} onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Route'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
