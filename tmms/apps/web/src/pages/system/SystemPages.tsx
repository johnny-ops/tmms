import { Eye, Bell } from 'lucide-react';
import { formatDateTime, getStatusBadgeClass } from '@/lib/utils';

export function NotificationsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={20} color="#3a65ae" /> Notifications
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>System alerts, reminders, and action items</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <Bell size={40} color="#cbd5e1" style={{ marginBottom: 16 }} />
        <p style={{ fontWeight: 600, color: '#1e293b' }}>No notifications yet</p>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>You will see your alerts and reminders here.</p>
      </div>
    </div>
  );
}

export function AuditLogsPage() {
  const MOCK_LOGS = [
    { id: '1', action: 'LOGIN', module: 'Auth', entity: 'User Session', user: 'admin@lgu-tmms.gov.ph', role: 'SUPER_ADMIN', timestamp: '2024-08-09T08:00:00Z' },
    { id: '2', action: 'APPROVE', module: 'Franchise', entity: 'Franchise', entity_id: 'FRNCH-2024-001', user: 'admin@lgu-tmms.gov.ph', role: 'SUPER_ADMIN', timestamp: '2024-08-09T08:30:00Z' },
    { id: '3', action: 'CREATE', module: 'Tickets', entity: 'Traffic Ticket', entity_id: 'TKT-2024-0001', user: 'admin@lgu-tmms.gov.ph', role: 'SUPER_ADMIN', timestamp: '2024-08-09T09:35:00Z' },
    { id: '4', action: 'AI_DETECTION', module: 'AI', entity: 'AI Detection', entity_id: 'aid-001', user: 'SYSTEM', role: 'SYSTEM', timestamp: '2024-08-09T10:05:00Z' },
    { id: '5', action: 'VERIFY', module: 'AI', entity: 'Violation Candidate', entity_id: 'aivc-001', user: 'admin@lgu-tmms.gov.ph', role: 'SUPER_ADMIN', timestamp: '2024-08-09T10:16:00Z' },
    { id: '6', action: 'UPDATE', module: 'PUV', entity: 'Vehicle', entity_id: 'veh-003', user: 'admin@lgu-tmms.gov.ph', role: 'SUPER_ADMIN', timestamp: '2024-08-09T11:00:00Z' },
  ];

  const actionColors: Record<string, string> = {
    LOGIN: '#3b82f6', LOGOUT: '#64748b', CREATE: '#22c55e', UPDATE: '#f59e0b',
    DELETE: '#ef4444', APPROVE: '#22c55e', REJECT: '#ef4444', VERIFY: '#8b5cf6',
    AI_DETECTION: '#7c3aed', TICKET_CREATED: '#dc2626'
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Eye size={20} color="#3a65ae" /> Audit Logs
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Append-only log of all administrative actions</p>
      </div>

      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
        padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#92400e'
      }}>
        ⚠️ Audit logs are read-only and cannot be modified or deleted by any user.
      </div>

      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Module</th>
              <th>Entity</th>
              <th>User</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_LOGS.map(log => (
              <tr key={log.id}>
                <td style={{ color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDateTime(log.timestamp)}</td>
                <td>
                  <span style={{
                    background: `${actionColors[log.action] ?? '#64748b'}18`,
                    color: actionColors[log.action] ?? '#64748b',
                    border: `1px solid ${actionColors[log.action] ?? '#64748b'}40`,
                    padding: '2px 8px', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{log.module}</td>
                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  {log.entity}{log.entity_id ? ` (${log.entity_id})` : ''}
                </td>
                <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{log.user}</td>
                <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlaceholderPage({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon} {title}
      </h1>
      <div style={{
        background: 'white', border: '2px dashed #e2e8f0', borderRadius: 12,
        padding: 60, textAlign: 'center', color: '#94a3b8', marginTop: 24
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: '0.8rem' }}>
          This module is under development. Coming in a future phase.
        </p>
        <span style={{ display: 'inline-block', marginTop: 12, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '2px 10px', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 600 }}>
          PLACEHOLDER
        </span>
      </div>
    </div>
  );
}
