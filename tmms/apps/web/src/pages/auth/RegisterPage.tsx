import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Eye, EyeOff, UserCheck, Building2, CheckCircle, Lightbulb } from 'lucide-react';

type Role = 'DRIVER' | 'OPERATOR';

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [role, setRole] = useState<Role>('DRIVER');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    contact_number: '',
    // Driver-specific
    license_number: '',
    license_expiry: '',
    address: '',
    // Operator-specific
    organization: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 0', border: 'none', borderBottom: '1px solid #cbd5e1',
    fontSize: '0.9rem', color: '#0f172a', outline: 'none', background: 'transparent',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em'
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (role === 'DRIVER' && !formData.license_number) {
      setError('License number is required for drivers.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user with Supabase (sends email confirmation automatically)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/verify-otp`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No user returned from signup.');

      const userId = authData.user.id;

      // 2. Insert into the correct role table
      if (role === 'DRIVER') {
        await supabase.from('drivers').insert({
          profile_id: userId,
          full_name: formData.full_name,
          license_number: formData.license_number,
          license_expiry: formData.license_expiry || null,
          contact_number: formData.contact_number,
          address: formData.address,
          status: 'ACTIVE',
        });
      } else {
        await supabase.from('operators').insert({
          profile_id: userId,
          full_name: formData.full_name,
          email: formData.email,
          contact_number: formData.contact_number,
          organization: formData.organization,
          address: formData.address,
          status: 'ACTIVE',
        });
      }

      // Immediately navigate to the OTP verification page
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // The step === 'success' UI is no longer needed since we navigate away,
  // but we can leave the state in case it's needed later, or remove it.

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Left branding panel */}
      <div style={{ flex: '0 0 42%', backgroundColor: '#0f172a', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 60px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '110%', height: '110%', backgroundImage: 'url(/logo.jpg)', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: 0.08 }} />
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>GOVSERVE</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.02em' }}>
            Join the<br />Transport Network
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 320 }}>
            Register as a Driver or Operator to access the LGU Transport & Mobility Management System.
          </p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Secure OTP email verification', 'Role-based dashboard access', 'Real-time fleet management'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: '0.82rem' }}>
                <CheckCircle size={14} color="#22c55e" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 36, left: 60, zIndex: 10, fontSize: '0.6rem', fontWeight: 600, color: '#334155', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          OFFICIAL GOVERNMENT PORTAL
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 640, backgroundColor: '#ffffff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #e9eef5', padding: '40px 48px', marginTop: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Create Account</h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>

          {/* Role Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {(['DRIVER', 'OPERATOR'] as Role[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  padding: '14px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${role === r ? '#1d4ed8' : '#e2e8f0'}`,
                  background: role === r ? '#eff6ff' : '#f8fafc',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                {r === 'DRIVER' ? <UserCheck size={24} color={role === r ? '#1d4ed8' : '#94a3b8'} /> : <Building2 size={24} color={role === r ? '#1d4ed8' : '#94a3b8'} />}
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: role === r ? '#1d4ed8' : '#64748b' }}>
                  {r === 'DRIVER' ? 'Driver' : 'Operator'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
                  {r === 'DRIVER' ? 'Operate a PUV unit' : 'Manage a fleet'}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: '#dc2626' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px', marginBottom: 32 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input style={inputStyle} value={formData.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Juan Dela Cruz" required
                  onFocus={e => e.currentTarget.style.borderBottomColor = '#1d4ed8'} onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'} />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" style={inputStyle} value={formData.email} onChange={e => update('email', e.target.value)} placeholder="name@example.com" required
                  onFocus={e => e.currentTarget.style.borderBottomColor = '#1d4ed8'} onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'} />
              </div>
              
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 40 }} value={formData.password} onChange={e => update('password', e.target.value)} placeholder="Min. 8 characters" required
                    onFocus={e => e.currentTarget.style.borderBottomColor = '#1d4ed8'} onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 8px' }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" style={inputStyle} value={formData.confirm_password} onChange={e => update('confirm_password', e.target.value)} placeholder="Repeat password" required
                  onFocus={e => e.currentTarget.style.borderBottomColor = '#1d4ed8'} onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'} />
              </div>

              <div>
                <label style={labelStyle}>Contact No.</label>
                <input style={inputStyle} value={formData.contact_number} onChange={e => update('contact_number', e.target.value)} placeholder="09XX-XXX-XXXX"
                  onFocus={e => e.currentTarget.style.borderBottomColor = '#1d4ed8'} onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'} />
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input style={inputStyle} value={formData.address} onChange={e => update('address', e.target.value)} placeholder="City, Province"
                  onFocus={e => e.currentTarget.style.borderBottomColor = '#1d4ed8'} onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'} />
              </div>

              {/* Role-specific fields */}
              {role === 'DRIVER' && (
                <>
                  <div>
                    <label style={labelStyle}>License No.</label>
                    <input style={inputStyle} value={formData.license_number} onChange={e => update('license_number', e.target.value)} placeholder="LN-XXXX" required
                      onFocus={e => e.currentTarget.style.borderBottomColor = '#1d4ed8'} onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Expiry Date</label>
                    <input type="date" style={inputStyle} value={formData.license_expiry} onChange={e => update('license_expiry', e.target.value)}
                      onFocus={e => e.currentTarget.style.borderBottomColor = '#1d4ed8'} onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'} />
                  </div>
                </>
              )}
              {role === 'OPERATOR' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Organization / Cooperative Name</label>
                  <input style={inputStyle} value={formData.organization} onChange={e => update('organization', e.target.value)} placeholder="Cooperative Name"
                    onFocus={e => e.currentTarget.style.borderBottomColor = '#1d4ed8'} onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'} />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: 8, background: loading ? '#93c5fd' : '#1e293b', color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s', letterSpacing: '0.05em', textTransform: 'uppercase' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0f172a'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1e293b'; }}
            >
              {loading ? 'Processing...' : 'Register Account'}
            </button>
          </form>

          <p style={{ marginTop: 16, textAlign: 'center', fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.6 }}>
            By registering, you agree to the LGU Terms of Service. A verification email will be sent to confirm your account.
          </p>
        </div>
      </div>
    </div>
  );
}
