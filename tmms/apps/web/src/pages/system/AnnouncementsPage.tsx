import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useSupabase';
import {
  Megaphone, Plus, Edit2, Trash2, X, AlertCircle, CheckCircle, Clock,
  MapPin, Calendar, Car, Search, Eye, EyeOff
} from 'lucide-react';

type AnnouncementType = 'OPERATOR' | 'DRIVER' | 'BOTH';
type AnnouncementStatus = 'OPEN' | 'CLOSED';

interface Announcement {
  id: string;
  title: string;
  type: AnnouncementType;
  route_id: string | null;
  vehicle_type: string | null;
  start_date: string;
  end_date: string;
  status: AnnouncementStatus;
  description: string | null;
  created_by: string | null;
  created_at: string;
  route?: { name: string; route_code: string };
}

interface AnnouncementForm {
  title: string; type: AnnouncementType; route_id: string;
  vehicle_type: string; start_date: string; end_date: string;
  status: AnnouncementStatus; description: string;
}

const INITIAL_FORM: AnnouncementForm = {
  title: '', type: 'OPERATOR', route_id: '', vehicle_type: 'Jeepney',
  start_date: '', end_date: '', status: 'OPEN', description: ''
};

const TYPE_LABELS: Record<AnnouncementType, string> = {
  OPERATOR: 'Operator Only', DRIVER: 'Driver Only', BOTH: 'Operator & Driver'
};

const VEHICLE_TYPES = ['Jeepney', 'UV Express', 'Bus', 'E-Jeepney', 'Tricycle', 'Other'];

