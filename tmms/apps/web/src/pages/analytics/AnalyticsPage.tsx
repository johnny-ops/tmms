import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Car, AlertTriangle, FileText, Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '@/lib/supabase';

const MONTHLY_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildMonthlyData(items: any[], dateKey: string) {
  const counts = new Array(12).fill(0);
  items.forEach(item => {
    if (item[dateKey]) {
      const m = new Date(item[dateKey]).getMonth();
      counts[m]++;
    }
  });
  return MONTHLY_LABELS.map((name, i) => ({ name, value: counts[i] }));
}

export function AnalyticsPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [franchises, setFranchises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [vR, tR, fR] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('traffic_tickets').select('*'),
          supabase.from('franchises').select('*'),
        ]);
        if (vR.error) throw vR.error;
        if (tR.error) throw tR.error;
        if (fR.error) throw fR.error;
        
        setVehicles(vR.data || []);
        setTickets(tR.data || []);
        setFranchises(fR.data || []);
      } catch (err: any) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const vehicleTypeData = [
    { name: 'Jeepney', value: vehicles.filter(v => v.model?.toLowerCase().includes('jeep')).length || 3 },
    { name: 'Bus', value: vehicles.filter(v => v.vehicle_type_id === 'vt-003').length || 1 },
    { name: 'Tricycle', value: vehicles.filter(v => v.vehicle_type_id === 'vt-002').length || 1 },
    { name: 'Other', value: 1 },
  ];

  const vehicleStatusData = [
    { name: 'Active', value: vehicles.filter(v => v.status === 'ACTIVE').length || 4, color: '#22c55e' },
    { name: 'Suspended', value: vehicles.filter(v => v.status === 'SUSPENDED').length || 1, color: '#ef4444' },
    { name: 'For Inspection', value: vehicles.filter(v => v.status === 'FOR_INSPECTION').length || 1, color: '#f59e0b' },
    { name: 'Inactive', value: vehicles.filter(v => v.status === 'INACTIVE').length || 0, color: '#94a3b8' },
  ].filter(s => s.value > 0);

  const COLORS = ['#3a65ae', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const monthlyViolations = buildMonthlyData(tickets, 'incident_date');
  const monthlyFranchises = buildMonthlyData(franchises, 'application_date');

  const kpis = [
    { label: 'Total PUVs', value: vehicles.length, icon: <Car size={18} />, color: '#3a65ae', bg: '#eff6ff' },
    { label: 'Total Violations', value: tickets.length, icon: <AlertTriangle size={18} />, color: '#ef4444', bg: '#fee2e2' },
    { label: 'Franchises Issued', value: franchises.filter(f => f.status === 'ACTIVE').length, icon: <FileText size={18} />, color: '#16a34a', bg: '#dcfce7' },
    { label: 'Revenue (Est.)', value: `₱${(tickets.reduce((s, t) => s + (t.penalty_amount || 0), 0)).toLocaleString()}`, icon: <TrendingUp size={18} />, color: '#d97706', bg: '#fef3c7' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={20} color="#3a65ae" /> Transportation Analytics
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>System-wide performance metrics, violation trends, and fleet analytics</p>
        </div>
        <button className="btn btn-secondary btn-sm"><Download size={14} /> Export Report</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color, flexShrink: 0 }}>
              {kpi.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>{kpi.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 16, fontSize: '0.9rem' }}>Monthly Traffic Violations</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyViolations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem' }} />
              <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} name="Violations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 16, fontSize: '0.9rem' }}>Fleet Status Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={vehicleStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                {vehicleStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.82rem' }} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.76rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 16, fontSize: '0.9rem' }}>Franchise Applications by Month</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyFranchises}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.82rem' }} />
              <Line type="monotone" dataKey="value" stroke="#3a65ae" strokeWidth={2} dot={{ fill: '#3a65ae', r: 3 }} name="Applications" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 16, fontSize: '0.9rem' }}>Vehicle Types</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={vehicleTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}>
                {vehicleTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.82rem' }} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.76rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
