import { useState, useEffect } from 'react';
import {
  UserCheck, Plus, Search, Download, Edit, Eye, AlertTriangle,
  X, Phone, Car, FileText, Shield, Calendar, Hash, Building2,
  EyeOff, FileImage
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { getStatusBadgeClass, formatStatus, formatDate } from '@/lib/utils';

// ── Info Field subcomponent ─────────────────────────────────────────────────
function InfoField({ icon, label, value, mono = false, alert = false }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean; alert?: boolean;
}) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ color: '#94a3b8', marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: alert ? '#dc2626' : '#0f172a', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
      </div>
    </div>
  );
}

// ── Driver View Modal ───────────────────────────────────────────────────────
function DriverViewModal({ driver, operatorMap, onClose, onEdit }: {
  driver: any; operatorMap: Record<string, string>; onClose: () => void; onEdit: () => void;
}) {
  const [licenseRevealed, setLicenseRevealed] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isExpired = driver.license_expiry && new Date(driver.license_expiry) < new Date();
  const daysUntilExpiry = driver.license_expiry
    ? Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / 86400000)
    : null;

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      const [vRes, ticketRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('driver_id', driver.id),
        supabase
          .from('traffic_tickets')
          .select('*, violation_types(name, code)')
          .eq('driver_id', driver.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      setVehicles(vRes.data || []);
      setViolations(ticketRes.data || []);
      setLoading(false);
    }
    loadDetails();
  }, [driver.id]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#16a34a', flexShrink: 0 }}>
              {driver.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>{driver.full_name}</h2>
              <span className={getStatusBadgeClass(driver.status || 'ACTIVE')} style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                {formatStatus(driver.status || 'ACTIVE')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onEdit}
              style={{ padding: '7px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Edit size={14} /> Edit
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Personal Info */}
          <section>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 12 }}>PERSONAL INFORMATION</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InfoField icon={<Phone size={15} />} label="Contact Number" value={driver.contact_number || '—'} />
              <InfoField icon={<Building2 size={15} />} label="Operator / Employer" value={operatorMap[driver.operator_id] || '—'} />
              <InfoField icon={<Calendar size={15} />} label="Registered" value={driver.created_at ? formatDate(driver.created_at) : '—'} />
              <InfoField icon={<Hash size={15} />} label="Driver ID" value={(driver.id?.slice(0, 8) || '') + '…'} mono />
            </div>
          </section>

          {/* License */}
          <section>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>LICENSE INFORMATION</span>
              {driver.license_expiry && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                  background: isExpired ? '#fef2f2' : daysUntilExpiry! <= 90 ? '#fff7ed' : '#f0fdf4',
                  color: isExpired ? '#dc2626' : daysUntilExpiry! <= 90 ? '#ea580c' : '#16a34a' }}>
                  {isExpired ? '⚠ EXPIRED' : daysUntilExpiry! <= 90 ? `⚠ Expires in ${daysUntilExpiry} days` : `✓ Valid — ${daysUntilExpiry} days remaining`}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <InfoField icon={<FileText size={15} />} label="License Number" value={driver.license_number || '—'} mono />
              <InfoField icon={<Calendar size={15} />} label="License Expiry" value={driver.license_expiry ? formatDate(driver.license_expiry) : '—'} alert={!!isExpired} />
            </div>
            {driver.license_image_url ? (
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ position: 'relative', cursor: licenseRevealed ? 'zoom-in' : 'pointer' }}
                  onClick={() => licenseRevealed ? window.open(driver.license_image_url, '_blank') : setLicenseRevealed(true)}>
                  <img src={driver.license_image_url} alt="Driver License"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block', background: '#f8fafc', filter: licenseRevealed ? 'none' : 'blur(12px)', transition: 'filter 0.3s ease' }} />
                  {!licenseRevealed && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(15,23,42,0.45)' }}>
                      <div style={{ background: 'white', borderRadius: '50%', padding: 10 }}><Eye size={22} color="#1d4ed8" /></div>
                      <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>Click to reveal license ID</span>
                    </div>
                  )}
                  {licenseRevealed && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '3px 8px' }}>
                      <button onClick={e => { e.stopPropagation(); setLicenseRevealed(false); }}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600 }}>
                        <EyeOff size={13} /> Hide
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ padding: '6px 12px', background: '#eff6ff', fontSize: '0.72rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileImage size={12} /> {licenseRevealed ? 'Click image to open full size' : 'Click to reveal license image'}
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: 8, textAlign: 'center', border: '2px dashed #e2e8f0', color: '#94a3b8', fontSize: '0.82rem' }}>
                <FileImage size={24} style={{ display: 'block', margin: '0 auto 6px', opacity: 0.3 }} />
                No license image uploaded
              </div>
            )}
          </section>

          {/* Assigned Vehicles */}
          <section>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>ASSIGNED VEHICLES</span>
              <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: 20, fontSize: '0.7rem' }}>{loading ? '…' : vehicles.length}</span>
            </div>
            {loading ? (
              <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Loading…</div>
            ) : vehicles.length === 0 ? (
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', border: '1px dashed #e2e8f0' }}>
                <Car size={22} style={{ display: 'block', margin: '0 auto 6px', opacity: 0.3 }} />
                No vehicles assigned
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vehicles.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Car size={16} color="#3b82f6" />
                      </div>
                      <div>
                        <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{v.plate_number}</code>
                        {v.body_number && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Body #{v.body_number}</div>}
                        {v.vehicle_type && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{v.vehicle_type}</div>}
                      </div>
                    </div>
                    <span className={getStatusBadgeClass(v.status)} style={{ fontSize: '0.7rem', fontWeight: 700 }}>{formatStatus(v.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Violations */}
          <section>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>RECENT VIOLATIONS</span>
              <span style={{ background: violations.length > 0 ? '#fef2f2' : '#f1f5f9', color: violations.length > 0 ? '#dc2626' : '#475569', padding: '1px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>{loading ? '…' : violations.length}</span>
            </div>
            {loading ? (
              <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Loading…</div>
            ) : violations.length === 0 ? (
              <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: 8, textAlign: 'center', color: '#16a34a', fontSize: '0.82rem', border: '1px solid #bbf7d0' }}>
                <Shield size={22} style={{ display: 'block', margin: '0 auto 6px' }} />
                Clean record — no violations on file
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {violations.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{t.violation_types?.name || t.violation_types?.code || 'Traffic Violation'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{formatDate(t.incident_date || t.created_at)}</div>
                    </div>
                    <span className={getStatusBadgeClass(t.status)} style={{ fontSize: '0.7rem', fontWeight: 700 }}>{formatStatus(t.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}


// ── Main Page ───────────────────────────────────────────────────────────────
export function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingDriver, setViewingDriver] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    full_name: '', license_number: '', license_expiry: '',
    contact_number: '', operator_id: '', status: 'ACTIVE'
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

  const operatorMap = Object.fromEntries(operators.map(o => [o.id, o.full_name]));

  const handleOpenEditModal = (driver?: any) => {
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
    setViewingDriver(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.license_number.trim() || !formData.license_expiry) {
      alert('Full name, license number, and license expiry are required.');
      return;
    }
    setIsSubmitting(true);
    
    
    
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
      {/* View Modal */}
      {viewingDriver && (
        <DriverViewModal
          driver={viewingDriver}
          operatorMap={operatorMap}
          onClose={() => setViewingDriver(null)}
          onEdit={() => handleOpenEditModal(viewingDriver)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={20} color="#3a65ae" /> Drivers Database
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage licensed PUV drivers, assignments, and license validity tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenEditModal()}><Plus size={14} /> Add Driver</button>
        </div>
      </div>

      {}
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
                <tr key={drv.id} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                  <td onClick={() => setViewingDriver(drv)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                        {drv.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{drv.full_name}</div>
                        {drv.contact_number && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{drv.contact_number}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.83rem', color: '#475569' }} onClick={() => setViewingDriver(drv)}>{drv.license_number}</td>
                  <td onClick={() => setViewingDriver(drv)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isExpired(drv.license_expiry) && <AlertTriangle size={13} color="#ef4444" />}
                      {isExpiringSoon(drv.license_expiry) && !isExpired(drv.license_expiry) && <AlertTriangle size={13} color="#f59e0b" />}
                      <span style={{ color: isExpired(drv.license_expiry) ? '#ef4444' : isExpiringSoon(drv.license_expiry) ? '#f59e0b' : '#475569', fontSize: '0.83rem' }}>
                        {drv.license_expiry ? formatDate(drv.license_expiry) : '—'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.83rem', color: '#475569' }} onClick={() => setViewingDriver(drv)}>{drv.contact_number || '—'}</td>
                  <td style={{ fontSize: '0.83rem', color: '#475569' }} onClick={() => setViewingDriver(drv)}>{operatorMap[drv.operator_id] || '—'}</td>
                  <td onClick={() => setViewingDriver(drv)}><span className={getStatusBadgeClass(drv.status || 'ACTIVE')}>{formatStatus(drv.status || 'ACTIVE')}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setViewingDriver(drv)}
                        style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 5, background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#475569' }}
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(drv)}
                        style={{ padding: '4px 10px', border: '1px solid #dbeafe', borderRadius: 5, background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#3a65ae' }}
                      >
                        <Edit size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(drv.id)}
                        style={{ padding: '4px 10px', border: '1px solid #fee2e2', borderRadius: 5, background: '#fef2f2', cursor: 'pointer', fontSize: '0.76rem', color: '#ef4444' }}
                      >
                        Delete
                      </button>
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
