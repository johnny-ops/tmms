import { useState, useEffect } from 'react';
import { ParkingSquare, Search, Plus, Download, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

export function ParkingAreasPage() {
  const [areas, setAreas] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', total_slots: 10 });

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        supabase.from('parking_areas').select('*'),
        supabase.from('parking_slots').select('*'),
      ]);
      if (aRes.error) throw aRes.error;
      setAreas(aRes.data || []);
      setSlots(sRes.data || []);
    } catch (err: any) {
      console.error('Failed to load parking areas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleOpenModal = (area?: any) => {
    if (area) {
      setEditingId(area.id);
      setFormData({ name: area.name || '', location: area.location || '', total_slots: area.total_slots || 10 });
    } else {
      setEditingId(null);
      setFormData({ name: '', location: '', total_slots: 10 });
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
    const payload = { ...formData, total_slots: Number(formData.total_slots) || 10 };
    try {
      if (editingId) {
        const { error } = await supabase.from('parking_areas').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('parking_areas').insert([payload]);
        if (error) throw error;
      }
      await load();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Parking area save failed:', err);
      alert(`Failed to save parking area.\n\nReason: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = areas.filter(a => {
    const q = search.toLowerCase();
    return !q || a.name?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q);
  });

  const getSlotsForArea = (areaId: string) => slots.filter(s => s.parking_area_id === areaId);

  const getSlotColor = (status: string) => {
    const m: Record<string, string> = {
      AVAILABLE: '#22c55e',
      OCCUPIED: '#ef4444',
      RESERVED: '#f59e0b',
      OUT_OF_SERVICE: '#94a3b8',
    };
    return m[status] || '#94a3b8';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ParkingSquare size={20} color="#3a65ae" /> Parking Areas
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Overview of all LGU-managed parking zones with live slot status</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()}><Plus size={14} /> Add Area</button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Parking Area' : 'Add Parking Area'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Area Name *</label>
            <input required type="text" className="form-input" placeholder="e.g. City Hall Parking"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Location *</label>
            <input required type="text" className="form-input" placeholder="e.g. J.P. Laurel Hwy, Lipa City"
              value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Total Slots *</label>
            <input required type="number" className="form-input" min={1}
              value={formData.total_slots} onChange={e => setFormData({ ...formData, total_slots: parseInt(e.target.value) || 10 })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Area'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Global stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Areas', value: areas.length, color: '#3a65ae' },
          { label: 'Total Slots', value: slots.length, color: '#1e293b' },
          { label: 'Available', value: slots.filter(s => s.slot_status === 'AVAILABLE').length, color: '#22c55e' },
          { label: 'Occupied', value: slots.filter(s => s.slot_status === 'OCCUPIED').length, color: '#ef4444' },
          { label: 'Reserved', value: slots.filter(s => s.slot_status === 'RESERVED').length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Available', color: '#22c55e' },
          { label: 'Occupied', color: '#ef4444' },
          { label: 'Reserved', color: '#f59e0b' },
          { label: 'Out of Service', color: '#94a3b8' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: '#64748b' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
        <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 9 }} />
        <input type="text" placeholder="Search parking areas..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8', padding: 40 }}>Loading parking areas...</div>
      ) : filtered.map(area => {
        const areaSlots = getSlotsForArea(area.id);
        const available = areaSlots.filter(s => s.slot_status === 'AVAILABLE').length;
        const occupied = areaSlots.filter(s => s.slot_status === 'OCCUPIED').length;

        return (
          <div key={area.id} className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: 2 }}>{area.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{area.location}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className={getStatusBadgeClass(area.status || 'ACTIVE')}>{formatStatus(area.status || 'ACTIVE')}</span>
                <button style={{ padding: '5px 10px', border: '1px solid #dbeafe', borderRadius: 5, background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#3a65ae' }}>
                  <Edit size={12} /> Edit
                </button>
              </div>
            </div>

            {/* Quick stats for area */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#dcfce7', borderRadius: 6, padding: '6px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>{available}</span>
                <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>Available</span>
              </div>
              <div style={{ background: '#fee2e2', borderRadius: 6, padding: '6px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '1rem' }}>{occupied}</span>
                <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>Occupied</span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '6px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#475569', fontSize: '1rem' }}>{areaSlots.length}</span>
                <span style={{ fontSize: '0.72rem', color: '#475569' }}>Total Slots</span>
              </div>
            </div>

            {/* Slot grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {areaSlots.map(slot => (
                <div key={slot.id} title={`${slot.slot_number}: ${slot.slot_status}`}
                  style={{ width: 40, height: 40, borderRadius: 6, background: getSlotColor(slot.slot_status), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6rem', fontWeight: 700, cursor: 'default', transition: 'transform 0.1s' }}>
                  {slot.slot_number?.replace('S-', '')}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
