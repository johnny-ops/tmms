import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Mail, RefreshCw, AlertCircle } from 'lucide-react';

export function OTPVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get('email') || '';
    if (emailParam) setEmail(emailParam);

    // Auto-handle magic link token from URL (Supabase redirects here)
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (!error) handleVerifiedSuccess();
      });
    }
  }, []);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  async function handleVerifiedSuccess() {
    setVerified(true);
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role ?? 'DRIVER';
    setTimeout(() => {
      if (role === 'DRIVER') navigate('/driver/dashboard');
      else if (role === 'OPERATOR') navigate('/operator/dashboard');
      else navigate('/');
    }, 1500);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      await handleVerifiedSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !email) return;
    setResendLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
      if (resendError) throw resendError;
      setResendCooldown(60);
      cooldownRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Could not resend. Try again later.');
    } finally {
      setResendLoading(false);
    }
  }

  if (verified) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#22c55e" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Email Verified!</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Your account has been activated. Redirecting to your dashboard...</p>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <span style={{ width: 20, height: 20, border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', display: 'inline-block' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Mail size={28} color="#1d4ed8" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Verify Your Email</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6 }}>
            Enter the 6-digit OTP sent to your email, or click the confirmation link in the email.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#dc2626' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@gmail.com"
              required
              style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', color: '#0f172a', outline: 'none', background: '#ffffff', fontFamily: 'inherit', boxSizing: 'border-box' }}
              onFocus={e => e.currentTarget.style.borderColor = '#1d4ed8'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Verification Code (OTP)
            </label>
            <input
              value={token}
              onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              style={{ width: '100%', padding: '14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc', fontFamily: 'monospace', boxSizing: 'border-box', letterSpacing: '0.3em', textAlign: 'center' }}
              onFocus={e => e.currentTarget.style.borderColor = '#1d4ed8'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || token.length < 6}
            style={{ width: '100%', padding: '12px', borderRadius: 8, background: loading || token.length < 6 ? '#93c5fd' : '#1d4ed8', color: 'white', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: loading || token.length < 6 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? (
              <><span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.35)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.75s linear infinite', display: 'inline-block' }} /> Verifying...</>
            ) : 'Verify Email →'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 8 }}>Didn't receive the email?</p>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', color: resendCooldown > 0 ? '#94a3b8' : '#1d4ed8', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resendLoading ? 'Sending...' : 'Resend Code'}
          </button>
        </div>

        <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20, textAlign: 'center' }}>
          <a href="/login" style={{ fontSize: '0.82rem', color: '#64748b', textDecoration: 'none' }}>
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
