import { useState, useEffect } from 'react';
import { Users, Plus, Search, Eye, Edit, Shield } from 'lucide-react';
import { roleLabel, getStatusBadgeClass, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = users.filter(u =>
    !search || (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={20} color="#3a65ae" /> User Management
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage system users and their role assignments</p>
        </div>
        <button className="btn btn-primary btn-sm"><Plus size={14} /> Add User</button>
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search name, email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3a65ae, #2d5193)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0
                    }}>
                      {(u.full_name || 'U')[0].toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{u.full_name || 'Unknown'}</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>{u.email}</td>
                <td>
                  <span style={{
                    background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                    padding: '2px 8px', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 600
                  }}>
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{u.last_login ? formatDate(u.last_login) : 'Never'}</td>
                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{u.created_at ? formatDate(u.created_at) : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm"><Eye size={13} /></button>
                    <button className="btn btn-ghost btn-sm"><Edit size={13} /></button>
                    <button className="btn btn-ghost btn-sm"><Shield size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
