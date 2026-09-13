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
    console.log('[TMMS] OTP verified successfully!');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role ?? searchParams.get('role') ?? 'DRIVER';

      // Check if there's pending registration data to complete
      const pendingRaw = localStorage.getItem('tmms_pending_registration');
      if (!pendingRaw) {
        console.error('[TMMS] No pending registration found in localStorage!');
        alert('Warning: Registration data (including license image) was lost. Did you open this link in a different browser or incognito tab?');
      }

      if (pendingRaw && user) {
        const pending = JSON.parse(pendingRaw);
        console.log('[TMMS] Completing registration for role:', pending.role);

        // 1. Upsert Profile (in case trigger already created one with wrong role)
        const { error: profileErr } = await supabase.rpc('upsert_profile_on_verify', {
          p_id: user.id,
          p_role: pending.role,
          p_email: pending.email,
          p_full_name: pending.full_name,
          p_first_name: pending.first_name,
          p_last_name: pending.last_name,
          p_middle_name: pending.middle_name || null,
        });
        if (profileErr) {
          // Fallback: try direct upsert if RPC not available
          await supabase.from('profiles').upsert({
            id: user.id,
            role: pending.role,
            email: pending.email,
            full_name: pending.full_name,
            first_name: pending.first_name,
            last_name: pending.last_name,
            middle_name: pending.middle_name || null,
            approval_status: 'PENDING',
            is_active: true,
          }, { onConflict: 'id' });
        }

        // 2. Use the pre-uploaded license image URL if driver
        const licenseImageUrl: string | null = pending.role === 'DRIVER' ? (pending.license_image_url || null) : null;

        if (pending.role === 'DRIVER') {
          // Use upsert in case a DB trigger already created a partial driver record
          const { error: driverErr } = await supabase.from('drivers').upsert({
            profile_id: user.id,
            full_name: pending.full_name,
            first_name: pending.first_name,
            last_name: pending.last_name,
            middle_name: pending.middle_name || null,
            license_image_url: licenseImageUrl,
            contact_number: pending.contact_number,
            address: pending.address,
            status: 'PENDING',
          }, { onConflict: 'profile_id' });
          if (driverErr) console.warn('[TMMS] Driver upsert warning:', driverErr.message);
          else console.log('[TMMS] Driver profile saved successfully, contact:', pending.contact_number);
        } else if (pending.role === 'OPERATOR') {
          // Use upsert in case a DB trigger already created a partial operator record
          const { error: opErr } = await supabase.from('operators').upsert({
            profile_id: user.id,
            full_name: pending.full_name,
            first_name: pending.first_name,
            last_name: pending.last_name,
            middle_name: pending.middle_name || null,
            email: pending.email,
            contact_number: pending.contact_number,
            organization: pending.organization,
            address: pending.address,
            status: 'PENDING',
          }, { onConflict: 'profile_id' });
          if (opErr) console.warn('[TMMS] Operator upsert warning:', opErr.message);
          else console.log('[TMMS] Operator profile saved successfully, contact:', pending.contact_number);
        }
        localStorage.removeItem('tmms_pending_registration');
      }

      await supabase.auth.signOut();
      
      setTimeout(() => {
        window.location.href = '/register?step=success';
      }, 1500);
    } catch (err) {
      console.error('[TMMS] Post-verification error:', err);
      setTimeout(() => navigate('/'), 1500);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      // Verify the OTP sent by signInWithOtp
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      await handleVerifiedSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code. Please request a new one.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !email) return;
    setResendLoading(true);
    setError('');
    try {
      // Resend using signInWithOtp — same reliable path
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
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
            Enter the OTP code sent to your email, or click the confirmation link in the email.
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
              onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="12345678"
              maxLength={8}
              style={{ width: '100%', padding: '14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc', fontFamily: 'monospace', boxSizing: 'border-box', letterSpacing: '0.3em', textAlign: 'center' }}
              onFocus={e => e.currentTarget.style.borderColor = '#1d4ed8'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || token.length < 1}
            style={{ width: '100%', padding: '12px', borderRadius: 8, background: loading || token.length < 1 ? '#93c5fd' : '#1d4ed8', color: 'white', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: loading || token.length < 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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
