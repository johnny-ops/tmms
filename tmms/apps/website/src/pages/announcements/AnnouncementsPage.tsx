import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Search, ChevronDown, ChevronUp, AlertTriangle, Info, RefreshCw, MapPin, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; icon: React.ReactNode }> = {
  EMERGENCY:    { label: 'Emergency',     bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: <AlertTriangle size={14} /> },
  ROUTE_CHANGE: { label: 'Route Change',  bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', icon: <MapPin size={14} /> },
  MAINTENANCE:  { label: 'Maintenance',   bg: '#fefce8', color: '#ca8a04', border: '#fde68a', icon: <RefreshCw size={14} /> },
  GENERAL:      { label: 'General',       bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: <Info size={14} /> },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.GENERAL;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function AnnouncementCard({ ann }: { ann: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: 'white',
        border: ann.type === 'EMERGENCY' ? '2px solid #fecaca' : '1.5px solid #e2e8f0',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: ann.type === 'EMERGENCY' ? '0 0 0 4px rgba(220,38,38,0.07)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ann.type === 'EMERGENCY' ? '0 0 0 4px rgba(220,38,38,0.07)' : '0 1px 4px rgba(0,0,0,0.04)'; }}
    >
      {/* EMERGENCY banner */}
      {ann.type === 'EMERGENCY' && (
        <div style={{ background: '#dc2626', color: 'white', padding: '6px 20px', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.06em' }}>
          <AlertTriangle size={12} /> URGENT — EMERGENCY ANNOUNCEMENT
        </div>
      )}

      {/* Clickable header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14,
        }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: TYPE_CONFIG[ann.type]?.bg ?? '#eff6ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: TYPE_CONFIG[ann.type]?.color ?? '#1d4ed8',
        }}>
          <Bell size={20} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
            <TypeBadge type={ann.type} />
            {ann.status === 'CLOSED' && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 20 }}>
                CLOSED
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: 4 }}>{ann.title}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} /> Posted: {formatDate(ann.created_at)}
            </span>
            {ann.start_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} /> Valid: {ann.start_date} – {ann.end_date}
              </span>
            )}
            {ann.vehicle_type && (
              <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '1px 7px', borderRadius: 20, fontWeight: 700, fontSize: '0.65rem' }}>
                {ann.vehicle_type}
              </span>
            )}
          </div>
        </div>

        <div style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && ann.description && (
        <div style={{
          padding: '0 20px 20px 78px',
          borderTop: '1px solid #f1f5f9',
          paddingTop: 16,
        }}>
          <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
            {ann.description}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      const { data } = await query;
      setAnnouncements(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = announcements.filter(a => {
    const matchStatus = showClosed ? true : a.status === 'OPEN';
    const matchType = typeFilter === 'ALL' || a.type === typeFilter;
    const matchSearch = !search
      || a.title?.toLowerCase().includes(search.toLowerCase())
      || a.description?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  const types = ['ALL', ...Array.from(new Set(announcements.map(a => a.type).filter(Boolean)))];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={22} color="#f59e0b" /> System Announcements
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Official announcements from the transport management authority
        </p>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search announcements..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: '0.74rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                background: typeFilter === t ? '#0f172a' : '#f1f5f9',
                color: typeFilter === t ? 'white' : '#475569',
              }}
            >
              {t === 'ALL' ? 'All Types' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Show closed toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />
          Show closed
        </label>
      </div>

      {/* Count */}
      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 14 }}>
        Showing {filtered.length} announcement{filtered.length !== 1 ? 's' : ''}
        {typeFilter !== 'ALL' && ` · ${typeFilter.replace('_', ' ')}`}
        {search && ` · matching "${search}"`}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <Bell size={40} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
          <div>Loading announcements...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <Bell size={40} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
          <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No announcements found</div>
          <div style={{ fontSize: '0.82rem' }}>Check back later or adjust your filters</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(ann => (
            <AnnouncementCard key={ann.id} ann={ann} />
          ))}
        </div>
      )}
    </div>
  );
}
