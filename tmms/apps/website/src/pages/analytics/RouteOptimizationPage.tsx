import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Clock, Gauge, RotateCcw, Loader, AlertTriangle, MousePointerClick, Flag, Circle } from 'lucide-react';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface LatLng { lat: number; lng: number; label?: string; }
interface Route { coordinates: [number, number][]; distance: number; duration: number; color: string; label: string; }

function MapClickHandler({ onClickStart, onClickEnd, mode }: { onClickStart: (p: LatLng) => void; onClickEnd: (p: LatLng) => void; mode: 'start' | 'end' | null }) {
  useMapEvents({
    click(e) {
      if (mode === 'start') onClickStart({ lat: e.latlng.lat, lng: e.latlng.lng });
      else if (mode === 'end') onClickEnd({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

async function geocode(query: string): Promise<LatLng | null> {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ph`);
  const data = await res.json();
  if (data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
}

async function searchPlaces(query: string): Promise<LatLng[]> {
  if (!query || query.length < 3) return [];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ph`);
    const data = await res.json();
    return data.map((d: any) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), label: d.display_name }));
  } catch (err) {
    return [];
  }
}

async function getRoute(start: LatLng, end: LatLng): Promise<Route[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) throw new Error('No route found.');

  const colors = ['#3b82f6', '#f59e0b', '#22c55e'];
  return data.routes.slice(0, 3).map((r: any, i: number) => ({
    coordinates: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
    distance: r.distance / 1000,
    duration: r.duration / 60,
    color: colors[i] || '#94a3b8',
    label: i === 0 ? 'Fastest Route' : i === 1 ? 'Alternative 1' : 'Alternative 2',
  }));
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}min`;
}

export function RouteOptimizationPage() {
  const { user } = useAuth();
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [endPoint, setEndPoint] = useState<LatLng | null>(null);
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [clickMode, setClickMode] = useState<'start' | 'end' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [mapCenter] = useState<[number, number]>([7.0647, 125.6083]); // Davao City default
  const mapRef = useRef<any>(null);

  const [startSuggestions, setStartSuggestions] = useState<LatLng[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<LatLng[]>([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const startTimeoutRef = useRef<any>(null);
  const endTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (user?.id) loadAssignedRoute();
  }, [user]);

  async function loadAssignedRoute() {
    try {
      const { data: dr } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      if (!dr) return;

      const { data: asgn } = await supabase
        .from('driver_assignments')
        .select('route:routes(origin, destination)')
        .eq('driver_id', dr.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (asgn?.route) {
        const r = Array.isArray(asgn.route) ? asgn.route[0] : asgn.route;
        if (r) {
          setStartQuery(r.origin);
          setEndQuery(r.destination);
        }
      }
    } catch (err) {
      console.error('Failed to load assigned route:', err);
    }
  }

  const handleStartQueryChange = (val: string) => {
    setStartQuery(val);
    setStartPoint(null);
    if (!val) { setStartSuggestions([]); setShowStartSuggestions(false); return; }
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    startTimeoutRef.current = setTimeout(async () => {
      const results = await searchPlaces(val);
      setStartSuggestions(results);
      setShowStartSuggestions(true);
    }, 400);
  };

  const handleEndQueryChange = (val: string) => {
    setEndQuery(val);
    setEndPoint(null);
    if (!val) { setEndSuggestions([]); setShowEndSuggestions(false); return; }
    if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    endTimeoutRef.current = setTimeout(async () => {
      const results = await searchPlaces(val);
      setEndSuggestions(results);
      setShowEndSuggestions(true);
    }, 400);
  };

  const selectStartSuggestion = (p: LatLng) => {
    setStartPoint(p);
    setStartQuery(p.label || '');
    setShowStartSuggestions(false);
    if (mapRef.current) mapRef.current.setView([p.lat, p.lng], 14);
  };

  const selectEndSuggestion = (p: LatLng) => {
    setEndPoint(p);
    setEndQuery(p.label || '');
    setShowEndSuggestions(false);
    if (mapRef.current) mapRef.current.setView([p.lat, p.lng], 14);
  };

  async function handleSearch() {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      let s = startPoint, e = endPoint;
      if (startQuery && !startPoint) {
        s = await geocode(startQuery);
        if (!s) throw new Error('Start location not found. Try a more specific address.');
        setStartPoint(s);
      }
      if (endQuery && !endPoint) {
        e = await geocode(endQuery);
        if (!e) throw new Error('Destination not found. Try a more specific address.');
        setEndPoint(e);
      }
      if (!s || !e) throw new Error('Please set both start and destination.');

      const foundRoutes = await getRoute(s, e);
      setRoutes(foundRoutes);
      setSelectedRoute(0);

      // Fit map to route
      if (mapRef.current && foundRoutes[0]?.coordinates.length > 0) {
        const bounds = L.latLngBounds(foundRoutes[0].coordinates.map(c => [c[0], c[1]]));
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get route.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStartPoint(null);
    setEndPoint(null);
    setStartQuery('');
    setEndQuery('');
    setRoutes([]);
    setError('');
    setSuccess('');
    setClickMode(null);
  }

  async function saveRoute() {
    if (!activeRoute || !user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // 1. Get the driver ID for this user
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();
        
      if (driverError || !driverData) {
        throw new Error('Only registered drivers can save routes.');
      }

      // 2. Insert into driver_saved_routes
      const { error: saveError } = await supabase
        .from('driver_saved_routes')
        .insert({
          driver_id: driverData.id,
          start_location: startQuery || 'Unknown Start',
          end_location: endQuery || 'Unknown Destination',
          distance_km: activeRoute.distance,
          duration_mins: activeRoute.duration,
          route_geometry: { coordinates: activeRoute.coordinates }
        });

      if (saveError) throw saveError;
      
      setSuccess('Route saved successfully!');
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save route.');
    } finally {
      setSaving(false);
    }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(pos => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'My Location' };
      setStartPoint(p);
      setStartQuery('My Current Location');
      setLoading(false);
      if (mapRef.current) mapRef.current.setView([p.lat, p.lng], 14);
    }, () => {
      setError('Could not get your location.');
      setLoading(false);
    });
  }

  const activeRoute = routes[selectedRoute];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Navigation size={20} color="#1d4ed8" /> Route Optimization
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Plan your PUV route with real-time OpenStreetMap routing.</p>
        <div style={{ marginTop: 8 }}>
          <button 
            onClick={() => window.location.href = '/driver/vehicle'}
            style={{ fontSize: '0.8rem', color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, textDecoration: 'underline' }}
          >
            ← Change assigned route in My Vehicle
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          {/* Input panel */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                <Circle size={10} style={{ display: 'inline-block', marginRight: 4, fill: '#22c55e' }} /> Starting Point
              </label>
              <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                <input
                  value={startQuery}
                  onChange={e => handleStartQueryChange(e.target.value)}
                  onFocus={() => { if (startSuggestions.length > 0) setShowStartSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowStartSuggestions(false), 200)}
                  placeholder="Enter start location..."
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${clickMode === 'start' ? '#22c55e' : '#e2e8f0'}`, fontSize: '0.82rem', outline: 'none' }}
                />
                {showStartSuggestions && startSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 38, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    {startSuggestions.map((s, i) => (
                      <div key={i} onClick={() => selectStartSuggestion(s)} style={{ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', borderBottom: i < startSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none', color: '#1e293b' }}>
                        {s.label}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setClickMode(clickMode === 'start' ? null : 'start')}
                  title="Click on map"
                  style={{ padding: '0 10px', borderRadius: 8, border: `1.5px solid ${clickMode === 'start' ? '#22c55e' : '#e2e8f0'}`, background: clickMode === 'start' ? '#f0fdf4' : 'white', cursor: 'pointer', color: '#22c55e' }}
                >
                  <MapPin size={16} />
                </button>
              </div>
              <button onClick={useCurrentLocation} style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 600, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Navigation size={14} /> Use my current location
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                <Flag size={10} style={{ display: 'inline-block', marginRight: 4, fill: '#ef4444' }} /> Destination
              </label>
              <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                <input
                  value={endQuery}
                  onChange={e => handleEndQueryChange(e.target.value)}
                  onFocus={() => { if (endSuggestions.length > 0) setShowEndSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowEndSuggestions(false), 200)}
                  placeholder="Enter destination..."
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${clickMode === 'end' ? '#ef4444' : '#e2e8f0'}`, fontSize: '0.82rem', outline: 'none' }}
                />
                {showEndSuggestions && endSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 38, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    {endSuggestions.map((s, i) => (
                      <div key={i} onClick={() => selectEndSuggestion(s)} style={{ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', borderBottom: i < endSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none', color: '#1e293b' }}>
                        {s.label}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setClickMode(clickMode === 'end' ? null : 'end')}
                  title="Click on map"
                  style={{ padding: '0 10px', borderRadius: 8, border: `1.5px solid ${clickMode === 'end' ? '#ef4444' : '#e2e8f0'}`, background: clickMode === 'end' ? '#fef2f2' : 'white', cursor: 'pointer', color: '#ef4444' }}
                >
                  <MapPin size={16} />
                </button>
              </div>
            </div>

            {clickMode && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '0.78rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MousePointerClick size={14} /> Click on the map to set {clickMode === 'start' ? 'starting point' : 'destination'}
              </div>
            )}

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '0.78rem', color: '#dc2626', display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertTriangle size={13} /> {error}
              </div>
            )}

            {success && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '0.78rem', color: '#166534', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Circle size={13} style={{ fill: '#22c55e', color: 'white' }} /> {success}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleReset} style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                <RotateCcw size={13} /> Reset
              </button>
              <button
                onClick={handleSearch}
                disabled={loading || (!startPoint && !startQuery) || (!endPoint && !endQuery)}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: loading ? '#93c5fd' : '#1d4ed8', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {loading ? <><Loader size={14} className="animate-spin" /> Finding Routes...</> : <><Navigation size={14} /> Get Route</>}
              </button>
            </div>
          </div>

          {/* Route results */}
          {routes.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, fontSize: '0.9rem' }}>Routes Found</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {routes.map((route, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedRoute(i)}
                    style={{
                      padding: '12px 14px', borderRadius: 10, border: `2px solid ${selectedRoute === i ? route.color : '#e2e8f0'}`,
                      background: selectedRoute === i ? `${route.color}10` : 'white',
                      cursor: 'pointer', textAlign: 'left', width: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: route.color, fontSize: '0.82rem' }}>
                        {i === 0 && '⭐ '}{route.label}
                      </span>
                      {i === 0 && <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>RECOMMENDED</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#64748b' }}>
                        <Gauge size={13} /> {route.distance.toFixed(1)} km
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#64748b' }}>
                        <Clock size={13} /> {formatDuration(route.duration)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {activeRoute && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', marginBottom: 8 }}>SELECTED ROUTE SUMMARY</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      ['Distance', `${activeRoute.distance.toFixed(2)} km`],
                      ['Est. Time', formatDuration(activeRoute.duration)],
                      ['Avg. Speed', `${((activeRoute.distance / activeRoute.duration) * 60).toFixed(0)} km/h`],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{l}</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={saveRoute}
                    disabled={saving}
                    style={{ 
                      marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, border: 'none', 
                      background: saving ? '#d1d5db' : '#059669', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', 
                      fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 
                    }}
                  >
                    {saving ? <><Loader size={14} className="animate-spin" /> Saving...</> : 'Save Route'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapClickHandler
              mode={clickMode}
              onClickStart={p => { setStartPoint(p); setStartQuery(`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`); setClickMode(null); }}
              onClickEnd={p => { setEndPoint(p); setEndQuery(`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`); setClickMode(null); }}
            />
            {startPoint && <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}><Popup><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> Start: {startPoint.label || startQuery}</div></Popup></Marker>}
            {endPoint && <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}><Popup><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Flag size={14} /> Destination: {endPoint.label || endQuery}</div></Popup></Marker>}
            {routes.map((route, i) => (
              <Polyline
                key={i}
                positions={route.coordinates}
                color={route.color}
                weight={i === selectedRoute ? 6 : 3}
                opacity={i === selectedRoute ? 0.9 : 0.3}
                eventHandlers={{ click: () => setSelectedRoute(i) }}
              />
            ))}
          </MapContainer>
          {clickMode && (
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.85)', color: 'white', padding: '8px 16px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600, zIndex: 1000, pointerEvents: 'none' }}>
              <MousePointerClick size={14} style={{ display: 'inline-block', marginRight: 6 }} /> Click on the map to set {clickMode === 'start' ? 'starting point' : 'destination'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
