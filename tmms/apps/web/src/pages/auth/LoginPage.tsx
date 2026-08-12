import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@lgu-tmms.gov.ph');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
    else navigate('/dashboard');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ffffff' }}>

      {/* ── Left Panel ─────────────────────────────── */}
      <div style={{
        flex: '0 0 50%',
        backgroundColor: '#1b2a47',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        overflow: 'hidden',
      }}>

        {/* Large watermark logo centered in the panel */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '110%',
          height: '110%',
          backgroundImage: 'url(/logo.jpg)',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.18,
          pointerEvents: 'none',
          filter: 'grayscale(20%) contrast(110%)',
        }} />

        {/* Top label */}
        <div style={{
          position: 'absolute',
          top: 40,
          left: 60,
          zIndex: 10,
          fontSize: '0.6rem',
          fontWeight: 700,
          color: '#94a3b8',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          GOVSERVE
        </div>

        {/* Main heading */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: '-0.02em',
          }}>
            TRANSPORT &amp;<br />
            MOBILITY SYSTEM
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#94a3b8',
            lineHeight: 1.7,
            maxWidth: 380,
          }}>
            A centralized digital platform for securely managing local government revenue services, taxpayer accounts, and treasury records.
          </p>
        </div>

        {/* Bottom label */}
        <div style={{
          position: 'absolute',
          bottom: 36,
          left: 60,
          zIndex: 10,
          fontSize: '0.6rem',
          fontWeight: 600,
          color: '#475569',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          OFFICIAL GOVERNMENT PORTAL
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────── */}
      <div style={{
        flex: '0 0 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          border: '1px solid #e9eef5',
          padding: '48px 40px',
        }}>
          {/* Logo + Title */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <img
              src="/logo.jpg"
              alt="GOVCHECK Logo"
              style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 16 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, textAlign: 'center', letterSpacing: '-0.02em' }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
              Enter your credentials to access the municipal portal.
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: '#dc2626' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: '0.68rem', fontWeight: 700,
                color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', fontSize: '0.875rem', color: '#0f172a',
                  outline: 'none', background: '#ffffff', fontFamily: 'inherit',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1b2a47'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: 'block', fontSize: '0.68rem', fontWeight: 700,
                color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '11px 14px', paddingRight: 42, borderRadius: 8,
                    border: '1.5px solid #e2e8f0', fontSize: '0.875rem', color: '#0f172a',
                    outline: 'none', background: '#ffffff', fontFamily: 'inherit',
                    boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#1b2a47'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                    display: 'flex', alignItems: 'center', padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 8,
                background: loading ? '#93c5fd' : '#1d4ed8',
                color: '#ffffff', fontSize: '0.875rem', fontWeight: 600,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s', letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e40af'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1d4ed8'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 15, height: 15, border: '2px solid rgba(255,255,255,0.35)',
                    borderTop: '2px solid white', borderRadius: '50%',
                    animation: 'spin 0.75s linear infinite', display: 'inline-block'
                  }} />
                  Signing in...
                </>
              ) : 'Sign In →'}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: '0.68rem', color: '#94a3b8' }}>
            Need access or assistance? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
