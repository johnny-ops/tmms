import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Download, MapPin, X, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

export function TerminalsPage() {
  const [terminals, setTerminals] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: 50,
    status: 'ACTIVE',
    route_id: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        supabase.from('terminals').select('*').order('name'),
        supabase.from('routes').select('id, name, route_code'),
      ]);
      if (tRes.error) throw tRes.error;
      setTerminals(tRes.data || []);
      setRoutes(rRes.data || []);
    } catch (err: any) {
      console.error('Failed to load terminals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleOpenModal = (terminal?: any) => {
    if (terminal) {
      setEditingId(terminal.id);
      setFormData({
        name: terminal.name || '',
        location: terminal.location || '',
        capacity: terminal.capacity || 50,
        status: terminal.status || 'ACTIVE',
        route_id: terminal.route_id || '',
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', location: '', capacity: 50, status: 'ACTIVE', route_id: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) {
      alert('Name and location are required.');
      return;
    }
    setIsSubmitting(true);
    const payload = {
      ...formData,
      capacity: Number(formData.capacity) || 50,
      route_id: formData.route_id || null,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from('terminals').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('terminals').insert([payload]);
        if (error) throw error;
      }
      await load();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Terminal save failed:', err);
      alert(`Failed to save terminal.\n\nReason: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete terminal "${name}"?`)) return;
    try {
      const { error } = await supabase.from('terminals').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      console.error('Terminal delete failed:', err);
      alert(`Failed to delete terminal.\n\nReason: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleLogEntry = async (terminal: any) => {
    const newOcc = Math.min((terminal.current_occupancy || 0) + 1, terminal.capacity || 999);
    try {
      const { error } = await supabase.from('terminals').update({ current_occupancy: newOcc }).eq('id', terminal.id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      alert(`Failed to log entry: ${err.message}`);
    }
  };

  const handleLogExit = async (terminal: any) => {
    const newOcc = Math.max((terminal.current_occupancy || 0) - 1, 0);
    try {
      const { error } = await supabase.from('terminals').update({ current_occupancy: newOcc }).eq('id', terminal.id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      alert(`Failed to log exit: ${err.message}`);
    }
  };

  const filtered = terminals.filter(t => {
    const q = search.toLowerCase();
    return !q || t.name?.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q);
  });

  const getCapacityColor = (occ: number, cap: number) => {
    const ratio = occ / cap;
    if (ratio >= 0.9) return '#ef4444';
    if (ratio >= 0.7) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20} color="#3a65ae" /> Terminal Management
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage public transport terminals, capacity, and dispatch operations</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()}><Plus size={14} /> Add Terminal</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Terminals', value: terminals.length, color: '#3a65ae' },
          { label: 'Active', value: terminals.filter(t => t.status === 'ACTIVE').length, color: '#22c55e' },
          { label: 'Total Capacity', value: terminals.reduce((s, t) => s + (t.capacity || 0), 0), color: '#8b5cf6' },
          { label: 'Current Vehicles', value: terminals.reduce((s, t) => s + (t.current_occupancy || 0), 0), color: '#0891b2' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 9 }} />
          <input type="text" placeholder="Search terminals..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Terminal Cards */}
      {loading ? (
        <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading terminals...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center', background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          No terminals found. Click "Add Terminal" to create one.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(terminal => {
            const occ = terminal.current_occupancy || 0;
            const cap = terminal.capacity || 1;
            const pct = Math.round((occ / cap) * 100);
            const color = getCapacityColor(occ, cap);

            return (
              <div key={terminal.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', marginBottom: 4 }}>{terminal.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: '0.78rem' }}>
                      <MapPin size={12} /> {terminal.location}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={getStatusBadgeClass(terminal.status || 'ACTIVE')}>{formatStatus(terminal.status || 'ACTIVE')}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal(terminal)} title="Edit"><Pencil size={12} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(terminal.id, terminal.name)} title="Delete"><X size={12} /></button>
                  </div>
                </div>

                {/* Capacity bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Occupancy</span>
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color }}>{occ}/{cap} ({pct}%)</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{cap}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Capacity</div>
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{occ}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Current</div>
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>{cap - occ}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Available</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleLogEntry(terminal)}
                    disabled={occ >= cap}
                    style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 6, background: occ >= cap ? '#e2e8f0' : '#22c55e', cursor: occ >= cap ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.78rem', color: occ >= cap ? '#94a3b8' : 'white', fontWeight: 500 }}>
                    <Plus size={13} /> Log Entry
                  </button>
                  <button
                    onClick={() => handleLogExit(terminal)}
                    disabled={occ <= 0}
                    style={{ flex: 1, padding: '6px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: occ <= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.78rem', color: '#475569', fontWeight: 500, opacity: occ <= 0 ? 0.5 : 1 }}>
                    Log Exit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Terminal' : 'Add Terminal'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Terminal Name *</label>
            <input required type="text" className="form-input" placeholder="e.g. Main City Terminal"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Location *</label>
            <input required type="text" className="form-input" placeholder="e.g. Lipa City Hall Complex"
              value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Capacity</label>
              <input type="number" className="form-input" min={1}
                value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 50 })} />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Associated Route (Optional)</label>
            <select className="form-input" value={formData.route_id} onChange={e => setFormData({ ...formData, route_id: e.target.value })}>
              <option value="">— None —</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.route_code} — {r.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Terminal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
