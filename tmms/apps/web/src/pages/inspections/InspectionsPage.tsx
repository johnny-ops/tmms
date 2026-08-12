import { useState, useEffect } from 'react';
import { ClipboardCheck, Plus, Search, Eye, Edit, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { getStatusBadgeClass, formatStatus, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { DocumentUpload } from '@/components/ui/DocumentUpload';
import { EvidenceViewer } from '@/components/ui/EvidenceViewer';

// Inspection checklist categories
const CHECKLIST_ITEMS = [
  { category: 'Safety', items: ['Brakes', 'Steering', 'Tires', 'Suspension'] },
  { category: 'Lighting', items: ['Headlights', 'Taillights', 'Turn Signals', 'Brake Lights'] },
  { category: 'Body', items: ['Windshield', 'Mirrors', 'Body Condition', 'Doors'] },
  { category: 'Interior', items: ['Seats', 'Emergency Equipment', 'Fire Extinguisher', 'First Aid Kit'] },
];

function InspectionModal({ vehicleId, vehicles, onClose, onSuccess }: { vehicleId?: string; vehicles: any[]; onClose: () => void; onSuccess: () => void }) {
  const vehicle = vehicles.find(v => v.id === vehicleId);
  const [items, setItems] = useState<Record<string, 'PASS' | 'FAIL' | 'NA'>>({});
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  function setItem(name: string, val: 'PASS' | 'FAIL' | 'NA') {
    setItems(prev => ({ ...prev, [name]: val }));
  }

  const allCategories = CHECKLIST_ITEMS.flatMap(c => c.items);
  const answered = Object.keys(items).length;
  const hasFail = Object.values(items).includes('FAIL');
  const overall = answered < allCategories.length ? null : hasFail ? 'FAILED' : 'PASSED';

  async function handleSave() {
    if (!selectedVehicle) {
      alert('Please select a vehicle.');
      return;
    }
    
    // If not all items are answered, we can only save it as scheduled, not completed
    const isCompleted = overall !== null;
    
    setLoading(true);
    try {
      const certNum = isCompleted ? `CERT-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}` : null;
      
      const { error } = await supabase.from('inspections').insert({
        vehicle_id: selectedVehicle,
        scheduled_date: date,
        inspection_date: isCompleted ? new Date().toISOString().split('T')[0] : null,
        result: isCompleted ? overall : null,
        certificate_number: certNum,
        remarks: remarks,
        document_url: documentUrl
      });

      if (error) throw error;
      
      // If inspection is completed and failed, update vehicle status to FOR_INSPECTION
      if (isCompleted && overall === 'FAILED') {
          await supabase.from('vehicles').update({ status: 'FOR_INSPECTION' }).eq('id', selectedVehicle);
      } else if (isCompleted && overall === 'PASSED') {
          await supabase.from('vehicles').update({ status: 'ACTIVE' }).eq('id', selectedVehicle);
      }

      alert('Inspection saved successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error saving inspection: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: 'white', borderRadius: 12, width: '100%', maxWidth: 640,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Vehicle Inspection Form</h2>
          {vehicle ? (
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{vehicle.plate_number} — {vehicle.make} {vehicle.model}</p>
          ) : (
            <div style={{ marginTop: 8 }}>
              <label className="form-label">Select Vehicle *</label>
              <select className="form-input" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
                <option value="">— Select vehicle —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          
          <div style={{ marginBottom: 20 }}>
            <label className="form-label">Scheduled Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {CHECKLIST_ITEMS.map(cat => (
            <div key={cat.category} style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cat.category}
              </h4>
              <div style={{ display: 'grid', gap: 8 }}>
                {cat.items.map(item => (
                  <div key={item} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6,
                    background: items[item] === 'FAIL' ? '#fef2f2' : items[item] === 'PASS' ? '#f0fdf4' : 'white'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>{item}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['PASS', 'FAIL', 'NA'] as const).map(v => (
                        <button key={v} onClick={() => setItem(item, v)} style={{
                          padding: '3px 10px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                          cursor: 'pointer', border: '1px solid',
                          background: items[item] === v ?
                            v === 'PASS' ? '#22c55e' : v === 'FAIL' ? '#ef4444' : '#94a3b8' : 'transparent',
                          color: items[item] === v ? 'white' :
                            v === 'PASS' ? '#22c55e' : v === 'FAIL' ? '#ef4444' : '#94a3b8',
                          borderColor: v === 'PASS' ? '#22c55e' : v === 'FAIL' ? '#ef4444' : '#d1d5db',
                        }}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <label className="form-label">Overall Remarks</label>
            <textarea className="form-input" rows={3} placeholder="Add inspection remarks..." value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
          {overall && (
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 8, textAlign: 'center',
              background: overall === 'PASSED' ? '#f0fdf4' : '#fef2f2',
              border: `2px solid ${overall === 'PASSED' ? '#22c55e' : '#ef4444'}`
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: overall === 'PASSED' ? '#15803d' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {overall === 'PASSED' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                Overall Result: {overall}
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
             <DocumentUpload 
               bucket="evidence"
               folderPath="inspections"
               onUploadSuccess={(url) => setDocumentUrl(url)}
               label="Upload Inspection Photos/Documents (Optional)"
             />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Inspection'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InspectionsPage() {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [page, setPage] = useState(1);
  const [inspecting, setInspecting] = useState<string | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [viewingInspection, setViewingInspection] = useState<any>(null);
  const limit = 10;

  const [inspectionsList, setInspectionsList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);

  const load = async () => {
    const [iRes, vRes] = await Promise.all([
      supabase.from('inspections').select('*').order('scheduled_date', { ascending: false }),
      supabase.from('vehicles').select('*'),
    ]);
    setInspectionsList(iRes.data || []);
    setVehiclesList(vRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const vehicleMap = Object.fromEntries(vehiclesList.map(v => [v.id, v]));

  const filtered = inspectionsList.filter(i => {
    const veh = vehicleMap[i.vehicle_id];
    const q = search.toLowerCase();
    const matchSearch = !q || (veh?.plate_number ?? '').toLowerCase().includes(q) ||
      (i.certificate_number ?? '').toLowerCase().includes(q);
    const matchResult = !resultFilter || i.result === resultFilter;
    return matchSearch && matchResult;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  function resultIcon(result?: string) {
    if (result === 'PASSED') return <CheckCircle size={13} color="#22c55e" />;
    if (result === 'FAILED') return <XCircle size={13} color="#ef4444" />;
    if (result === 'FOR_REINSPECTION') return <AlertCircle size={13} color="#f59e0b" />;
    return null;
  }

  return (
    <div>
      {viewingInspection && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Inspection Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewingInspection(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 4px 0' }}>Certificate Number</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>{viewingInspection.certificate_number || 'N/A'}</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 4px 0' }}>Remarks</p>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>{viewingInspection.remarks || viewingInspection.overall_remarks || 'No remarks provided.'}</p>
              </div>
              
              {viewingInspection.document_url && (
                <div style={{ marginTop: 24 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Attached Document/Evidence</p>
                  <EvidenceViewer url={viewingInspection.document_url} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showModal && <InspectionModal vehicleId={inspecting} vehicles={vehiclesList} onClose={() => setShowModal(false)} onSuccess={() => {
        setShowModal(false);
        load();
      }} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardCheck size={20} color="#3a65ae" /> Vehicle Inspection
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Schedule and conduct vehicle inspections with configurable checklists
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { setInspecting(undefined); setShowModal(true); }}>
            <Plus size={14} /> New Inspection
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: inspectionsList.length, color: '#3a65ae' },
          { label: 'Passed', value: inspectionsList.filter(i => i.result === 'PASSED').length, color: '#22c55e' },
          { label: 'Failed', value: inspectionsList.filter(i => i.result === 'FAILED').length, color: '#ef4444' },
          { label: 'For Reinspection', value: inspectionsList.filter(i => i.result === 'FOR_REINSPECTION').length, color: '#f59e0b' },
          { label: 'Scheduled', value: inspectionsList.filter(i => !i.result).length, color: '#64748b' },
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
          <input className="form-input" style={{ paddingLeft: 32 }}
            placeholder="Search plate, certificate..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-input" style={{ flex: '0 0 180px' }}
          value={resultFilter} onChange={e => { setResultFilter(e.target.value); setPage(1); }}>
          <option value="">All Results</option>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
          <option value="FOR_REINSPECTION">For Reinspection</option>
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Plate</th>
                <th>Scheduled</th>
                <th>Inspected</th>
                <th>Result</th>
                <th>Certificate</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No inspection records found</td></tr>
              ) : paginated.map(i => {
                const veh = vehicleMap[i.vehicle_id];
                return (
                  <tr key={i.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{veh?.make} {veh?.model}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{veh?.year}</div>
                    </td>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: '#3a65ae' }}>
                        {veh?.plate_number ?? '—'}
                      </code>
                    </td>
                    <td style={{ color: '#64748b' }}>{formatDate(i.scheduled_date)}</td>
                    <td style={{ color: '#64748b' }}>{i.inspection_date ? formatDate(i.inspection_date) : <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Pending</span>}</td>
                    <td>
                      {i.result ? (
                        <span className={`badge ${getStatusBadgeClass(i.result)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {resultIcon(i.result)} {formatStatus(i.result)}
                        </span>
                      ) : <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      {i.certificate_number ?? '—'}
                    </td>
                    <td style={{ color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {i.overall_remarks ?? '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" title="View" onClick={() => setViewingInspection(i)}><Eye size={13} /></button>
                        {!i.result && (
                          <button className="btn btn-primary btn-sm" onClick={() => { setInspecting(i.vehicle_id); setShowModal(true); }}>
                            Conduct
                          </button>
                        )}
                        {i.result === 'FOR_REINSPECTION' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => { setInspecting(i.vehicle_id); setShowModal(true); }}>
                            Re-inspect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{total} inspection records</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
