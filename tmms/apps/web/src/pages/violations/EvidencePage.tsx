import { useState, useEffect } from 'react';
import { FileText, Search, Download, Eye, Camera, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

export function EvidencePage() {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('violation_evidence').select('*').order('created_at', { ascending: false });
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
    return !q || e.ticket_number?.toLowerCase().includes(q) || e.plate_number?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q);
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

      {/* Stats */}
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
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#3a65ae', fontWeight: 600 }}>{ev.ticket_number}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ev.plate_number || '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: '#475569', maxWidth: 200 }}>{ev.location || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatDate(ev.incident_date || ev.created_at)}</td>
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
                    <button style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#475569' }}>
                      <Eye size={13} /> View
                    </button>
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
