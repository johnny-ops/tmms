import { useState } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, Bell, Shield, Map } from 'lucide-react';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ai');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={20} color="#3a65ae" /> System Settings
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Application-wide configuration for AI thresholds, notifications, and maps
          </p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ gap: 8 }}>
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saveSuccess && (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#166534', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <CheckCircle size={18} /> Settings successfully saved.
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        
        {/* SIDEBAR TABS */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => setActiveTab('ai')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: activeTab === 'ai' ? '#eff6ff' : 'transparent', color: activeTab === 'ai' ? '#1d4ed8' : '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', textAlign: 'left', transition: 'all 0.2s' }}>
            <Shield size={18} /> AI Configuration
          </button>
          <button onClick={() => setActiveTab('notifications')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: activeTab === 'notifications' ? '#eff6ff' : 'transparent', color: activeTab === 'notifications' ? '#1d4ed8' : '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', textAlign: 'left', transition: 'all 0.2s' }}>
            <Bell size={18} /> Notifications
          </button>
          <button onClick={() => setActiveTab('maps')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: activeTab === 'maps' ? '#eff6ff' : 'transparent', color: activeTab === 'maps' ? '#1d4ed8' : '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', textAlign: 'left', transition: 'all 0.2s' }}>
            <Map size={18} /> Map Preferences
          </button>
        </div>

        {/* SETTINGS CONTENT */}
        <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '32px' }}>
          
          {activeTab === 'ai' && (
            <div className="fade-in">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>AI Violation Detection Settings</h2>
              
              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Minimum Confidence Threshold (%)</label>
                <input type="range" min="10" max="95" step="5" defaultValue="50" style={{ width: '100%', maxWidth: 300, cursor: 'pointer' }} />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>Detections below this confidence level will be automatically discarded.</p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Enable Automated Plate Recognition (OCR)</label>
                <select className="form-input" style={{ maxWidth: 300 }}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled (Track by ID only)</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>Automated license plate detection and parsing.</p>
              </div>
              
              <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, color: '#92400e', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Modifying AI settings requires restarting the background AI Service for the changes to take effect fully.</span>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="fade-in">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>Notification Preferences</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: '#1d4ed8' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>Email on New Driver Registration</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Receive an email when a driver requires approval.</div>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: '#1d4ed8' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>Daily AI Summary Report</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Get a daily recap of violations detected.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'maps' && (
            <div className="fade-in">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>Map Preferences</h2>
              
              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Default Map Center (Latitude, Longitude)</label>
                <div style={{ display: 'flex', gap: 12, maxWidth: 400 }}>
                  <input type="text" className="form-input" defaultValue="14.5995" placeholder="Latitude" />
                  <input type="text" className="form-input" defaultValue="120.9842" placeholder="Longitude" />
                </div>
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Default Zoom Level</label>
                <input type="number" className="form-input" style={{ maxWidth: 150 }} defaultValue="12" min="1" max="18" />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
