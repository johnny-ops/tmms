import { Wrench } from 'lucide-react';

interface UnderMaintenanceProps {
  title?: string;
  description?: string;
}

export function UnderMaintenance({ title = 'Under Maintenance', description = 'This module is currently under development and will be available soon.' }: UnderMaintenanceProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 480, textAlign: 'center', padding: 40
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
        border: '2px solid #fcd34d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24
      }}>
        <Wrench size={36} color="#d97706" />
      </div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        {title}
      </h2>
      <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: 420, lineHeight: 1.6 }}>
        {description}
      </p>
      <div style={{
        marginTop: 32, padding: '10px 20px',
        background: '#fef9ec', border: '1px solid #fde68a', borderRadius: 8,
        fontSize: '0.8rem', color: '#92400e', fontWeight: 500
      }}>
        🔧 Expected to be available in a future update
      </div>
    </div>
  );
}
