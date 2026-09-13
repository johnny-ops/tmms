import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Eye, EyeOff, LogOut, ArrowRight, Clock } from 'lucide-react';

export function LoginPage() {
  const { signIn, signOut, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [loading, setLoading] = useState(false);

  // Read pending approval message set by AuthContext
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ffffff' }}>

      {/* LEFT PANEL */}
      <div className="auth-left" style={{
        flex: '0 0 50%',
        backgroundColor: '#0a1128', // Darker navy blue matching reference
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', // Center horizontally
        justifyContent: 'center',
        padding: '40px',
        overflow: 'hidden',
        textAlign: 'center', // Center text
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '120%', height: '120%', backgroundImage: 'url(/LGO.jpg)', backgroundSize: 'contain',
          backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: 0.15, pointerEvents: 'none',
          filter: 'grayscale(10%) contrast(110%)', mixBlendMode: 'lighten'
        }} />
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
            GOVSERVE
          </div>
          <h1 style={{ fontSize: '3.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            TRANSPORT &amp;<br />MOBILITY SYSTEM
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.7, maxWidth: 440, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            A centralized digital platform for efficient transport regulation real-time monitoring and sustainable mobility management for local government units
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right" style={{ flex: '0 0 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', backgroundColor: '#f8fafc' }}>
        <div style={{ width: '100%', maxWidth: 420, backgroundColor: '#ffffff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #e9eef5', padding: '48px 40px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#0a1128', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img src="/LGO.jpg" alt="Logo" style={{ width: 74, height: 74, objectFit: 'contain', mixBlendMode: 'lighten' }} onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, textAlign: 'center', letterSpacing: '-0.02em' }}>
              {user ? 'Already Logged In' : 'Sign in to your account'}
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
              {user ? 'You have an active session.' : 'Enter your credentials to access the municipal portal.'}
            </p>
          </div>

          {approvalError && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Clock size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5 }}>{approvalError}</span>
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: '#dc2626' }}>{error}</span>
            </div>
          )}

          {user ? (
            /* ALREADY LOGGED IN VIEW */
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <p style={{ fontSize: '0.85rem', color: '#1e3a8a', marginBottom: 6 }}>Logged in as</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e40af' }}>{user.full_name}</p>
                <p style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role: {user.role}</p>
              </div>
              <button onClick={() => navigate('/')} style={{ width: '100%', padding: '12px', borderRadius: 8, background: '#1d4ed8', color: '#fff', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                Continue to Dashboard <ArrowRight size={16} />
              </button>
              <button onClick={() => signOut()} style={{ width: '100%', padding: '12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', fontSize: '0.875rem', fontWeight: 600, border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <LogOut size={16} /> Sign out & Switch Account
              </button>
            </div>
          ) : (
            /* LOGIN VIEW */
            <>
              <form onSubmit={handlePasswordLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', color: '#0f172a', outline: 'none', background: '#ffffff', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '11px 14px', paddingRight: 42, borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', color: '#0f172a', outline: 'none', background: '#ffffff', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 8, background: loading ? '#93c5fd' : '#1d4ed8', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>

              <p style={{ marginTop: 20, textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}>Register here</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
