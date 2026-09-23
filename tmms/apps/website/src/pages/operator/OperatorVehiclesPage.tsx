import { useState, useEffect, useRef } from 'react';
import { Search, Car, Calendar, Plus, X, Upload, Image as ImageIcon,
  Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type VerificationStatus = 'PENDING' | 'APPROVED' | 'FOR_CORRECTION' | 'REJECTED';

const VERIFY_CONFIG: Record<VerificationStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  PENDING:        { label: 'Pending Verification', color: '#d97706', bg: '#fffbeb', border: '#fde68a',  icon: <Clock size={13} /> },
  APPROVED:       { label: 'Verified',             color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',  icon: <CheckCircle size={13} /> },
  FOR_CORRECTION: { label: 'For Correction',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca',  icon: <AlertCircle size={13} /> },
  REJECTED:       { label: 'Rejected',             color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff',  icon: <XCircle size={13} /> },
};

function VerificationBadge({ status }: { status: VerificationStatus }) {
  const cfg = VERIFY_CONFIG[status] ?? VERIFY_CONFIG.PENDING;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.72rem', fontWeight: 700 }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_MB = 5;

function FileUploadField({ label, file, onChange, onRemove, required }: {
  label: string; file: File | null;
  onChange: (f: File) => void; onRemove: () => void; required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) { alert('Invalid file type. Use JPG, PNG, WEBP or PDF.'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { alert(`Max ${MAX_MB}MB allowed.`); return; }
    onChange(f);
  }
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {file ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
          <ImageIcon size={16} color="#16a34a" />
          <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
          <button onClick={onRemove} type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}><X size={16} /></button>
        </div>
      ) : (
        <div onClick={() => ref.current?.click()} style={{ border: '2px dashed #e2e8f0', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', background: '#f8fafc' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#94a3b8'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
          <Upload size={20} color="#94a3b8" style={{ marginBottom: 6 }} />
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Click to upload</div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>JPG, PNG, PDF — max {MAX_MB}MB</div>
        </div>
      )}
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleSelect} style={{ display: 'none' }} />
    </div>
  );
}

interface VehicleForm {
  plate_number: string; vehicle_type: string; make: string; model: string;
  year: string; color: string; engine_number: string; chassis_number: string; capacity: string;
}

const INITIAL_FORM: VehicleForm = { plate_number: '', vehicle_type: 'Jeepney', make: '', model: '', year: '', color: '', engine_number: '', chassis_number: '', capacity: '' };
const VEHICLE_TYPES = ['Jeepney', 'UV Express', 'Bus', 'E-Jeepney', 'Tricycle', 'Other'];

export function OperatorVehiclesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<VehicleForm>(INITIAL_FORM);
  const [orFile, setOrFile] = useState<File | null>(null);
  const [crFile, setCrFile] = useState<File | null>(null);
  const [cocFile, setCocFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      const { data: op } = await supabase.from('operators').select('id').eq('profile_id', user.id).maybeSingle();
      if (!op) { setLoading(false); return; }
      setOperatorId(op.id);
      const { data: veh } = await supabase.from('vehicles').select('*').eq('operator_id', op.id).order('created_at', { ascending: false });
      setVehicles(veh || []);
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = vehicles.filter(v =>
    v.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function uploadFile(file: File, folder: string, filename: string): Promise<string | null> {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${filename}.${ext}`;
    const { error } = await supabase.storage.from('driver-docs').upload(path, file, { upsert: true });
    if (error) { console.error('Upload error', error); return null; }
    return supabase.storage.from('driver-docs').getPublicUrl(path).data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.plate_number.trim() || !form.make.trim() || !form.model.trim() || !form.capacity) {
      setFormError('Please fill in all required fields.'); return;
    }
    if (!orFile || !crFile) { setFormError('OR and CR documents are required.'); return; }
    if (!operatorId) { setFormError('Operator record not found.'); return; }
    setSubmitting(true);
    try {
      const slug = `${Date.now()}_${form.plate_number.replace(/\s/g, '_')}`;
      const [orUrl, crUrl, cocUrl] = await Promise.all([
        uploadFile(orFile, `vehicle-docs/${slug}`, 'OR'),
        uploadFile(crFile, `vehicle-docs/${slug}`, 'CR'),
        cocFile ? uploadFile(cocFile, `vehicle-docs/${slug}`, 'COC') : Promise.resolve(null),
      ]);
      const { error: insErr } = await supabase.from('vehicles').insert({
        plate_number: form.plate_number.toUpperCase(),
        vehicle_type: form.vehicle_type,
        make: form.make,
        model: form.model,
        year: form.year ? parseInt(form.year) : null,
        color: form.color,
        engine_number: form.engine_number,
        chassis_number: form.chassis_number,
        capacity: parseInt(form.capacity),
        operator_id: operatorId,
        verification_status: 'PENDING',
        document_or_url: orUrl,
        document_cr_url: crUrl,
        document_coc_url: cocUrl,
        status: 'UNDER_REVIEW',
        registration_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      if (insErr) throw insErr;
      // Reload vehicles
      const { data: veh } = await supabase.from('vehicles').select('*').eq('operator_id', operatorId).order('created_at', { ascending: false });
      setVehicles(veh || []);
      setShowModal(false);
      setForm(INITIAL_FORM);
      setOrFile(null); setCrFile(null); setCocFile(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add vehicle.');
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
            <Car size={22} color="#3a65ae" /> My Vehicles
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage vehicles registered under your operator account.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#3a65ae', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Search */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="Search by plate number, make, or model..." style={{ ...inp, paddingLeft: 38, background: '#f8fafc' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}><Car size={40} style={{ marginBottom: 10, opacity: 0.3 }} /><div>Loading vehicles...</div></div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <Car size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No vehicles found</div>
          <div style={{ fontSize: '0.82rem' }}>Click "Add Vehicle" to register your first vehicle.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map(v => (
            <div key={v.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={20} color="#3b82f6" />
                  </div>
                  <div>
                    <code style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', letterSpacing: '0.05em' }}>{v.plate_number}</code>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{v.vehicle_type} · {v.make} {v.model} {v.year ? `(${v.year})` : ''}</div>
                  </div>
                </div>
                <VerificationBadge status={v.verification_status || 'PENDING'} />
              </div>

              {v.verification_status === 'FOR_CORRECTION' && v.verification_reason && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>CORRECTION NEEDED</div>
                  <p style={{ fontSize: '0.83rem', color: '#dc2626', margin: 0 }}>{v.verification_reason}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
                {[
                  { label: 'Color', value: v.color || '—' },
                  { label: 'Engine No.', value: v.engine_number || '—' },
                  { label: 'Chassis No.', value: v.chassis_number || '—' },
                  { label: 'Capacity', value: v.capacity ? `${v.capacity} pax` : '—' },
                ].map(f => (
                  <div key={f.label} style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.63rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>{f.label.toUpperCase()}</div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#1e293b' }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Documents */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'OR', url: v.document_or_url },
                  { label: 'CR', url: v.document_cr_url },
                  { label: 'COC/Insurance', url: v.document_coc_url },
                ].map(doc => doc.url ? (
                  <button key={doc.label} onClick={() => setViewDoc({ url: doc.url, label: doc.label })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    <Eye size={13} /> {doc.label}
                  </button>
                ) : (
                  <span key={doc.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#f1f5f9', color: '#94a3b8', borderRadius: 6, fontSize: '0.75rem' }}>
                    {doc.label}: Not uploaded
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', margin: 'auto' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>Add Vehicle</h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Enter vehicle information and upload required documents</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 28 }}>
              {formError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: '0.82rem', color: '#dc2626', display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={16} />{formError}</div>}

              {/* Vehicle Info */}
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vehicle Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Plate Number <span style={{ color: '#dc2626' }}>*</span></label>
                  <input style={inp} placeholder="e.g. ABC-1234" value={form.plate_number} onChange={e => setForm(p => ({ ...p, plate_number: e.target.value.toUpperCase() }))} required />
                </div>
                <div>
                  <label style={lbl}>Vehicle Type <span style={{ color: '#dc2626' }}>*</span></label>
                  <select style={{ ...inp }} value={form.vehicle_type} onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value }))}>
                    {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Make / Brand <span style={{ color: '#dc2626' }}>*</span></label>
                  <input style={inp} placeholder="e.g. Toyota" value={form.make} onChange={e => setForm(p => ({ ...p, make: e.target.value }))} required />
                </div>
                <div>
                  <label style={lbl}>Model <span style={{ color: '#dc2626' }}>*</span></label>
                  <input style={inp} placeholder="e.g. Hi-Ace" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} required />
                </div>
                <div>
                  <label style={lbl}>Year Model</label>
                  <input style={inp} type="number" placeholder="e.g. 2022" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} min="1990" max={new Date().getFullYear()} />
                </div>
                <div>
                  <label style={lbl}>Color</label>
                  <input style={inp} placeholder="e.g. Yellow" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Engine Number</label>
                  <input style={inp} value={form.engine_number} onChange={e => setForm(p => ({ ...p, engine_number: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Chassis Number</label>
                  <input style={inp} value={form.chassis_number} onChange={e => setForm(p => ({ ...p, chassis_number: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Seating Capacity <span style={{ color: '#dc2626' }}>*</span></label>
                  <input style={inp} type="number" placeholder="e.g. 16" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} min="1" required />
                </div>
              </div>

              {/* Documents */}
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vehicle Documents</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <FileUploadField label="Official Receipt (OR)" file={orFile} onChange={setOrFile} onRemove={() => setOrFile(null)} required />
                <FileUploadField label="Certificate of Registration (CR)" file={crFile} onChange={setCrFile} onRemove={() => setCrFile(null)} required />
                <FileUploadField label="COC / Insurance" file={cocFile} onChange={setCocFile} onRemove={() => setCocFile(null)} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 8, background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: 12, background: '#3a65ae', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }} onClick={() => setViewDoc(null)}>
          <div style={{ background: 'white', borderRadius: 12, maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{viewDoc.label}</span>
              <button onClick={() => setViewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {viewDoc.url.endsWith('.pdf') ? (
                <iframe src={viewDoc.url} style={{ width: '100%', height: 600, border: 'none' }} title={viewDoc.label} />
              ) : (
                <img src={viewDoc.url} alt={viewDoc.label} style={{ width: '100%', borderRadius: 8 }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
