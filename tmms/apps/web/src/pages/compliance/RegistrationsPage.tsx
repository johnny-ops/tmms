import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, Download, AlertTriangle, Edit, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getStatusBadgeClass, formatStatus, formatDate } from '@/lib/utils';

function RenewModal({ vehicle, onClose, onSuccess }: { vehicle: any; onClose: () => void; onSuccess: () => void }) {
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!newDate) {
      alert('Please select a new expiry date');
      return;
    }
    setLoading(true);
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co') {
      try {
        const { error } = await supabase.from('vehicles').update({ registration_expiry: newDate }).eq('id', vehicle.id);
        if (error) throw error;
        alert('Registration renewed successfully!');
        onSuccess();
      } catch (err: any) {
        alert('Error renewing registration: ' + err.message);
      }
    } else {
      alert('Registration renewed! (Demo)');
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Renew Registration</h2>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 20 }}>{vehicle.plate_number} — {vehicle.make} {vehicle.model}</p>
        
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">New Expiry Date</label>
          <input type="date" className="form-input" value={newDate} onChange={e => setNewDate(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Renew'}</button>
        </div>
      </div>
    </div>
  );
}

export function RegistrationsPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('vehicles').select('*').order('registration_expiry', { ascending: true });
        if (error) throw error;
        setVehicles(data || []);
      } catch (err: any) {
        console.error('Failed to load vehicles:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isExpired = (d: string) => d && new Date(d) < new Date();
  const isExpiringSoon = (d: string) => {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  };

  const getRegStatus = (v: any) => {
    if (!v.registration_expiry) return 'NO_REG';
    if (isExpired(v.registration_expiry)) return 'EXPIRED';
    if (isExpiringSoon(v.registration_expiry)) return 'EXPIRING_SOON';
    return 'VALID';
  };

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.plate_number?.toLowerCase().includes(q) || v.registration_number?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q);
    const matchFilter = !filter || getRegStatus(v) === filter;
    return matchSearch && matchFilter;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const regStatusBadge = (v: any) => {
    const s = getRegStatus(v);
    const map: Record<string, { label: string; color: string; bg: string }> = {
      VALID: { label: 'Valid', color: '#16a34a', bg: '#dcfce7' },
      EXPIRING_SOON: { label: 'Expiring Soon', color: '#d97706', bg: '#fef3c7' },
      EXPIRED: { label: 'Expired', color: '#dc2626', bg: '#fee2e2' },
      NO_REG: { label: 'Not Registered', color: '#64748b', bg: '#f1f5f9' },
    };
    const m = map[s] || map['NO_REG'];
    return <span style={{ fontSize: '0.74rem', fontWeight: 600, color: m.color, background: m.bg, padding: '2px 8px', borderRadius: 10 }}>{m.label}</span>;
  };

  const [renewingVehicle, setRenewingVehicle] = useState<any | null>(null);

  return (
    <div>
      {renewingVehicle && (
        <RenewModal 
          vehicle={renewingVehicle} 
          onClose={() => setRenewingVehicle(null)} 
          onSuccess={() => {
            setRenewingVehicle(null);
            window.location.reload();
          }} 
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={20} color="#3a65ae" /> Vehicle Registration Tracking
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Monitor LTO registration validity for all PUVs in the LGU fleet</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm"><Plus size={14} /> Add Record</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Vehicles', value: vehicles.length, color: '#3a65ae', filter: '' },
          { label: 'Valid Registration', value: vehicles.filter(v => getRegStatus(v) === 'VALID').length, color: '#22c55e', filter: 'VALID' },
          { label: 'Expiring (30 days)', value: vehicles.filter(v => getRegStatus(v) === 'EXPIRING_SOON').length, color: '#f59e0b', filter: 'EXPIRING_SOON' },
          { label: 'Expired', value: vehicles.filter(v => getRegStatus(v) === 'EXPIRED').length, color: '#ef4444', filter: 'EXPIRED' },
        ].map(s => (
          <div key={s.label} onClick={() => { setFilter(filter === s.filter ? '' : s.filter); setPage(1); }}
            style={{ background: 'white', border: `1px solid ${filter === s.filter ? s.color : '#e2e8f0'}`, borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Expiry warning */}
      {vehicles.filter(v => isExpired(v.registration_expiry)).length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span style={{ fontSize: '0.84rem', color: '#dc2626', fontWeight: 500 }}>
            {vehicles.filter(v => isExpired(v.registration_expiry)).length} vehicles have expired LTO registrations and must be flagged for compliance action.
          </span>
        </div>
      )}

      <div className="card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 9 }} />
            <input type="text" placeholder="Search plate, reg. number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Plate Number</th>
                <th>Vehicle</th>
                <th>Reg. Number</th>
                <th>Expiry Date</th>
                <th>Reg. Status</th>
                <th>Vehicle Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</td></tr>
              ) : paginated.map(v => (
                <tr key={v.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>{v.plate_number}</td>
                  <td style={{ fontSize: '0.83rem', color: '#475569' }}>{v.year} {v.make} {v.model}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>{v.registration_number || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isExpired(v.registration_expiry) && <AlertTriangle size={12} color="#ef4444" />}
                      <span style={{ color: isExpired(v.registration_expiry) ? '#ef4444' : isExpiringSoon(v.registration_expiry) ? '#d97706' : '#475569', fontSize: '0.83rem' }}>
                        {v.registration_expiry ? formatDate(v.registration_expiry) : '—'}
                      </span>
                    </div>
                  </td>
                  <td>{regStatusBadge(v)}</td>
                  <td><span className={getStatusBadgeClass(v.status)}>{formatStatus(v.status)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#475569' }}><Eye size={13} /> View</button>
                      <button onClick={() => setRenewingVehicle(v)} style={{ padding: '4px 8px', border: '1px solid #dbeafe', borderRadius: 5, background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#3a65ae' }}><Edit size={13} /> Renew</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Showing {Math.min((page-1)*limit+1,total)}–{Math.min(page*limit,total)} of {total} records</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid #e2e8f0', background: page===1?'#f8fafc':'white', cursor: page===1?'not-allowed':'pointer', fontSize: '0.8rem' }}>Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid #e2e8f0', background: page===totalPages?'#f8fafc':'white', cursor: page===totalPages?'not-allowed':'pointer', fontSize: '0.8rem' }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