function StatusBadge({ status }: { status: AnnouncementStatus }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: status === 'OPEN' ? '#f0fdf4' : '#f1f5f9', color: status === 'OPEN' ? '#16a34a' : '#64748b', border: `1px solid ${status === 'OPEN' ? '#bbf7d0' : '#e2e8f0'}` }}>
      {status === 'OPEN' ? <CheckCircle size={12} /> : <Clock size={12} />}
      {status}
    </span>
  );
}

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: anns }, { data: rts }] = await Promise.all([
      supabase.from('announcements').select('*, route:routes(name, route_code)').order('created_at', { ascending: false }),
      supabase.from('routes').select('id, name, route_code, origin, destination').eq('is_active', true).order('name'),
    ]);
    setAnnouncements(anns || []);
    setRoutes(rts || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(INITIAL_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({
      title: a.title, type: a.type, route_id: a.route_id || '',
      vehicle_type: a.vehicle_type || 'Jeepney',
      start_date: a.start_date, end_date: a.end_date,
      status: a.status, description: a.description || ''
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.start_date || !form.end_date) { setFormError('Application period dates are required.'); return; }
    if (new Date(form.end_date) < new Date(form.start_date)) { setFormError('End date must be after start date.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        route_id: form.route_id || null,
        vehicle_type: form.vehicle_type || null,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        description: form.description.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from('announcements').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('announcements').insert(payload);
        if (error) throw error;
      }
      await loadData();
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save announcement.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement? This cannot be undone.')) return;
    setDeleting(id);
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    setDeleting(null);
  }

  async function toggleStatus(a: Announcement) {
    const newStatus: AnnouncementStatus = a.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    await supabase.from('announcements').update({ status: newStatus }).eq('id', a.id);
    setAnnouncements(prev => prev.map(item => item.id === a.id ? { ...item, status: newStatus } : item));
  }

  const filtered = announcements.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.route?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'ALL' || a.type === filterType;
    const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const inp: React.CSSProperties = { width: '100%', padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.87rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Megaphone size={22} color="#3a65ae" /> Announcements
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage public announcements for route applications.</p>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#3a65ae', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
          <Plus size={16} /> Create Announcement
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="Search announcements..." style={{ ...inp, paddingLeft: 34, height: 38 }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select style={{ ...inp, width: 'auto', height: 38 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="OPERATOR">Operator</option>
          <option value="DRIVER">Driver</option>
          <option value="BOTH">Both</option>
        </select>
        <select style={{ ...inp, width: 'auto', height: 38 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: announcements.length, color: '#0f172a' },
          { label: 'Open', value: announcements.filter(a => a.status === 'OPEN').length, color: '#16a34a' },
          { label: 'Closed', value: announcements.filter(a => a.status === 'CLOSED').length, color: '#64748b' },
          { label: 'Operator', value: announcements.filter(a => a.type === 'OPERATOR' || a.type === 'BOTH').length, color: '#ea580c' },
          { label: 'Driver', value: announcements.filter(a => a.type === 'DRIVER' || a.type === 'BOTH').length, color: '#2563eb' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}><Megaphone size={40} style={{ opacity: 0.2, marginBottom: 10 }} /><div>Loading...</div></div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <Megaphone size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
          <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No announcements found</div>
          <div style={{ fontSize: '0.82rem' }}>Create one to allow operators and drivers to apply for routes.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map(a => {
            const today = new Date();
            const isCurrentlyOpen = a.status === 'OPEN' && new Date(a.start_date) <= today && new Date(a.end_date) >= today;
            return (
              <div key={a.id} style={{ background: 'white', border: `1px solid ${isCurrentlyOpen ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <StatusBadge status={a.status} />
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: a.type === 'OPERATOR' ? '#fff7ed' : a.type === 'DRIVER' ? '#eff6ff' : '#f5f3ff', color: a.type === 'OPERATOR' ? '#ea580c' : a.type === 'DRIVER' ? '#2563eb' : '#7c3aed', border: `1px solid ${a.type === 'OPERATOR' ? '#fed7aa' : a.type === 'DRIVER' ? '#bfdbfe' : '#ddd6fe'}` }}>
                        {TYPE_LABELS[a.type]}
                      </span>
                      {isCurrentlyOpen && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 20 }}>ACCEPTING APPLICATIONS</span>}
                    </div>
                    <h3 style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', marginBottom: 6 }}>{a.title}</h3>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
                      {a.route && (
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: '0.82rem', color: '#475569' }}>
                          <MapPin size={13} color="#94a3b8" /> {a.route.name}
                        </div>
                      )}
                      {a.vehicle_type && (
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: '0.82rem', color: '#475569' }}>
                          <Car size={13} color="#94a3b8" /> {a.vehicle_type}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: '0.82rem', color: '#475569' }}>
                        <Calendar size={13} color="#94a3b8" />
                        {new Date(a.start_date).toLocaleDateString()} – {new Date(a.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    {a.description && <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>{a.description}</p>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => toggleStatus(a)} title={a.status === 'OPEN' ? 'Close' : 'Open'} style={{ padding: '7px 12px', background: a.status === 'OPEN' ? '#fef2f2' : '#f0fdf4', color: a.status === 'OPEN' ? '#dc2626' : '#16a34a', border: `1px solid ${a.status === 'OPEN' ? '#fecaca' : '#bbf7d0'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 700 }}>
                      {a.status === 'OPEN' ? <EyeOff size={14} /> : <Eye size={14} />}
                      {a.status === 'OPEN' ? 'Close' : 'Open'}
                    </button>
                    <button onClick={() => openEdit(a)} style={{ padding: '7px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 700 }}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id} style={{ padding: '7px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: deleting === a.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 700, opacity: deleting === a.id ? 0.5 : 1 }}>
                      <Trash2 size={14} /> {deleting === a.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 600, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', margin: 'auto' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>{editing ? 'Edit Announcement' : 'Create Announcement'}</h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Configure route application announcement details</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 28 }}>
              {formError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: '0.82rem', color: '#dc2626', display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={16} />{formError}</div>}

              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={lbl}>Title <span style={{ color: '#dc2626' }}>*</span></label>
                  <input style={inp} placeholder="e.g. Route Application — Novaliches to Cubao" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Announcement Type <span style={{ color: '#dc2626' }}>*</span></label>
                    <select style={inp} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as AnnouncementType }))}>
                      <option value="OPERATOR">Operator Only</option>
                      <option value="DRIVER">Driver Only</option>
                      <option value="BOTH">Operator & Driver</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Status</label>
                    <select style={inp} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as AnnouncementStatus }))}>
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Route</label>
                    <select style={inp} value={form.route_id} onChange={e => setForm(p => ({ ...p, route_id: e.target.value }))}>
                      <option value="">-- Select Route (optional) --</option>
                      {routes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.route_code || r.origin + '→' + r.destination})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Vehicle Type</label>
                    <select style={inp} value={form.vehicle_type} onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value }))}>
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Application Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                    <input style={inp} type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required />
                  </div>
                  <div>
                    <label style={lbl}>Application End Date <span style={{ color: '#dc2626' }}>*</span></label>
                    <input style={inp} type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} required />
                  </div>
                </div>

                <div>
                  <label style={lbl}>Description</label>
                  <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} placeholder="Additional details about this announcement..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 8, background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: 12, background: '#3a65ae', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Saving...' : editing ? 'Update Announcement' : 'Create Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
