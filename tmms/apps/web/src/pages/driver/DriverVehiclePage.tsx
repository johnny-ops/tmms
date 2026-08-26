import { useAuth } from '@/contexts/AuthContext';
import { Car, FileText, Calendar, Info } from 'lucide-react';
import { useTable } from '@/hooks/useSupabase';
import { formatDate, getStatusBadgeClass, formatStatus } from '@/lib/utils';

export function DriverVehiclePage() {
  const { user } = useAuth();
  
  // Find vehicle where driver_id matches
  const filter = user?.driver_id ? { column: 'driver_id', value: user.driver_id } : undefined;
  const { data: vehicles, loading } = useTable<any>('vehicles', [], { filter });
  
  // As a fallback for demo purposes, just get the first vehicle if none assigned
  const { data: allVehicles } = useTable<any>('vehicles');
  const vehicle = vehicles.length > 0 ? vehicles[0] : (allVehicles.length > 0 ? allVehicles[0] : null);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading vehicle data...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
          My Assigned Vehicle
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Details of the public utility vehicle currently assigned to you.
        </p>
      </div>

      {!vehicle ? (
        <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', padding: 48, textAlign: 'center' }}>
          <Car size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No Vehicle Assigned</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            You do not currently have a vehicle assigned to your profile. Please contact your operator or the LGU.
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#3b82f615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={24} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1 }}>
                  {vehicle.plate_number}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </div>
              </div>
            </div>
            <div>
              <span className={`badge ${getStatusBadgeClass(vehicle.status)}`} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                {formatStatus(vehicle.status)}
              </span>
            </div>
          </div>

          <div style={{ padding: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={16} color="#64748b" /> Vehicle Specifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Make & Model</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{vehicle.make} {vehicle.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Year Model</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{vehicle.year}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Capacity</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{vehicle.capacity} passengers</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Body Number</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{vehicle.body_number || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="#64748b" /> Registration Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Operator ID</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, fontFamily: 'monospace' }}>
                    {vehicle.operator_id?.slice(0, 8) || 'Unknown'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Registration Expiry</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} color="#64748b" />
                    {vehicle.registration_expiry ? formatDate(vehicle.registration_expiry) : 'N/A'}
                  </span>
                </div>
              </div>

              {vehicle.status === 'EXPIRED' && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', fontSize: '0.8rem' }}>
                  <strong>Vehicle Registration Expired</strong>
                  <p style={{ marginTop: 4 }}>This vehicle is not authorized for use on public roads.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
