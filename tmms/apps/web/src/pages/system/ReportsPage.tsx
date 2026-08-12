import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { BookOpen, Download, FileSpreadsheet, FileText, Calendar, Filter, BarChart3, AlertOctagon, Bus, ClipboardList, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ReportKey = 'violations' | 'vehicles' | 'franchises' | 'inspections';

const REPORT_TYPES = [
  {
    key: 'violations' as ReportKey,
    label: 'Traffic Violations Report',
    description: 'Summary of all traffic tickets issued, status, penalties, and revenue collected.',
    icon: <AlertOctagon size={24} />,
    color: '#ef4444',
    bg: '#fee2e2',
  },
  {
    key: 'vehicles' as ReportKey,
    label: 'PUV Fleet Report',
    description: 'Complete fleet status report including registration validity and inspection status.',
    icon: <Bus size={24} />,
    color: '#3a65ae',
    bg: '#eff6ff',
  },
  {
    key: 'franchises' as ReportKey,
    label: 'Franchise Status Report',
    description: 'Active, expiring, and expired franchise summary per operator and route.',
    icon: <ClipboardList size={24} />,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    key: 'inspections' as ReportKey,
    label: 'Inspection Summary Report',
    description: 'Results of vehicle inspections including passed, failed, and re-inspection cases.',
    icon: <Search size={24} />,
    color: '#7c3aed',
    bg: '#ede9fe',
  },
];

export function ReportsPage() {
  const [selected, setSelected] = useState<ReportKey>('violations');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [recordCounts, setRecordCounts] = useState<Record<ReportKey, number>>({ violations: 0, vehicles: 0, franchises: 0, inspections: 0 });

  const selectedReport = REPORT_TYPES.find(r => r.key === selected)!;

  // Initial load to get counts
  useEffect(() => {
    async function loadCounts() {
      try {
        const [v, veh, f, i] = await Promise.all([
          supabase.from('traffic_tickets').select('*', { count: 'exact', head: true }),
          supabase.from('vehicles').select('*', { count: 'exact', head: true }),
          supabase.from('franchises').select('*', { count: 'exact', head: true }),
          supabase.from('inspections').select('*', { count: 'exact', head: true }),
        ]);
        setRecordCounts({
          violations: v.count || 0,
          vehicles: veh.count || 0,
          franchises: f.count || 0,
          inspections: i.count || 0
        });
      } catch (err) {
        console.error('Failed to load counts:', err);
      }
    }
    loadCounts();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerated(false);
    
    try {
      let table = '';
      let dateField = 'created_at';
      if (selected === 'violations') { table = 'traffic_tickets'; dateField = 'incident_date'; }
      if (selected === 'vehicles') { table = 'vehicles'; dateField = 'created_at'; }
      if (selected === 'franchises') { table = 'franchises'; dateField = 'application_date'; }
      if (selected === 'inspections') { table = 'inspections'; dateField = 'scheduled_date'; }

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .gte(dateField, startDate)
        .lte(dateField, endDate);
        
      if (error) throw error;
      setReportData(data || []);
    } catch (err) {
      console.error('Failed to generate report:', err);
    }

    setGenerating(false);
    setGenerated(true);
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map(row => Object.values(row).map(v => `"${v ?? ''}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tmms_${selected}_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={20} color="#3a65ae" /> System Reports
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Generate, preview, and export official LGU transportation reports</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Report selector */}
        <div>
          <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Report</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REPORT_TYPES.map(rt => (
              <div key={rt.key} onClick={() => { setSelected(rt.key); setGenerated(false); }}
                style={{ padding: '12px 16px', borderRadius: 8, border: `1.5px solid ${selected === rt.key ? rt.color : '#e2e8f0'}`, background: selected === rt.key ? rt.bg : 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.2rem' }}>{rt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: selected === rt.key ? rt.color : '#1e293b' }}>{rt.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{recordCounts[rt.key]} records available</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report builder */}
        <div>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>{selectedReport.icon}</span> {selectedReport.label}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 20 }}>{selectedReport.description}</div>

            {/* Filters */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={13} /> Report Filters
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Date From</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.83rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Date To</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.83rem', outline: 'none' }} />
                </div>
              </div>
            </div>

            {/* Summary box */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ textAlign: 'center', padding: 14, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: selectedReport.color }}>{generated ? reportData.length : '-'}</div>
                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Total Records</div>
              </div>
              <div style={{ textAlign: 'center', padding: 14, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>{startDate.slice(0, 4)}</div>
                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Report Year</div>
              </div>
              <div style={{ textAlign: 'center', padding: 14, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3a65ae' }}>PDF/CSV</div>
                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Export Formats</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={15} /> {generating ? 'Generating...' : 'Generate Preview'}
              </button>
              <button className="btn btn-secondary" onClick={handleExportCSV}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileSpreadsheet size={15} /> Export CSV
              </button>
              <button className="btn btn-secondary" onClick={() => toast.info('PDF export requires backend integration.')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={15} /> Export PDF
              </button>
            </div>

            {/* Preview table */}
            {generated && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 10, padding: '6px 0', borderBottom: '2px solid #e2e8f0' }}>
                  📄 Report Preview — First 5 Records
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        {Object.keys(reportData[0] || {}).slice(0, 6).map(k => (
                          <th key={k} style={{ textTransform: 'capitalize', fontSize: '0.74rem' }}>{k.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).slice(0, 6).map((v: any, j) => (
                            <td key={j} style={{ fontSize: '0.78rem', color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {String(v ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 8, fontSize: '0.76rem', color: '#94a3b8' }}>Showing 5 of {reportData.length} records. Export to get the full dataset.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
