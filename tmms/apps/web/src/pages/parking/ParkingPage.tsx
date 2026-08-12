import { useState } from 'react';
import { toast } from 'sonner';
import { ParkingSquare, Grid, List, Plus } from 'lucide-react';
import { useTable, useRealtime } from '@/hooks/useSupabase';
import { supabase } from '@/lib/supabase';
import type { ParkingSlotStatus } from '@/types';


const STATUS_CONFIG: Record<ParkingSlotStatus, { label: string; bg: string; border: string; text: string }> = {
  AVAILABLE: { label: 'Available', bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
  OCCUPIED: { label: 'Occupied', bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  RESERVED: { label: 'Reserved', bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
  OUT_OF_SERVICE: { label: 'Out of Service', bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8' },
};

function SlotCell({ slot, onClick }: { slot: any; onClick: () => void }) {
  const cfg = STATUS_CONFIG[(slot.slot_status as keyof typeof STATUS_CONFIG)] || STATUS_CONFIG.AVAILABLE;
  return (
    <div
      onClick={onClick}
      style={{
        background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 8,
        padding: '10px 8px', textAlign: 'center', cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s'
      }}
      title={`Slot ${slot.slot_number} — ${cfg.label}`}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <ParkingSquare size={16} color={cfg.text} style={{ margin: '0 auto 4px' }} />
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.text }}>{slot.slot_number}</div>
      <div style={{ fontSize: '0.6rem', color: cfg.text, opacity: 0.8 }}>{cfg.label}</div>
    </div>
  );
}

export function ParkingPage() {
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: areas, refetch: refetchAreas } = useTable('parking_areas');
  const { data: slots, refetch: refetchSlots } = useTable('parking_slots');

  // Realtime: update slot grid instantly when a slot status changes
  useRealtime(
    'parking_slots',
    undefined,
    (updatedSlot: any) => {
      refetchSlots();
    }
  );

  const activeArea = selectedArea || (areas[0]?.id ?? '');
  const area = areas.find(a => a.id === activeArea) ?? areas[0];
  const areaSlots = slots.filter(s => s.parking_area_id === activeArea);

  const counts = {
    available: areaSlots.filter(s => s.slot_status === 'AVAILABLE').length,
    occupied: areaSlots.filter(s => s.slot_status === 'OCCUPIED').length,
    reserved: areaSlots.filter(s => s.slot_status === 'RESERVED').length,
    outOfService: areaSlots.filter(s => s.slot_status === 'OUT_OF_SERVICE').length,
  };
  const utilPct = areaSlots.length > 0 ? Math.round((counts.occupied / areaSlots.length) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ParkingSquare size={20} color="#3a65ae" /> Parking Management
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage parking areas, slot availability, and sessions</p>
        </div>
      </div>

      {/* Area Selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {areas.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedArea(a.id)}
            style={{
              padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              background: activeArea === a.id ? '#2d5193' : 'white',
              color: activeArea === a.id ? 'white' : '#374151',
              border: activeArea === a.id ? '2px solid #2d5193' : '2px solid #e2e8f0',
              transition: 'all 0.15s',
            }}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Slots', value: areaSlots.length, color: '#3a65ae' },
          { label: 'Available', value: counts.available, color: '#22c55e' },
          { label: 'Occupied', value: counts.occupied, color: '#ef4444' },
          { label: 'Reserved', value: counts.reserved, color: '#f59e0b' },
          { label: 'Out of Service', value: counts.outOfService, color: '#94a3b8' },
          { label: 'Utilization', value: `${utilPct}%`, color: utilPct > 80 ? '#ef4444' : utilPct > 60 ? '#f59e0b' : '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
        {/* Slot Grid */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{area?.name ?? 'Loading...'}</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{area?.location ?? ''}</p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setViewMode('grid')} className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}><Grid size={13} /></button>
              <button onClick={() => setViewMode('list')} className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}><List size={13} /></button>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: cfg.bg, border: `2px solid ${cfg.border}` }} />
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{cfg.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
            {areaSlots.map(slot => (
              <SlotCell key={slot.id} slot={slot} onClick={() => setSelectedSlot(slot)} />
            ))}
          </div>
        </div>

        {/* Slot Detail Panel */}
        {selectedSlot && (
          <div style={{
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20,
            width: 260, flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Slot Details</h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSlot(null)} style={{ padding: 4 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { label: 'Slot Number', value: selectedSlot.slot_number },
                { label: 'Status', value: STATUS_CONFIG[(selectedSlot.slot_status as keyof typeof STATUS_CONFIG)]?.label || 'Unknown' },
                { label: 'Current Vehicle', value: selectedSlot.slot_status === 'OCCUPIED' ? 'ABC1234' : '—' },
                { label: 'Entry Time', value: selectedSlot.slot_status === 'OCCUPIED' ? '09:30 AM' : '—' },
                { label: 'Duration', value: selectedSlot.slot_status === 'OCCUPIED' ? '2h 15m' : '—' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 6 }}>
              {selectedSlot.slot_status === 'AVAILABLE' && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={async () => {
                    try {
                      const { error } = await supabase.from('parking_slots').update({ slot_status: 'OCCUPIED' }).eq('id', selectedSlot.id);
                      if (error) throw error;
                      toast.success('Vehicle entry logged.');
                      setSelectedSlot({ ...selectedSlot, slot_status: 'OCCUPIED' });
                    } catch (e) {
                      toast.error('Failed to log entry.');
                    }
                  }}>
                  Log Entry
                </button>
              )}
              {selectedSlot.slot_status === 'OCCUPIED' && (
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={async () => {
                    try {
                      const { error } = await supabase.from('parking_slots').update({ slot_status: 'AVAILABLE' }).eq('id', selectedSlot.id);
                      if (error) throw error;
                      toast.success('Vehicle exit logged.');
                      setSelectedSlot({ ...selectedSlot, slot_status: 'AVAILABLE' });
                    } catch (e) {
                      toast.error('Failed to log exit.');
                    }
                  }}>
                  Log Exit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
