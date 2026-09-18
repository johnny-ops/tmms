import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Eye, EyeOff, LogOut, ArrowRight, Clock, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const { signIn, signOut, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const msg = sessionStorage.getItem('tmms_login_error');
    if (msg) {
      setApprovalError(msg);
      sessionStorage.removeItem('tmms_login_error');
    }
  }, []);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
    else navigate('/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <div className="auth-left" style={{
        flex: '0 0 55%',
        background: '#152E5E',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        overflow: 'hidden',
      }}>
        {/* Background seal watermark */}
        <div style={{
          position: 'absolute', top: '53%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '95%', height: '95%',
          backgroundImage: 'url(/govserve.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          opacity: 0.12,
          pointerEvents: 'none',
        }} />

        {/* Top system label */}
        <div style={{
          position: 'absolute', top: 32, left: 40,
          fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          TRANSPORT MOBILITY MANAGEMENT SYSTEM
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 600 }}>

          <h1 style={{
            fontSize: '3.2rem', fontWeight: 900, color: '#ffffff',
            lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.03em',
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            Transport &<br />Mobility Management<br />System
          </h1>

          <p style={{
            fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.6, maxWidth: 440, margin: '0 auto 32px',
          }}>
            A centralized digital platform for efficient transport regulation,
            real-time monitoring and sustainable mobility management for local government units.
          </p>
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: 'absolute', bottom: 32, left: 40,
        }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
            OFFICIAL GOVERNMENT PORTAL
          </span>
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
            SERVICE · INTEGRITY · PROGRESS
          </span>
          <div style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.2)' }} />
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="auth-right" style={{
        flex: '0 0 45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
            padding: '40px 32px',
            position: 'relative'
          }}>
            {/* Back to homepage pill (inside card) */}
            <div style={{ marginBottom: 24 }}>
              <Link to="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '0.75rem', color: '#4b5563', textDecoration: 'none',
                fontWeight: 600, background: '#f3f4f6', padding: '6px 14px',
                borderRadius: 9999, transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#111827'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#4b5563'; }}
              >
                <ArrowLeft size={13} /> Back to homepage
              </Link>
            </div>

            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#111827', marginBottom: 12, letterSpacing: '-0.03em' }}>
              Sign in
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
              {user
                ? 'You have an active session.'
                : 'Citizen and employee accounts both sign in here — we detect your account type automatically.'}
            </p>

            {/* Approval error */}
            {approvalError && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Clock size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.5 }}>{approvalError}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>{error}</span>
              </div>
            )}

            {user ? (
              /* ALREADY LOGGED IN */
              <div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
                  <p style={{ fontSize: '0.85rem', color: '#1e3a8a', marginBottom: 6 }}>Logged in as</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e40af' }}>{user.full_name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role: {user.role}</p>
                </div>
                <button onClick={() => navigate('/')} style={{ width: '100%', padding: '14px', borderRadius: 9999, background: '#1d4ed8', color: '#fff', fontSize: '0.95rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
                >
                  Continue to Dashboard <ArrowRight size={16} />
                </button>
                <button onClick={() => signOut()} style={{ width: '100%', padding: '14px', borderRadius: 9999, background: '#f1f5f9', color: '#475569', fontSize: '0.95rem', fontWeight: 700, border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                >
                  <LogOut size={16} /> Sign out & Switch Account
                </button>
              </div>
            ) : (
              /* LOGIN FORM */
              <form onSubmit={handlePasswordLogin}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 8,
                      border: '1px solid #e5e7eb', fontSize: '0.95rem',
                      color: '#111827', outline: 'none', background: '#ffffff',
                      fontFamily: 'inherit', boxSizing: 'border-box', transition: 'all 0.2s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                    onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%', padding: '12px 16px', paddingRight: 44,
                        borderRadius: 8, border: '1px solid #e5e7eb',
                        fontSize: '0.95rem', color: '#111827', outline: 'none',
                        background: '#ffffff', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'all 0.2s',
                        letterSpacing: password ? '0.2em' : 'normal'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                      onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#4b5563'}
                      onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
                  <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 9999,
                    background: loading ? '#93c5fd' : '#1d4ed8',
                    color: '#ffffff', fontSize: '0.95rem', fontWeight: 700,
                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.2)'
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1e40af'; }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'; }}
                >
                  {loading ? 'Signing in...' : <>Sign in <ArrowRight size={16} /></>}
                </button>
              </form>
            )}

            {!user && (
              <div style={{ marginTop: 24, textAlign: 'left' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  No account yet? <Link to="/register" style={{ color: '#152E5E', fontWeight: 700, textDecoration: 'underline' }}>Register</Link>
                </span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
