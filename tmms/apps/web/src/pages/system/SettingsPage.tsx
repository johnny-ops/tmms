import { Settings } from 'lucide-react';
import { UnderMaintenance } from '@/components/ui/UnderMaintenance';

export function SettingsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={20} color="#3a65ae" /> System Settings
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Application-wide configuration for AI thresholds, notifications, and maps
        </p>
      </div>
      <UnderMaintenance
        title="Settings — Under Maintenance"
        description="System settings are currently being redesigned with improved configuration management, role-based access controls, and database-backed persistence. This feature will be available soon."
      />
    </div>
  );
}
