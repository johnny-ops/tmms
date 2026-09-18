import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertCircle, ArrowLeft, Mail, RotateCcw } from 'lucide-react';

export function OTPVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get('email') || '';
    if (emailParam) setEmail(emailParam);

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const pendingRaw = localStorage.getItem('tmms_pending_registration');
      if (!pendingRaw) {
        alert('Warning: Registration data was lost. Did you open this link in a different browser?');
      }
      if (pendingRaw && user) {
        const pending = JSON.parse(pendingRaw);
        const { error: profileErr } = await supabase.rpc('upsert_profile_on_verify', {
          p_id: user.id, p_role: pending.role, p_email: pending.email,
          p_full_name: pending.full_name, p_first_name: pending.first_name,
          p_last_name: pending.last_name, p_middle_name: pending.middle_name || null,
        });
        if (profileErr) {
          await supabase.from('profiles').upsert({
            id: user.id, role: pending.role, email: pending.email,
            full_name: pending.full_name, first_name: pending.first_name,
            last_name: pending.last_name, middle_name: pending.middle_name || null,
            approval_status: 'PENDING', is_active: true,
          }, { onConflict: 'id' });
        }
        const licenseImageUrl: string | null = pending.role === 'DRIVER' ? (pending.license_image_url || null) : null;
        if (pending.role === 'DRIVER') {
          await supabase.from('drivers').upsert({
            profile_id: user.id, full_name: pending.full_name, first_name: pending.first_name,
            last_name: pending.last_name, middle_name: pending.middle_name || null,
            license_image_url: licenseImageUrl, contact_number: pending.contact_number,
            address: pending.address, status: 'PENDING',
          }, { onConflict: 'profile_id' });
        } else if (pending.role === 'OPERATOR') {
          await supabase.from('operators').upsert({
            profile_id: user.id, full_name: pending.full_name, first_name: pending.first_name,
            last_name: pending.last_name, middle_name: pending.middle_name || null,
            email: pending.email, contact_number: pending.contact_number,
            organization: pending.organization, address: pending.address, status: 'PENDING',
          }, { onConflict: 'profile_id' });
        }
        localStorage.removeItem('tmms_pending_registration');
      }
      await supabase.auth.signOut();
      setTimeout(() => { window.location.href = '/register?step=success'; }, 1500);
    } catch (err) {
      console.error('[TMMS] Post-verification error:', err);
      setTimeout(() => navigate('/'), 1500);
    }
  }

  function handleDigitChange(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || '';
    setDigits(newDigits);
    const lastFilled = Math.min(pasted.length, 5);
    inputRefs.current[lastFilled]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const token = digits.join('');
    if (token.length < 6) { setError('Please enter all 6 digits of the verification code.'); return; }
    if (!email) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
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

  // ── SUCCESS STATE ──
  if (verified) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '48px 40px', maxWidth: 400, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#22c55e" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Email Verified!</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Your account has been activated. Redirecting...</p>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <span style={{ width: 20, height: 20, border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', display: 'inline-block' }} />
          </div>
        </div>
      </div>
    );
  }

  const token = digits.join('');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT PANEL (same as Login) ── */}
      <div className="auth-left" style={{
        flex: '0 0 55%',
        background: 'linear-gradient(160deg, #0d1f5c 0%, #1a3284 50%, #0d1f5c 100%)',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%', height: '90%',
          backgroundImage: 'url(/govserve.png)',
          backgroundSize: 'contain', backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat', opacity: 0.12, pointerEvents: 'none',
        }} />
        <div style={{ position: 'absolute', top: 20, left: 24, fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          TRANSPORT MOBILITY MANAGEMENT SYSTEM
        </div>
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 500 }}>
          <div style={{ width: 140, height: 140, borderRadius: '50%', margin: '0 auto 28px', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <img src="/govserve.png" alt="Government Seal" style={{ width: 130, height: 130, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            Transport &<br />Mobility Management<br />System
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
            A centralized digital platform for efficient transport regulation, real-time monitoring and sustainable mobility management.
          </p>
        </div>
        <div style={{ position: 'absolute', bottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.3)' }} />
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>SERVICE · INTEGRITY · PROGRESS</span>
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.3)' }} />
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="auth-right" style={{
        flex: '0 0 45%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', backgroundColor: '#f8fafc',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Back link */}
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748b', textDecoration: 'none', marginBottom: 28, fontWeight: 500 }}>
            <ArrowLeft size={13} /> Back to homepage
          </Link>

          {/* Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e9eef5', padding: '36px 32px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Confirm it's you
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
              Enter the 6-digit code sent to your email to complete sign-in.
            </p>

            {/* Email info box */}
            {email && (
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 8, padding: '11px 14px', marginBottom: 20,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <Mail size={15} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600, marginBottom: 2 }}>We sent a 6-digit code to:</p>
                  <p style={{ fontSize: '0.82rem', color: '#1d4ed8', wordBreak: 'break-all' }}>{email}</p>
                  <p style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 3 }}>It expires in 5 minutes.</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerify}>
              {/* Email input (if not pre-filled) */}
              {!searchParams.get('email') && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Your email address</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="name@gmail.com" required
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: '0.875rem', color: '#0f172a', outline: 'none', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#1d4ed8'}
                    onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                </div>
              )}

              {/* 6 individual digit boxes */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 10 }}>Verification code</label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      style={{
                        width: 48, height: 54, textAlign: 'center',
                        fontSize: '1.4rem', fontWeight: 700,
                        border: `2px solid ${digit ? '#1d4ed8' : '#d1d5db'}`,
                        borderRadius: 8, outline: 'none',
                        background: digit ? '#eff6ff' : '#fff',
                        color: '#0f172a', fontFamily: 'monospace',
                        transition: 'border-color 0.15s, background 0.15s',
                        cursor: 'text',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#1d4ed8'}
                      onBlur={e => { if (!digit) e.currentTarget.style.borderColor = '#d1d5db'; }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: '0.74rem', color: '#64748b', textAlign: 'center', marginTop: 10 }}>
                  You can enter it in 5 minutes. Once it's accepted, you won't need a verification code for this device for the rest of today.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || token.length < 6}
                style={{
                  width: '100%', padding: '11px', borderRadius: 8,
                  background: loading || token.length < 6 ? '#93c5fd' : '#1d4ed8',
                  color: '#ffffff', fontSize: '0.875rem', fontWeight: 700,
                  border: 'none', cursor: loading || token.length < 6 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? (
                  <><span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.35)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.75s linear infinite', display: 'inline-block' }} /> Verifying...</>
                ) : 'Verify and continue →'}
              </button>
            </form>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || resendLoading}
                style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', color: resendCooldown > 0 ? '#94a3b8' : '#1d4ed8', fontWeight: 600, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0 }}
              >
                <RotateCcw size={12} />
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : resendLoading ? 'Sending...' : 'Resend code'}
              </button>
              <Link to="/login" style={{ fontSize: '0.8rem', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
                Use a different email
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
