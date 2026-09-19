import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
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
            {/* Back to login pill */}
            <div style={{ marginBottom: 24 }}>
              <Link to="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '0.75rem', color: '#4b5563', textDecoration: 'none',
                fontWeight: 600, background: '#f3f4f6', padding: '6px 14px',
                borderRadius: 9999, transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#111827'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#4b5563'; }}
              >
                <ArrowLeft size={13} /> Back to login
              </Link>
            </div>

            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#111827', marginBottom: 12, letterSpacing: '-0.03em' }}>
              Reset Password
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
              Enter your email address and we'll send you a link to reset your password.
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
                <p style={{ fontSize: '0.95rem', color: '#166534', fontWeight: 600, marginBottom: 8 }}>Check your email</p>
                <p style={{ fontSize: '0.85rem', color: '#15803d', lineHeight: 1.5 }}>
                  We sent a password reset link to <br/><strong>{email}</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetRequest}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>Email address</label>
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
                  {loading ? 'Sending link...' : <>Send reset link <ArrowRight size={16} /></>}
                </button>
              </form>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
