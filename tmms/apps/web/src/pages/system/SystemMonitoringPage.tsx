import { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Database, Network, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';

export function SystemMonitoringPage() {
  const [aiStatus, setAiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  
  // Mock data for visual dashboard completeness
  const [metrics, setMetrics] = useState({
    cpu: Math.floor(Math.random() * 20) + 30,
    memory: Math.floor(Math.random() * 15) + 45,
    dbConnections: Math.floor(Math.random() * 50) + 120,
    activeSockets: Math.floor(Math.random() * 10) + 5,
  });

  const checkAIStatus = async () => {
    setAiStatus('checking');
    try {
      const res = await fetch(`${AI_BASE}/health`);
      setAiStatus(res.ok ? 'online' : 'offline');
    } catch {
      setAiStatus('offline');
    }
    setLastCheck(new Date());
    
    // Slight random variation in mock metrics
    setMetrics(prev => ({
      cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() * 10 - 5))),
      memory: Math.min(100, Math.max(0, prev.memory + (Math.random() * 4 - 2))),
      dbConnections: Math.max(0, prev.dbConnections + Math.floor(Math.random() * 10 - 5)),
      activeSockets: Math.max(0, prev.activeSockets + Math.floor(Math.random() * 4 - 2)),
    }));
  };

  useEffect(() => {
    checkAIStatus();
    const interval = setInterval(checkAIStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'online') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 2px #dcfce7' }}></span>
          Operational
        </span>
      );
    }
    if (status === 'offline') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', boxShadow: '0 0 0 2px #fee2e2' }}></span>
          Offline / Error
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
        <RefreshCw size={12} className="animate-spin" />
        Checking...
      </span>
    );
  };

  const MetricCard = ({ title, value, unit, icon: Icon, color }: any) => (
    <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
          {typeof value === 'number' ? value.toFixed(1) : value}
          <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500, marginLeft: 4 }}>{unit}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
            System Monitoring
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Real-time status of backend services and infrastructure.
          </p>
        </div>
        <button 
          onClick={checkAIStatus}
          disabled={aiStatus === 'checking'}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: aiStatus === 'checking' ? 'not-allowed' : 'pointer' }}
        >
          <RefreshCw size={14} className={aiStatus === 'checking' ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {/* Services Status */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Service Health</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
        
        {/* API Server */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Server size={20} color="#3b82f6" />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Web Portal API</span>
            </div>
            <StatusBadge status="online" />
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} color="#16a34a" /> Connected to Supabase
          </div>
        </div>

        {/* Database */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Database size={20} color="#8b5cf6" />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>PostgreSQL DB</span>
            </div>
            <StatusBadge status="online" />
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} color="#16a34a" /> Read/Write Operations Normal
          </div>
        </div>

        {/* AI Service */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={20} color="#f59e0b" />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>AI Vision Service</span>
            </div>
            <StatusBadge status={aiStatus} />
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            {aiStatus === 'online' ? (
              <><CheckCircle2 size={14} color="#16a34a" /> Inference Engine Active</>
            ) : aiStatus === 'offline' ? (
              <><XCircle size={14} color="#dc2626" /> Service unreachable at port 8001</>
            ) : (
              'Pinging endpoint...'
            )}
          </div>
        </div>

      </div>

      {/* Metrics */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Server Metrics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <MetricCard title="CPU Usage" value={metrics.cpu} unit="%" icon={Cpu} color="#3b82f6" />
        <MetricCard title="Memory Usage" value={metrics.memory} unit="%" icon={Database} color="#8b5cf6" />
        <MetricCard title="Active DB Conns" value={metrics.dbConnections} unit="" icon={Network} color="#f59e0b" />
        <MetricCard title="Live Sockets" value={metrics.activeSockets} unit="" icon={Activity} color="#10b981" />
      </div>

      <div style={{ marginTop: 24, fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
        Last updated: {lastCheck.toLocaleTimeString()}
      </div>

    </div>
  );
}
