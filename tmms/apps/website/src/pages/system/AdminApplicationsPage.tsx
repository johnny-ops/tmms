import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Clock, Filter, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type AppStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export function AdminApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AppStatus | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const { data } = await supabase
      .from('driver_applications')
      .select('*, driver:drivers(*), operator:operators(*)')
      .order('created_at', { ascending: false });
    setApplications(data || []);
    setLoading(false);
  }

  const statusConfig = {
    PENDING: { icon: <Clock size={14} />, color: '#d97706', bg: '#fffbeb', label: 'Pending' },
    ACCEPTED: { icon: <CheckCircle size={14} />, color: '#059669', bg: '#ecfdf5', label: 'Accepted' },
    REJECTED: { icon: <XCircle size={14} />, color: '#dc2626', bg: '#fef2f2', label: 'Rejected' },
    CANCELLED: { icon: <XCircle size={14} />, color: '#94a3b8', bg: '#f8fafc', label: 'Cancelled' },
  };

  const filtered = filter === 'ALL' ? applications : applications.filter(a => a.status === filter);
  const counts = {
    ALL: applications.length,
    PENDING: applications.filter(a => a.status === 'PENDING').length,
    ACCEPTED: applications.filter(a => a.status === 'ACCEPTED').length,
    REJECTED: applications.filter(a => a.status === 'REJECTED').length,
    CANCELLED: applications.filter(a => a.status === 'CANCELLED').length,
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={20} color="#1d4ed8" /> Driver Applications
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>System-wide overview of all driver applications.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: counts.ALL, color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Pending', value: counts.PENDING, color: '#d97706', bg: '#fffbeb' },
          { label: 'Accepted', value: counts.ACCEPTED, color: '#059669', bg: '#ecfdf5' },
          { label: 'Rejected', value: counts.REJECTED, color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filter === f ? '#1d4ed8' : '#e2e8f0'}`,
            background: filter === f ? '#eff6ff' : 'white', color: filter === f ? '#1d4ed8' : '#64748b',
            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600
          }}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading applications...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No applications found.</div>
          ) : filtered.map((app, idx) => {
            const sc = statusConfig[app.status as AppStatus];
            const driver = app.driver;
            const operator = app.operator;
            const isExpanded = expandedId === app.id;
            return (
              <div key={app.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', gap: 16, flex: 1, minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginBottom: 2 }}>{driver?.full_name || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        → {operator?.full_name || 'Unknown Operator'} · {formatDate(app.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontSize: '0.72rem', fontWeight: 700 }}>
                      {sc.icon} {sc.label}
                    </span>
                    {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: '0 20px 16px', borderTop: '1px solid #f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#f8fafc', borderRadius: 8, padding: 16 }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>DRIVER INFO</div>
                        <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>{driver?.full_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>License: {driver?.license_number}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Phone: {driver?.contact_number}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>OPERATOR INFO</div>
                        <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>{operator?.full_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{operator?.organization}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{operator?.email}</div>
                      </div>
                      {app.message && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>DRIVER MESSAGE</div>
                          <div style={{ fontSize: '0.82rem', color: '#475569', fontStyle: 'italic' }}>"{app.message}"</div>
                        </div>
                      )}
                      {app.operator_notes && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>OPERATOR NOTES</div>
                          <div style={{ fontSize: '0.82rem', color: '#475569' }}>{app.operator_notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
