import { useState, useEffect } from 'react';
import { Search, FileText, Plus, X, AlertCircle, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type FranchiseStatus = 'PENDING' | 'APPROVED' | 'FOR_CORRECTION' | 'REJECTED' | 'ACTIVE' | 'UNDER_REVIEW' | 'EXPIRING' | 'EXPIRED';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  PENDING:        { label: 'Pending Review',   color: '#d97706', bg: '#fffbeb', border: '#fde68a',  icon: <Clock size={13} /> },
  UNDER_REVIEW:   { label: 'Under Review',     color: '#d97706', bg: '#fffbeb', border: '#fde68a',  icon: <Clock size={13} /> },
  APPROVED:       { label: 'Approved',         color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',  icon: <CheckCircle size={13} /> },
  ACTIVE:         { label: 'Active',           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',  icon: <CheckCircle size={13} /> },
  FOR_CORRECTION: { label: 'For Correction',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca',  icon: <AlertCircle size={13} /> },
  REJECTED:       { label: 'Rejected',         color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff',  icon: <XCircle size={13} /> },
  EXPIRING:       { label: 'Expiring Soon',    color: '#ea580c', bg: '#fff7ed', border: '#fed7aa',  icon: <AlertCircle size={13} /> },
  EXPIRED:        { label: 'Expired',          color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb',  icon: <XCircle size={13} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.72rem', fontWeight: 700 }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

interface FranchiseForm {
  vehicle_id: string;
  route_id: string;
  franchise_number: string;
  validity_start: string;
  validity_end: string;
}

export function OperatorFranchisesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [franchises, setFranchises] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [form, setForm] = useState<FranchiseForm>({ vehicle_id: '', route_id: '', franchise_number: '', validity_start: '', validity_end: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [cpcFile, setCpcFile] = useState<File | null>(null);
  const [routeDocFile, setRouteDocFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      // Load operator
      const { data: op } = await supabase.from('operators').select('id, full_name').eq('profile_id', user.id).maybeSingle();
      if (!op) { setLoading(false); return; }
      setOperatorId(op.id);
      setOperatorName(op.full_name || user.full_name || '');

      // Load franchises with route info
      const { data: fr } = await supabase.from('franchises').select('*, route:routes(name, route_code), vehicle:vehicles(plate_number, vehicle_type)').eq('operator_id', op.id).order('created_at', { ascending: false });
      setFranchises(fr || []);

      // Load approved vehicles only (for franchise application)
      const { data: veh } = await supabase.from('vehicles').select('id, plate_number, vehicle_type, make, model').eq('operator_id', op.id).eq('verification_status', 'APPROVED');
      setVehicles(veh || []);

      // Load routes from OPEN announcements only (critical restriction)
      const today = new Date().toISOString().split('T')[0];
      const { data: announcements } = await supabase
        .from('announcements')
        .select('route_id, vehicle_type, route:routes(id, name, route_code, origin, destination)')
        .eq('status', 'OPEN')
        .in('type', ['OPERATOR', 'BOTH'])
        .lte('start_date', today)
        .gte('end_date', today);
      
      // Deduplicate routes
      const routeMap = new Map();
      (announcements || []).forEach((a: any) => {
        if (a.route && !routeMap.has(a.route_id)) {
          routeMap.set(a.route_id, { ...a.route, vehicle_type: a.vehicle_type });
        }
      });
      setAvailableRoutes([...routeMap.values()]);
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = franchises.filter(f =>
    f.franchise_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.route?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.vehicle?.plate_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function uploadFile(file: File, folder: string, name: string): Promise<string | null> {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${name}.${ext}`;
    const { error } = await supabase.storage.from('driver-docs').upload(path, file, { upsert: true });
    if (error) return null;
    return supabase.storage.from('driver-docs').getPublicUrl(path).data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.vehicle_id) { setFormError('Please select a vehicle.'); return; }
    if (!form.route_id) { setFormError('Please select a route from available announcements.'); return; }
    if (!form.franchise_number.trim()) { setFormError('Franchise number is required.'); return; }
    if (!operatorId) { setFormError('Operator record not found.'); return; }
    setSubmitting(true);
    try {
      const slug = `${Date.now()}_franchise`;
      const [cpcUrl, routeDocUrl] = await Promise.all([
        cpcFile ? uploadFile(cpcFile, `franchise-docs/${slug}`, 'CPC') : Promise.resolve(null),
        routeDocFile ? uploadFile(routeDocFile, `franchise-docs/${slug}`, 'RouteDoc') : Promise.resolve(null),
      ]);
      const { error: insErr } = await supabase.from('franchises').insert({
        franchise_number: form.franchise_number,
        operator_id: operatorId,
        vehicle_id: form.vehicle_id,
        route_id: form.route_id,
        status: 'PENDING',
        validity_start: form.validity_start || null,
        validity_end: form.validity_end || null,
        document_cpc_url: cpcUrl,
        document_route_url: routeDocUrl,
      });
      if (insErr) throw insErr;
      // Reload
      const { data: fr } = await supabase.from('franchises').select('*, route:routes(name, route_code), vehicle:vehicles(plate_number, vehicle_type)').eq('operator_id', operatorId).order('created_at', { ascending: false });
      setFranchises(fr || []);
      setShowModal(false);
      setForm({ vehicle_id: '', route_id: '', franchise_number: '', validity_start: '', validity_end: '' });
      setCpcFile(null); setRouteDocFile(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit franchise application.');
    } finally {
      setSubmitting(false);
    }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.87rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={22} color="#3a65ae" /> My Franchises
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage your transport franchise applications and approvals.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#3a65ae', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
          <Plus size={16} /> Apply Franchise
        </button>
      </div>

      {/* Route restriction notice */}
      {availableRoutes.length > 0 && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8', marginBottom: 2 }}>Available Routes from Active Announcements</div>
            <div style={{ fontSize: '0.78rem', color: '#3b82f6' }}>{availableRoutes.map(r => r.name).join(' · ')}</div>
          </div>
        </div>
      )}
      {!loading && availableRoutes.length === 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="#ea580c" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.8rem', color: '#c2410c' }}>No routes are currently available for application. Please wait for an announcement to open.</div>
        </div>
      )}

      {/* Search */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="Search by franchise number, route, or plate..." style={{ ...inp, paddingLeft: 38, background: '#f8fafc' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}><FileText size={40} style={{ marginBottom: 10, opacity: 0.3 }} /><div>Loading franchises...</div></div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <FileText size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No franchises found</div>
          <div style={{ fontSize: '0.82rem' }}>Click "Apply Franchise" to submit a new application.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map(f => (
            <div key={f.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{f.franchise_number}</code>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 3 }}>
                    {f.route?.name || 'No route'} {f.route?.route_code ? `· ${f.route.route_code}` : ''}
                  </div>
                </div>
                <StatusBadge status={f.status} />
              </div>

              {f.status === 'FOR_CORRECTION' && f.correction_reason && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>CORRECTION NEEDED</div>
                  <p style={{ fontSize: '0.83rem', color: '#dc2626', margin: 0 }}>{f.correction_reason}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Vehicle', value: f.vehicle?.plate_number || '—' },
                  { label: 'Type', value: f.vehicle?.vehicle_type || '—' },
                  { label: 'Valid From', value: f.validity_start ? new Date(f.validity_start).toLocaleDateString() : '—' },
                  { label: 'Valid Until', value: f.validity_end ? new Date(f.validity_end).toLocaleDateString() : '—' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.63rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>{item.label.toUpperCase()}</div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#1e293b' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Franchise Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 620, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', margin: 'auto' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>Apply for Franchise</h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Select a vehicle and an available route from active announcements</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 28 }}>
              {formError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: '0.82rem', color: '#dc2626', display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={16} />{formError}</div>}

              <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
                {/* Operator Name (auto-filled) */}
                <div>
                  <label style={lbl}>Operator Name</label>
                  <input style={{ ...inp, background: '#f8fafc', color: '#64748b' }} value={operatorName} readOnly />
                </div>

                {/* Vehicle Selection */}
                <div>
                  <label style={lbl}>Select Vehicle <span style={{ color: '#dc2626' }}>*</span></label>
                  {vehicles.length === 0 ? (
                    <div style={{ padding: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: '0.82rem', color: '#c2410c' }}>
                      No approved vehicles found. Please add and verify a vehicle first.
                    </div>
                  ) : (
                    <select style={inp} value={form.vehicle_id} onChange={e => setForm(p => ({ ...p, vehicle_id: e.target.value }))} required>
                      <option value="">-- Select Vehicle --</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} · {v.vehicle_type} · {v.make} {v.model}</option>)}
                    </select>
                  )}
                </div>

                {/* Route Selection — only from active announcements */}
                <div>
                  <label style={lbl}>Select Route <span style={{ color: '#dc2626' }}>*</span></label>
                  {availableRoutes.length === 0 ? (
                    <div style={{ padding: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: '0.82rem', color: '#c2410c' }}>
                      No routes available. Routes come from active public announcements only.
                    </div>
                  ) : (
                    <select style={inp} value={form.route_id} onChange={e => setForm(p => ({ ...p, route_id: e.target.value }))} required>
                      <option value="">-- Select Available Route --</option>
                      {availableRoutes.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.route_code || r.origin + ' → ' + r.destination})</option>
                      ))}
                    </select>
                  )}
                  <div style={{ fontSize: '0.71rem', color: '#94a3b8', marginTop: 4 }}>Only routes from currently open announcements are selectable.</div>
                </div>

                {/* Franchise Number */}
                <div>
                  <label style={lbl}>Franchise / Reference Number <span style={{ color: '#dc2626' }}>*</span></label>
                  <input style={inp} placeholder="e.g. FR-2026-001" value={form.franchise_number} onChange={e => setForm(p => ({ ...p, franchise_number: e.target.value }))} required />
                </div>

                {/* Validity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Validity Start</label>
                    <input style={inp} type="date" value={form.validity_start} onChange={e => setForm(p => ({ ...p, validity_start: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Validity End (Expiry)</label>
                    <input style={inp} type="date" value={form.validity_end} onChange={e => setForm(p => ({ ...p, validity_end: e.target.value }))} />
                  </div>
                </div>

                {/* CPC Document */}
                <div>
                  <label style={lbl}>CPC / Franchise Document</label>
                  {cpcFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                      <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600, flex: 1 }}>{cpcFile.name}</span>
                      <button type="button" onClick={() => setCpcFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
                      <FileText size={16} color="#94a3b8" />
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Upload CPC document</span>
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setCpcFile(f); }} />
                    </label>
                  )}
                </div>

                {/* Route Authority Document */}
                <div>
                  <label style={lbl}>Route / Authority Supporting Document <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>(optional)</span></label>
                  {routeDocFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                      <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600, flex: 1 }}>{routeDocFile.name}</span>
                      <button type="button" onClick={() => setRouteDocFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
                      <FileText size={16} color="#94a3b8" />
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Upload supporting document</span>
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setRouteDocFile(f); }} />
                    </label>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 8, background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={submitting || vehicles.length === 0 || availableRoutes.length === 0} style={{ flex: 2, padding: 12, background: '#3a65ae', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: (submitting || vehicles.length === 0 || availableRoutes.length === 0) ? 'not-allowed' : 'pointer', opacity: (submitting || vehicles.length === 0 || availableRoutes.length === 0) ? 0.6 : 1 }}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
