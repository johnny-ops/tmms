import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  AlertCircle, Eye, EyeOff, UserCheck, Building2, CheckCircle,
  Upload, X, Image as ImageIcon, ArrowLeft, ArrowRight
} from 'lucide-react';

type Role = 'DRIVER' | 'OPERATOR';
type Step = 'role-selection' | 'details' | 'success';

// Password requirements checker
function checkPasswordRequirements(password: string) {
  return {
    minLength: password.length >= 8,
    maxLength: password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  };
}

function isPasswordValid(password: string): boolean {
  const r = checkPasswordRequirements(password);
  return r.minLength && r.maxLength && r.uppercase && r.lowercase && r.number && r.special;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 5;

export function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<Step>('role-selection');
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('step') === 'success') {
      setCurrentStep('success');
    }
  }, []);
  
  const [formData, setFormData] = useState({
    last_name: '',
    first_name: '',
    middle_name: '',
    email: '',
    password: '',
    confirm_password: '',
    contact_number: '',
    address: '',
    // Operator-specific
    organization: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // License image upload state
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const passwordReqs = checkPasswordRequirements(formData.password);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0',
    fontSize: '0.9rem', color: '#0f172a', outline: 'none', background: '#ffffff',
    fontFamily: 'inherit', transition: 'border-color 0.2s', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em'
  };

  // Contact number: only digits, max 11
  function handleContactChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    update('contact_number', digits);
  }

  // Confirm password: no copy/paste
  function handleConfirmPaste(e: React.ClipboardEvent) {
    e.preventDefault();
  }
  function handleConfirmChange(e: React.ChangeEvent<HTMLInputElement>) {
    update('confirm_password', e.target.value);
    if (e.target.value && formData.password && e.target.value !== formData.password) {
      setConfirmPasswordError("Passwords don't match.");
    } else {
      setConfirmPasswordError('');
    }
  }

  // Image upload handler
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUploadError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setLicenseFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLicensePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setLicenseFile(null);
    setLicensePreview(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function goToStep2() {
    if (!role) {
      setError('Please select a role to continue.');
      return;
    }
    setError('');
    setCurrentStep('details');
  }

  function goBackToStep1() {
    setError('');
    setCurrentStep('role-selection');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const fullName = `${formData.last_name}, ${formData.first_name}${formData.middle_name ? ' ' + formData.middle_name : ''}`.trim();

    // Validate required name fields
    if (!formData.last_name.trim() || !formData.first_name.trim()) {
      setError('Last name and first name are required.');
      return;
    }

    // Password validation
    if (!isPasswordValid(formData.password)) {
      setError('Password does not meet the requirements.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError("Passwords don't match.");
      return;
    }

    // Contact number validation
    if (formData.contact_number.length !== 11) {
      setError('Contact number must be exactly 11 digits.');
      return;
    }

    // Driver license image validation
    if (role === 'DRIVER' && !licenseFile) {
      setError("Please upload an image of your driver's license.");
      return;
    }

    setLoading(true);

    try {
      // STEP 1: Check if email already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingProfile) {
        setError('This email is already registered. Please log in instead.');
        setLoading(false);
        return;
      }

      // STEP 1.5: Upload license image FIRST (bypassing localStorage limits)
      let preUploadedLicenseUrl: string | null = null;
      if (role === 'DRIVER' && licenseFile) {
        console.log('[TMMS] Pre-uploading license image...');
        const ext = licenseFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const filePath = `pending/${tempId}/license.${ext}`;
        
        const { error: uploadErr } = await supabase.storage
          .from('driver-docs')
          .upload(filePath, licenseFile, { upsert: true });

        if (uploadErr) {
          throw new Error(`Failed to upload license image: ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('driver-docs')
          .getPublicUrl(filePath);
        preUploadedLicenseUrl = urlData?.publicUrl || null;
        console.log('[TMMS] Pre-uploaded license URL:', preUploadedLicenseUrl);
      }

      // STEP 2: Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            first_name: formData.first_name,
            last_name: formData.last_name,
            middle_name: formData.middle_name,
            role,
            contact_number: formData.contact_number,
            address: formData.address,
            organization: formData.organization || null,
            license_image_url: preUploadedLicenseUrl,
          },
          emailRedirectTo: `${window.location.origin}/verify-otp`,
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered') ||
          signUpError.message.toLowerCase().includes('already exists') ||
          signUpError.message.toLowerCase().includes('user already registered')) {
          setError('This email is already registered. Please log in instead.');
          return;
        }
        throw signUpError;
      }

      const userId = signUpData?.user?.id;
      if (!userId) throw new Error('Account creation failed. Could not get user ID.');

      // Check if email confirmation is required
      if (!signUpData.session) {
        try {
          localStorage.setItem('tmms_pending_registration', JSON.stringify({
            role,
            email: formData.email,
            full_name: fullName,
            first_name: formData.first_name,
            last_name: formData.last_name,
            middle_name: formData.middle_name || null,
            contact_number: formData.contact_number,
            address: formData.address,
            organization: formData.organization,
            license_image_url: preUploadedLicenseUrl // Store the public URL, not base64
          }));
        } catch (e: any) {
          console.error('[TMMS] LocalStorage quota exceeded or failed:', e);
          alert('Error: Local storage failed. Please try again.');
          setLoading(false);
          return;
        }

        window.location.href = `/verify-otp?email=${encodeURIComponent(formData.email)}&role=${role}`;
        return;
      }

      // If email confirmation is disabled, user is instantly logged in
      // STEP 4: Insert profile
      await supabase.from('profiles').insert({
        id: userId,
        role,
        email: formData.email,
        full_name: fullName,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || null,
        approval_status: 'PENDING',
      });

      // STEP 5: Assign license URL if present
      const licenseImageUrl = preUploadedLicenseUrl;

      // STEP 6: Insert role-specific record
      if (role === 'DRIVER') {
        const { error: driverErr } = await supabase.from('drivers').upsert({
          profile_id: userId,
          full_name: fullName,
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || null,
          license_image_url: licenseImageUrl,
          contact_number: formData.contact_number,
          address: formData.address,
          status: 'PENDING',
        }, { onConflict: 'profile_id' });
        
        if (driverErr) console.error('[TMMS] Driver upsert error:', driverErr);
      } else if (role === 'OPERATOR') {
        const { error: opErr } = await supabase.from('operators').upsert({
          profile_id: userId,
          full_name: fullName,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || null,
          contact_number: formData.contact_number,
          organization: formData.organization,
          address: formData.address,
          status: 'PENDING',
        }, { onConflict: 'profile_id' });
        
        if (opErr) console.error('[TMMS] Operator upsert error:', opErr);
      }

      // STEP 7: Sign out
      await supabase.auth.signOut();
      setCurrentStep('success');

    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── SUCCESS UI ─────────────────────────────────────────────────────────────
  if (currentStep === 'success') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '40px 32px', maxWidth: 460, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Registration Submitted!</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            Your registration is <strong>pending admin approval</strong>. You will be notified once your account has been reviewed. Please check back later.
          </p>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: '0.82rem', color: '#92400e' }}>
            ⏳ Typical approval time: 1–2 business days
          </div>
          <Link to="/login" style={{ display: 'inline-block', padding: '12px 28px', background: '#0f172a', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── MAIN REGISTRATION UI ───────────────────────────────────────────────────
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
      <div className="auth-right" style={{ flex: '0 0 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: '#f8fafc', maxHeight: '100vh', overflowY: 'auto' }}>
      
        <div style={{ width: '100%', maxWidth: currentStep === 'details' ? 760 : 500, margin: 'auto', backgroundColor: '#ffffff', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden', transition: 'max-width 0.3s ease' }}>
        
        {/* Form Header */}
        <div style={{ padding: '32px 32px 0 32px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentStep === 'role-selection' ? '#3b82f6' : '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                {currentStep === 'role-selection' ? '1' : <CheckCircle size={14} />}
              </div>
              <div style={{ height: 2, width: 40, background: currentStep === 'details' ? '#22c55e' : '#e2e8f0' }} />
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentStep === 'details' ? '#3b82f6' : '#e2e8f0', color: currentStep === 'details' ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                2
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
            {currentStep === 'role-selection' ? 'Choose Your Role' : 'Account Details'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 24 }}>
            {currentStep === 'role-selection' 
              ? 'Select how you want to use the transport network.' 
              : `Fill in your details to register as a ${role?.toLowerCase()}.`}
          </p>
        </div>

        {error && (
          <div style={{ margin: '0 32px 20px 32px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* ── STEP 1: ROLE SELECTION ── */}
        {currentStep === 'role-selection' && (
          <div style={{ padding: '0 32px 40px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              {(['DRIVER', 'OPERATOR'] as Role[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    padding: '20px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    border: `2px solid ${role === r ? '#3b82f6' : '#e2e8f0'}`,
                    background: role === r ? '#eff6ff' : '#ffffff',
                    display: 'flex', alignItems: 'center', gap: 16,
                    transition: 'all 0.2s', boxShadow: role === r ? '0 4px 12px rgba(59,130,246,0.1)' : 'none'
                  }}
                  onMouseEnter={e => { if (role !== r) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseLeave={e => { if (role !== r) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: role === r ? '#3b82f6' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                    {r === 'DRIVER' 
                      ? <UserCheck size={28} color={role === r ? '#ffffff' : '#64748b'} /> 
                      : <Building2 size={28} color={role === r ? '#ffffff' : '#64748b'} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: role === r ? '#1e3a8a' : '#0f172a', marginBottom: 4 }}>
                      Register as {r === 'DRIVER' ? 'Driver' : 'Operator'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: role === r ? '#3b82f6' : '#64748b', lineHeight: 1.4 }}>
                      {r === 'DRIVER' ? 'I operate a PUV unit and need to manage my trips and records.' : 'I manage a fleet of vehicles and need to monitor multiple units.'}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={goToStep2}
              style={{
                width: '100%', padding: '14px', borderRadius: 8,
                background: '#0f172a', color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, transition: 'background 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
              onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
            >
              Continue to Details <ArrowRight size={16} />
            </button>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.8rem', color: '#64748b' }}>
              Already have an account? <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Sign in instead</Link>
            </div>
          </div>
        )}

        {/* ── STEP 2: DETAILS FORM ── */}
        {currentStep === 'details' && (
          <div style={{ padding: '0 32px 40px 32px' }}>
            <form onSubmit={handleSubmit}>
              
              {/* Name Section */}
              <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Personal Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Last Name *</label>
                    <input style={inputStyle} value={formData.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Dela Cruz" required />
                  </div>
                  <div>
                    <label style={labelStyle}>First Name *</label>
                    <input style={inputStyle} value={formData.first_name} onChange={e => update('first_name', e.target.value)} placeholder="Juan" required />
                  </div>
                  <div>
                    <label style={labelStyle}>Middle Name</label>
                    <input style={inputStyle} value={formData.middle_name} onChange={e => update('middle_name', e.target.value)} placeholder="Santos" />
                  </div>
                </div>
              </div>

              {/* Account Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px 24px', marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input type="email" style={inputStyle} value={formData.email} onChange={e => update('email', e.target.value)} placeholder="name@example.com" required />
                </div>
                <div>
                  <label style={labelStyle}>Contact Number * (11 digits)</label>
                  <input style={inputStyle} value={formData.contact_number} onChange={handleContactChange} placeholder="09XXXXXXXXX" maxLength={11} inputMode="numeric" pattern="[0-9]{11}" required />
                  {formData.contact_number.length > 0 && formData.contact_number.length !== 11 && (
                    <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 4 }}>{formData.contact_number.length}/11 digits required</div>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label style={labelStyle}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 40 }} value={formData.password} onChange={e => { update('password', e.target.value); setPasswordTouched(true); }} placeholder="Min. 8 characters" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 12px' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordTouched && (
                    <div style={{ marginTop: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                      {[
                        { key: 'minLength', label: 'At least 8 characters' },
                        { key: 'uppercase', label: 'One uppercase letter' },
                        { key: 'lowercase', label: 'One lowercase letter' },
                        { key: 'number', label: 'One number' },
                        { key: 'special', label: 'One special character (!@#$%...)' },
                      ].map(req => (
                        <div key={req.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: passwordReqs[req.key as keyof typeof passwordReqs] ? '#16a34a' : '#94a3b8', marginBottom: 4 }}>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: passwordReqs[req.key as keyof typeof passwordReqs] ? '#dcfce7' : '#f1f5f9', color: passwordReqs[req.key as keyof typeof passwordReqs] ? '#16a34a' : '#cbd5e1' }}>
                            {passwordReqs[req.key as keyof typeof passwordReqs] ? '✓' : ''}
                          </span>
                          {req.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={labelStyle}>Confirm Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input type="password" style={{ ...inputStyle, paddingRight: 40, cursor: 'text' }} value={formData.confirm_password} onChange={handleConfirmChange} onPaste={handleConfirmPaste} onCopy={e => e.preventDefault()} onCut={e => e.preventDefault()} placeholder="Repeat password" required />
                    <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', padding: '0 12px', cursor: 'not-allowed', pointerEvents: 'none' }}>
                      <EyeOff size={16} />
                    </span>
                  </div>
                  {confirmPasswordError && <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 4 }}>{confirmPasswordError}</div>}
                </div>
                
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Complete Address</label>
                  <input style={inputStyle} value={formData.address} onChange={e => update('address', e.target.value)} placeholder="House No., Street, Barangay, City/Municipality, Province" />
                </div>

                {/* Operator Specific */}
                {role === 'OPERATOR' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Organization / Cooperative Name</label>
                    <input style={inputStyle} value={formData.organization} onChange={e => update('organization', e.target.value)} placeholder="Enter the name of your cooperative or organization (if applicable)" />
                  </div>
                )}
              </div>

              {/* Driver Specific: License Upload (Only image, no text fields) */}
              {role === 'DRIVER' && (
                <div style={{ marginBottom: 32, background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <label style={{ ...labelStyle, marginBottom: 12 }}>Driver's License Image *</label>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageSelect} />
                  
                  {!licensePreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: '#ffffff', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                    >
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <Upload size={24} color="#64748b" />
                      </div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem', marginBottom: 6 }}>
                        Click to upload your driver's license
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: 280, margin: '0 auto' }}>
                        Please ensure the image is clear and readable. JPG, PNG, or WEBP (Max {MAX_FILE_SIZE_MB}MB)
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                      <img src={licensePreview} alt="License preview" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block', background: '#f8fafc' }} />
                      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
                        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                          <ImageIcon size={14} /> Change
                        </button>
                        <button type="button" onClick={removeImage} style={{ background: 'rgba(220,38,38,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                          <X size={14} /> Remove
                        </button>
                      </div>
                      <div style={{ padding: '10px 14px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', fontSize: '0.75rem', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} /> {licenseFile?.name} successfully attached
                      </div>
                    </div>
                  )}
                  {uploadError && (
                    <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', fontWeight: 500 }}>
                      <AlertCircle size={14} /> {uploadError}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={goBackToStep1}
                  disabled={loading}
                  style={{
                    flex: '0 0 auto', padding: '14px 20px', borderRadius: 8,
                    background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #e2e8f0',
                    cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#f1f5f9'; }}
                >
                  <ArrowLeft size={16} /> Back
                </button>

                <button
                  type="submit"
                  disabled={loading || !!confirmPasswordError || (role === 'DRIVER' && !licenseFile)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: 8,
                    background: (loading || !!confirmPasswordError || (role === 'DRIVER' && !licenseFile)) ? '#94a3b8' : '#3b82f6',
                    color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, border: 'none',
                    cursor: (loading || !!confirmPasswordError || (role === 'DRIVER' && !licenseFile)) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em',
                    boxShadow: (loading || !!confirmPasswordError || (role === 'DRIVER' && !licenseFile)) ? 'none' : '0 4px 12px rgba(59,130,246,0.2)'
                  }}
                  onMouseEnter={e => { if (!(loading || !!confirmPasswordError || (role === 'DRIVER' && !licenseFile))) e.currentTarget.style.background = '#2563eb'; }}
                  onMouseLeave={e => { if (!(loading || !!confirmPasswordError || (role === 'DRIVER' && !licenseFile))) e.currentTarget.style.background = '#3b82f6'; }}
                >
                  {loading ? 'Submitting Registration...' : 'Complete Registration'}
                </button>
              </div>

            </form>
          </div>
        )}
      </div>
      
      </div>
    </div>
  );
}
