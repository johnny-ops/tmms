import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertCircle, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Parse the access_token and refresh_token from the URL hash
    // Supabase sends them as: #access_token=...&refresh_token=...&type=recovery
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.substring(1)); // remove leading #
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        // Manually establish the session from the recovery tokens
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (error) {
              setError('This reset link has expired or already been used. Please request a new one.');
            }
          });
      }
    }

    // Also listen for the auth state change
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery session established");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      // Wait a moment then redirect to login
      setTimeout(() => {
        // Sign out just to be safe so they can log in normally
        supabase.auth.signOut().then(() => {
          navigate('/login');
        });
      }, 3000);
    }
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

            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#111827', marginBottom: 12, letterSpacing: '-0.03em' }}>
              New Password
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
              Please enter your new password below.
            </p>

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>{error}</span>
              </div>
            )}

            {success ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
                <CheckCircle size={32} color="#16a34a" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.95rem', color: '#166534', fontWeight: 600, marginBottom: 8 }}>Password Updated!</p>
                <p style={{ fontSize: '0.85rem', color: '#15803d', lineHeight: 1.5 }}>
                  Your password has been reset successfully. Redirecting you to login...
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>New Password</label>
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
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 32 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%', padding: '12px 16px', paddingRight: 44,
                        borderRadius: 8, border: '1px solid #e5e7eb',
                        fontSize: '0.95rem', color: '#111827', outline: 'none',
                        background: '#ffffff', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'all 0.2s',
                        letterSpacing: confirmPassword ? '0.2em' : 'normal'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                      onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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
                >
                  {loading ? 'Updating...' : <>Update Password <ArrowRight size={16} /></>}
                </button>
              </form>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
