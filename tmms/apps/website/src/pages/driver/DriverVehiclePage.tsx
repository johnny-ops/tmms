import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Car, FileText, Calendar, Building2, MapPin, Loader2, CheckCircle, ChevronDown, Navigation, Clock, Gauge, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function DriverVehiclePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<any>(null); // driver_assignments row
  const [routes, setRoutes] = useState<any[]>([]);
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeSaved, setRouteSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [savedGpsRoutes, setSavedGpsRoutes] = useState<any[]>([]);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadData();
      loadSavedGpsRoutes();
    }
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Find the driver record
      let driverId = user?.driver_id;
      if (!driverId) {
        const { data: dr } = await supabase
          .from('drivers')
          .select('id')
          .eq('profile_id', user?.id)
          .maybeSingle();
        driverId = dr?.id;
      }

      if (!driverId) { setLoading(false); return; }

      // 2. Load driver_assignment with related operator, vehicle, and route
      const { data: asgn } = await supabase
        .from('driver_assignments')
        .select(`
          *,
          operator:operators(
            id,
            full_name,
            organization,
            contact_number
          ),
          unit:vehicles(*),
          route:routes(*)
        `)
        .eq('driver_id', driverId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      setAssignment(asgn || null);
      setSelectedRouteId(asgn?.route_id || '');

      // 3. Load all available routes
      const { data: rts } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setRoutes(rts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRoute() {
    if (!assignment?.id) return;
    setSavingRoute(true);
    setRouteSaved(false);
    setSaveError('');
    try {
      const routeIdValue = selectedRouteId || null;

      // Try updating by assignment id first
      const { data, error } = await supabase
        .from('driver_assignments')
        .update({ route_id: routeIdValue })
        .eq('id', assignment.id)
        .select('id, route_id');

      if (error) throw error;

      // If RLS blocked the update, data will be empty array (0 rows affected)
      if (!data || data.length === 0) {
        // Fallback: try updating by driver_id directly
        const { error: err2 } = await supabase
          .from('driver_assignments')
          .update({ route_id: routeIdValue })
          .eq('driver_id', assignment.driver_id)
          .eq('status', 'ACTIVE');
        if (err2) throw err2;
      }

      setRouteSaved(true);
      await loadData();
      setTimeout(() => setRouteSaved(false), 3000);
    } catch (err: any) {
      console.error('Save route error:', err);
      setSaveError(err?.message || 'Failed to save route. Check your database permissions.');
    } finally {
      setSavingRoute(false);
    }
  }

  async function loadSavedGpsRoutes() {
    try {
      // Get driver id first
      let driverId = user?.driver_id;
      if (!driverId) {
        const { data: dr } = await supabase
          .from('drivers')
          .select('id')
          .eq('profile_id', user?.id)
          .maybeSingle();
        driverId = dr?.id;
      }
      if (!driverId) return;

      const { data } = await supabase
        .from('driver_saved_routes')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(10);

      setSavedGpsRoutes(data || []);
    } catch (err) {
      console.error('Failed to load saved GPS routes:', err);
    }
  }

  async function deleteGpsRoute(id: string) {
    setDeletingRouteId(id);
    try {
      await supabase.from('driver_saved_routes').delete().eq('id', id);
      setSavedGpsRoutes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete route:', err);
    } finally {
      setDeletingRouteId(null);
    }
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}min`;
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
        <Loader2 size={32} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
        <div>Loading assignment details...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const vehicle = assignment?.unit;
  const operator = assignment?.operator;
  const currentRoute = assignment?.route;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #f1f5f9' }}>
      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
          My Assignment
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Your operator, assigned vehicle, and current route details.
        </p>
      </div>

      {!assignment ? (
        <div style={{ background: 'white', borderRadius: 12, border: '2px dashed #e2e8f0', padding: 60, textAlign: 'center' }}>
          <Car size={52} color="#cbd5e1" style={{ margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>No Active Assignment</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto' }}>
            You are not currently assigned to any operator fleet. Apply to an operator from the Driver Applications page.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Operator Card */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>My Operator</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>The fleet owner you are assigned to</div>
              </div>
            </div>
            <div style={{ padding: '8px 20px 16px' }}>
              {operator ? (
                <>
                  <InfoRow label="Business Name" value={operator.organization || '—'} />
                  <InfoRow label="Owner Name" value={operator.full_name || '—'} />
                  <InfoRow label="Contact Number" value={operator.contact_number || '—'} />
                </>
              ) : (
                <div style={{ padding: '16px 0', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
                  Operator details not available.
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Card */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={18} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Assigned Vehicle</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>The PUV you are driving</div>
                </div>
              </div>
              {vehicle && (
                <span className={`badge ${getStatusBadgeClass(vehicle.status)}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                  {formatStatus(vehicle.status)}
                </span>
              )}
            </div>

            {!vehicle ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                <Car size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4 }}>No vehicle assigned yet</div>
                <div style={{ fontSize: '0.8rem' }}>Your operator will assign you a vehicle. Check back soon.</div>
              </div>
            ) : (
              <div style={{ padding: '8px 20px 16px' }}>
                {/* Big plate number display */}
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 20px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 4 }}>PLATE NUMBER</div>
                    <code style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.06em', lineHeight: 1 }}>{vehicle.plate_number}</code>
                  </div>
                  <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 16 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 4 }}>BODY NO.</div>
                    <code style={{ fontSize: '1.4rem', fontWeight: 700, color: '#475569' }}>{vehicle.body_number || '—'}</code>
                  </div>
                </div>
                <InfoRow label="Make & Model" value={`${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim()} />
                <InfoRow label="Capacity" value={`${vehicle.capacity} passengers`} />
                <InfoRow
                  label="Registration Expiry"
                  value={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} color="#64748b" />
                      {vehicle.registration_expiry ? formatDate(vehicle.registration_expiry) : 'N/A'}
                    </span>
                  }
                />
              </div>
            )}
          </div>

          {/* Route Card */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={18} color="#a855f7" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>My Route</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Select the route you are currently running — visible to your operator</div>
              </div>
              {currentRoute && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', padding: '3px 10px', borderRadius: 6 }}>
                  {currentRoute.route_code}
                </span>
              )}
            </div>
            <div style={{ padding: 20 }}>
              {currentRoute && (
                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MapPin size={16} color="#a855f7" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#6b21a8', fontSize: '0.9rem' }}>{currentRoute.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#7c3aed', marginTop: 2 }}>
                      {currentRoute.origin} → {currentRoute.destination}
                    </div>
                  </div>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                {currentRoute ? 'Change Route' : 'Select Your Current Route'}
              </label>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <select
                  value={selectedRouteId}
                  onChange={e => { setSelectedRouteId(e.target.value); setRouteSaved(false); }}
                  style={{
                    width: '100%', padding: '10px 36px 10px 14px',
                    borderRadius: 8, border: '1.5px solid #e2e8f0',
                    fontSize: '0.875rem', background: 'white', color: '#0f172a',
                    outline: 'none', appearance: 'none', cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">— No route selected —</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.route_code}] {r.name} ({r.origin} → {r.destination})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="#94a3b8" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
              {saveError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '0.82rem', color: '#dc2626', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠</span>
                  <span>{saveError}</span>
                </div>
              )}
              <button
                onClick={handleSaveRoute}
                disabled={savingRoute}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                  background: routeSaved ? '#16a34a' : saveError ? '#dc2626' : '#7c3aed',
                  color: 'white', fontSize: '0.875rem', fontWeight: 700,
                  cursor: savingRoute ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                {savingRoute ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                ) : routeSaved ? (
                  <><CheckCircle size={16} /> Route Saved! Operator can now see this.</>
                ) : (
                  <><MapPin size={16} /> Save Route</>
                )}
              </button>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
                Your operator will see your selected route in real time on their Assigned Drivers dashboard.
              </p>
            </div>
          </div>

          {/* Documents */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="#ea580c" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Assignment Info</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Your assignment record details</div>
              </div>
            </div>
            <div style={{ padding: '8px 20px 16px' }}>
              <InfoRow label="Assignment Status" value={
                <span className={`badge ${getStatusBadgeClass(assignment.status)}`} style={{ fontSize: '0.72rem' }}>
                  {formatStatus(assignment.status)}
                </span>
              } />
              <InfoRow label="Assigned Since" value={assignment.assigned_at ? formatDate(assignment.assigned_at) : '—'} />
            </div>
          </div>

          {/* Saved GPS Routes Card */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Navigation size={18} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>My Saved GPS Routes</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Routes saved from the Route Optimization tool</div>
                </div>
              </div>
              <a
                href="/driver/routing"
                style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600, textDecoration: 'none', background: '#eff6ff', padding: '5px 12px', borderRadius: 6 }}
              >
                + Plan New Route
              </a>
            </div>
            <div style={{ padding: '12px 20px 16px' }}>
              {savedGpsRoutes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                  <Navigation size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                  <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4 }}>No saved GPS routes yet</div>
                  <div style={{ fontSize: '0.8rem' }}>Use the Route Optimization tool to plan and save your GPS routes.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {savedGpsRoutes.map((route, i) => (
                    <div
                      key={route.id}
                      style={{
                        background: i === 0 ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${i === 0 ? '#bfdbfe' : '#e2e8f0'}`,
                        borderRadius: 10,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          {i === 0 && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#3b82f6', color: 'white', padding: '1px 7px', borderRadius: 10 }}>LATEST</span>
                          )}
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {route.start_location.length > 35 ? route.start_location.substring(0, 35) + '...' : route.start_location}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
                          → {route.end_location.length > 40 ? route.end_location.substring(0, 40) + '...' : route.end_location}
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#64748b' }}>
                            <Gauge size={11} /> {parseFloat(route.distance_km).toFixed(1)} km
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#64748b' }}>
                            <Clock size={11} /> {formatDuration(parseFloat(route.duration_mins))}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {new Date(route.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteGpsRoute(route.id)}
                        disabled={deletingRouteId === route.id}
                        title="Delete this saved route"
                        style={{ flexShrink: 0, background: 'none', border: '1px solid #fecaca', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                      >
                        {deletingRouteId === route.id
                          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
