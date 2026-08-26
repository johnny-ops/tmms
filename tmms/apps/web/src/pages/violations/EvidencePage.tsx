import { useState, useEffect } from 'react';
import { FileText, Search, Download, Eye, Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

export function EvidencePage() {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('violation_evidence')
          .select('*, ticket:traffic_tickets(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setEvidence(data || []);
      } catch (err: any) {
        console.error('Failed to load evidence:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = evidence.filter(e => {
    const q = search.toLowerCase();
    const tkt = e.ticket?.ticket_number || '';
    const plt = e.ticket?.plate_number || '';
    const loc = e.ticket?.location || '';
    return !q || tkt.toLowerCase().includes(q) || plt.toLowerCase().includes(q) || loc.toLowerCase().includes(q);
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20} color="#3a65ae" /> Evidence Repository
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Photo and video evidence from AI cameras and manual uploads by traffic enforcers</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm"><Upload size={14} /> Upload Evidence</button>
        </div>
      </div>

      {}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Evidence', value: evidence.length, color: '#3a65ae' },
          { label: 'AI Camera', value: evidence.filter(e => e.evidence_type === 'AI_CAMERA').length, color: '#8b5cf6' },
          { label: 'Manual Upload', value: evidence.filter(e => e.evidence_type === 'MANUAL_UPLOAD').length, color: '#0891b2' },
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
            <input type="text" placeholder="Search by ticket, plate..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Plate Number</th>
                <th>Location</th>
                <th>Date</th>
                <th>Source</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</td></tr>
              ) : paginated.map(ev => (
                <tr key={ev.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#3a65ae', fontWeight: 600 }}>{ev.ticket?.ticket_number || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ev.ticket?.plate_number || '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: '#475569', maxWidth: 200 }}>{ev.ticket?.location || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatDate(ev.ticket?.incident_date || ev.created_at)}</td>
                  <td>
                    {ev.evidence_type === 'AI_CAMERA' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.77rem', color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: 10, width: 'fit-content' }}>
                        <Camera size={11} /> AI Camera
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.77rem', color: '#0e7490', background: '#cffafe', padding: '2px 8px', borderRadius: 10, width: 'fit-content' }}>
                        <Upload size={11} /> Manual
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.notes || '—'}</td>
                  <td>
                    <button 
                      onClick={() => setSelectedEvidence(ev)}
                      style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#475569' }}>
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedEvidence && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 800, borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Evidence Details</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedEvidence.ticket?.ticket_number} • Plate {selectedEvidence.ticket?.plate_number}
                </p>
              </div>
              <button onClick={() => setSelectedEvidence(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 20, background: '#f8fafc', display: 'flex', justifyContent: 'center', minHeight: 300 }}>
              {selectedEvidence.file_url ? (
                selectedEvidence.file_url.includes('.mp4') || selectedEvidence.file_url.includes('.webm') ? (
                  <video controls style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                    <source src={selectedEvidence.file_url} />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img 
                    src={selectedEvidence.file_url} 
                    alt="Evidence" 
                    style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 8, border: '1px solid #cbd5e1' }} 
                  />
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <Camera size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p>No media file attached</p>
                </div>
              )}
            </div>
            
            <div style={{ padding: 20, borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Location</label>
                  <div style={{ fontSize: '0.85rem' }}>{selectedEvidence.ticket?.location || '—'}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Source</label>
                  <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedEvidence.evidence_type === 'AI_CAMERA' ? <><Camera size={14} color="#7c3aed" /> AI Camera</> : <><Upload size={14} color="#0e7490" /> Manual Upload</>}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Notes</label>
                  <div style={{ fontSize: '0.85rem', background: '#f1f5f9', padding: '8px 12px', borderRadius: 6 }}>
                    {selectedEvidence.notes || 'No additional notes provided.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
