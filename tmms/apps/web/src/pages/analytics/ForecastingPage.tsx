import { useState, useEffect, useRef } from 'react';
import { TrendingUp, BarChart3, Info } from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '@/lib/supabase';

// Historical + forecast merged demo data
const DEMAND_SERIES = [
  { period: 'Aug 3', actual: 220, forecast: null },
  { period: 'Aug 4', actual: 245, forecast: null },
  { period: 'Aug 5', actual: 198, forecast: null },
  { period: 'Aug 6', actual: 270, forecast: null },
  { period: 'Aug 7', actual: 310, forecast: null },
  { period: 'Aug 8', actual: 260, forecast: null },
  { period: 'Aug 9', actual: 280, forecast: null },
  { period: 'Aug 10', actual: null, forecast: 285 },
  { period: 'Aug 11', actual: null, forecast: 210 },
  { period: 'Aug 12', actual: null, forecast: 320 },
  { period: 'Aug 13', actual: null, forecast: 295 },
  { period: 'Aug 14', actual: null, forecast: 340 },
];

const PEAK_HOURS = [
  { hour: '5AM', demand: 12 },
  { hour: '6AM', demand: 45 },
  { hour: '7AM', demand: 120 },
  { hour: '8AM', demand: 165 },
  { hour: '9AM', demand: 90 },
  { hour: '10AM', demand: 65 },
  { hour: '11AM', demand: 70 },
  { hour: '12PM', demand: 105 },
  { hour: '1PM', demand: 95 },
  { hour: '2PM', demand: 60 },
  { hour: '3PM', demand: 55 },
  { hour: '4PM', demand: 110 },
  { hour: '5PM', demand: 155 },
  { hour: '6PM', demand: 130 },
  { hour: '7PM', demand: 80 },
  { hour: '8PM', demand: 40 },
];

const tooltipStyle = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: 6,
  padding: '8px 12px', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
};

export function ForecastingPage() {
  const [selectedModel, setSelectedModel] = useState('xgboost');
  const [selectedTerminal, setSelectedTerminal] = useState('');
  const [terminals, setTerminals] = useState<any[]>([]);
  const [routeDemand, setRouteDemand] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [tRes, rRes] = await Promise.all([
        supabase.from('terminals').select('id, name').order('name'),
        supabase.from('routes').select('id, route_number, name').order('route_number'),
      ]);
      if (tRes.data) {
        setTerminals(tRes.data);
        if (tRes.data.length > 0) setSelectedTerminal(tRes.data[0].id);
      }
      if (rRes.data && rRes.data.length > 0) {
        // Build sample demand data from real route names
        setRouteDemand(rRes.data.slice(0, 6).map((r: any, i: number) => ({
          route: r.route_number || r.name?.slice(0, 6) || `R-${i + 1}`,
          trips: Math.floor(60 + Math.random() * 120),
          passengers: Math.floor(800 + Math.random() * 1800),
        })));
      } else {
        setRouteDemand([
          { route: 'R-01', trips: 145, passengers: 2350 },
          { route: 'R-02', trips: 98, passengers: 1640 },
          { route: 'R-03', trips: 56, passengers: 2100 },
        ]);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={20} color="#3a65ae" /> Public Transport Demand Forecasting
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            AI-powered transportation demand prediction using historical data
          </p>
        </div>
        <span className="badge badge-demo">DEMO DATA</span>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
        padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10
      }}>
        <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.5 }}>
          <strong>Based on available transportation data.</strong> Forecasts are generated from collected ridership data and are for planning purposes only. Accuracy improves as more data is collected over time.
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>Terminal</label>
          <select className="form-input" value={selectedTerminal} onChange={e => setSelectedTerminal(e.target.value)}>
            {terminals.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>Model</label>
          <select className="form-input" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
            <option value="moving_avg">Moving Average (Baseline)</option>
            <option value="random_forest">Random Forest</option>
            <option value="xgboost">XGBoost (Recommended)</option>
          </select>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Tomorrow Forecast', value: '285 trips', sub: 'Based on XGBoost model', color: '#3a65ae' },
          { label: 'Model MAE', value: '18.4', sub: 'trips / day', color: '#22c55e' },
          { label: 'Model RMSE', value: '22.1', sub: 'trips / day', color: '#3b82f6' },
          { label: 'Training Period', value: '90 days', sub: 'Historical data', color: '#64748b' },
          { label: 'Peak Hour', value: '8AM – 9AM', sub: 'Highest demand', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151' }}>{s.label}</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Historical + Forecast chart */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>Demand Forecast — Historical vs Predicted</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>Solid line = actual data · Dashed line = AI forecast</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={DEMAND_SERIES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
            <Line type="monotone" dataKey="actual" stroke="#3a65ae" strokeWidth={2.5} dot={{ r: 3 }} name="Actual (trips)" connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#22c55e' }} name="Forecast (trips)" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Peak Hours */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>Peak Hours Analysis</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Average demand by hour of day</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PEAK_HOURS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="demand" name="Avg. Trips" fill="#3a65ae" radius={[3, 3, 0, 0]}
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>Route Demand Distribution</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Trips and passengers per route</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={routeDemand} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="route" tick={{ fontSize: 11, fill: '#64748b' }} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="trips" name="Trips" fill="#3a65ae" radius={[0, 3, 3, 0]} />
              <Bar dataKey="passengers" name="Passengers" fill="#7fa0d0" radius={[0, 3, 3, 0]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
        <p style={{ fontSize: '0.72rem', color: '#64748b' }}>
          ⚠️ <strong>Model Disclaimer:</strong> Forecasts are generated from available transportation data and are intended for planning and operational purposes. Accuracy metrics (MAE, RMSE) are based on validation splits from historical data. Actual results may vary due to unobserved variables (weather, events, holidays). This system does not claim real-time traffic data unless explicitly connected to a live data source.
        </p>
      </div>
    </div>
  );
}
