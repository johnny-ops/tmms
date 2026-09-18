import { useNavigate } from 'react-router-dom';
import { ArrowRight, Car, UserCog, MapPin, ShieldCheck, BarChart3, Brain, Eye, Menu, X, ChevronRight, Bus, Bot, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ─── DATA ─────────────────────────────────────────────────
const SERVICES = [
  {
    icon: <Car size={26} className="text-blue-600" />,
    title: 'Driver Management',
    desc: 'Register, track, and manage PUV drivers with digital profiles, license records, and real-time violation history.',
    link: '/login',
    cta: 'Driver Portal',
  },
  {
    icon: <UserCog size={26} className="text-orange-500" />,
    title: 'Operator Portal',
    desc: 'Full oversight of transport franchises, fleet vehicles, assigned drivers, and compliance status — all in one place.',
    link: '/login',
    cta: 'Operator Portal',
  },
  {
    icon: <Eye size={26} className="text-indigo-600" />,
    title: 'AI Violation Detection',
    desc: 'YOLOv8-powered real-time CCTV monitoring that automatically detects red-light, overspeeding, and parking violations.',
    link: '/login',
    cta: 'Learn More',
  },
  {
    icon: <MapPin size={26} className="text-green-600" />,
    title: 'Franchise & Routes',
    desc: 'Manage PUV franchise applications, route assignments, terminal locations, and parking areas digitally.',
    link: '/login',
    cta: 'Learn More',
  },
  {
    icon: <BarChart3 size={26} className="text-purple-600" />,
    title: 'Traffic Analytics',
    desc: 'Data-driven forecasting, route optimization, and operational analytics to keep your city moving efficiently.',
    link: '/login',
    cta: 'Learn More',
  },
  {
    icon: <ShieldCheck size={26} className="text-red-500" />,
    title: 'Compliance & Inspections',
    desc: 'Schedule vehicle inspections, track registration renewals, and enforce compliance standards automatically.',
    link: '/login',
    cta: 'Learn More',
  },
];

// Dynamic stats are loaded inside the component instead of being hardcoded


const PARTNERS = ['LTFRB', 'LTO', 'MMDA', 'DOTr', 'DILG', 'ARTA'];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [stats, setStats] = useState([
    { value: '...', label: 'Registered Vehicles' },
    { value: '...', label: 'Licensed Drivers' },
    { value: '...', label: 'Active Operators' },
    { value: '99.9%', label: 'System Uptime' },
  ]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [veh, drv, op] = await Promise.all([
          supabase.from('vehicles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'DRIVER'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'OPERATOR')
        ]);
        setStats([
          { value: (veh.count || 0).toString(), label: 'Registered Vehicles' },
          { value: (drv.count || 0).toString(), label: 'Licensed Drivers' },
          { value: (op.count || 0).toString(), label: 'Active Operators' },
          { value: '99.9%', label: 'System Uptime' },
        ]);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }
    }
    loadStats();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ══ NAVBAR ══════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 68,
        background: 'rgba(7,15,38,0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.2)', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
            <img src="/govserve.png" alt="TMMS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '-0.01em' }}>TMMS <span style={{ color: '#f97316', fontWeight: 400, fontSize: '0.75rem' }}>Portal</span></span>
        </div>

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden md:flex">
          {['Home', 'About Us', 'Services', 'Contact Us'].map(n => (
            <a key={n} href="#" className="nav-link" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.9rem', opacity: 0.8 }}>{n}</a>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.18)', transition: 'all 0.2s', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
            Log In
          </button>
          <button onClick={() => navigate('/register')} style={{ padding: '8px 20px', fontSize: '0.82rem', background: '#f97316', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>Register</button>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'none' }} className="md:hidden">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section className="hero-img" style={{ minHeight: '100vh', paddingTop: 68, position: 'relative', display: 'flex', flexDirection: 'column', background: 'url(/hero-bg.jpg) center/cover no-repeat', backgroundColor: '#050c23' }}>
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,12,35,0.95) 0%, rgba(5,12,35,0.70) 55%, rgba(5,12,35,0.30) 100%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px 40px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            <h1 className="fade-up d2" style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 900, color: '#fff', lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20 }}>
              Smart Transport &amp;<br />
              <span style={{ color: '#f97316' }}>Mobility Solutions</span><br />
              That Move Cities.
            </h1>

            <p className="fade-up d3" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', lineHeight: 1.75, marginBottom: 36, maxWidth: 560 }}>
              A centralized digital platform for managing PUV franchises, real-time AI violation monitoring, driver and operator registrations, and traffic analytics — all in one system.
            </p>

            <div className="fade-up d4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => navigate('/register')} style={{ padding: '14px 28px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                Register Now <ArrowRight size={16} />
              </button>
              <button onClick={() => navigate('/login')} style={{ padding: '14px 28px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                Sign In <ChevronRight size={16} />
              </button>
            </div>

            {/* Social proof */}
            <div className="fade-up d5" style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 40, justifyContent: 'center' }}>
              <div style={{ display: 'flex' }}>
                {['#1d4ed8','#2563eb','#3b82f6','#60a5fa'].map((c, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: '2px solid rgba(255,255,255,0.4)', marginLeft: i === 0 ? 0 : -10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCog size={14} color="#fff" />
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>Government Certified</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Trusted by local authorities</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ position: 'relative', zIndex: 2, background: 'rgba(5,12,35,0.85)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '28px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#f97316', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{s.value}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TRUSTED PARTNERS ════════════════════════════════ */}
      <section style={{ background: '#f9fafb', padding: '40px 40px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 }}>
            ★ Trusted & Accredited Government Agencies
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
            {PARTNERS.map((p, i) => (
              <div key={i} style={{ fontWeight: 800, fontSize: '1rem', color: '#6b7280', letterSpacing: '0.05em', opacity: 0.7 }}>{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT SECTION ═══════════════════════════════════ */}
      <section style={{ padding: '100px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 80, alignItems: 'center' }}>

          {/* Left text */}
          <div>
            <p style={{ color: '#f97316', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              ★ About TMMS
            </p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 20 }}>
              Your Trusted Partner<br />in Modern Transport Management
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.975rem', lineHeight: 1.75, marginBottom: 16 }}>
              TMMS (Transport & Mobility Management System) is the official digital platform for local government units to manage public utility vehicles, enforce compliance, and deliver transport services digitally.
            </p>
            <p style={{ color: '#64748b', fontSize: '0.975rem', lineHeight: 1.75, marginBottom: 32 }}>
              Our vision is to build a smarter transport ecosystem powered by AI, data, and innovation — connecting drivers, operators, and regulators in one unified system.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/login')} style={{ padding: '12px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>Access Dashboard <ArrowRight size={16} /></button>
              <button onClick={() => navigate('/register')} style={{ padding: '12px 24px', background: 'transparent', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Create Account</button>
            </div>
          </div>

          {/* Right feature mini-cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: <Bus size={28} color="#2563eb" />, title: 'PUV Fleet Management', desc: 'Full digital management of buses, jeepneys, and tricycles.' },
              { icon: <Bot size={28} color="#f97316" />, title: 'AI-Powered CCTV', desc: 'Real-time YOLOv8 violation detection from live camera feeds.' },
              { icon: <BarChart3 size={28} color="#9333ea" />, title: 'Route Analytics', desc: 'Traffic forecasting and route optimization for better flow.' },
              { icon: <FileText size={28} color="#16a34a" />, title: 'Digital Compliance', desc: 'Paperless inspections, registrations, and franchise renewals.' },
            ].map((f, i) => (
              <div key={i} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '22px 20px', transition: 'all 0.2s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>{f.icon}</div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', marginBottom: 6 }}>{f.title}</p>
                <p style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SERVICES SECTION ════════════════════════════════ */}
      <section style={{ padding: '100px 40px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: '#f97316', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              ★ Our Services
            </p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 14 }}>
              Delivering Excellence Every Mile
            </h2>
            <p style={{ color: '#64748b', maxWidth: 500, margin: '0 auto', fontSize: '0.975rem', lineHeight: 1.7 }}>
              Everything your municipal transport authority needs to deliver fast, safe, and efficient public transport services.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {SERVICES.map((s, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 32, borderRadius: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  {s.icon}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: 18 }}>{s.desc}</p>
                <button onClick={() => navigate(s.link)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#2563eb', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', transition: 'gap 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
                  onMouseLeave={e => { e.currentTarget.style.gap = '5px'; }}>
                  {s.cta} <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ROLE SELECTION / CTA BANNER ═════════════════════ */}
      <section style={{ padding: '100px 40px', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(37,99,235,0.10)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 350, height: 350, borderRadius: '50%', background: 'rgba(249,115,22,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: '#f97316', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              ★ Get Started
            </p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 14 }}>
              Who Are You?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.975rem', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
              Select your role to access your dedicated portal and manage your transport services.
            </p>
          </div>

          {/* Role cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>

            {/* Driver */}
            <div onClick={() => navigate('/login')} style={{ display: 'block', textDecoration: 'none', borderRadius: 16, padding: '36px 32px', background: 'rgba(37,99,235,0.10)', border: '1.5px solid rgba(37,99,235,0.3)', transition: 'all 0.25s', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.18)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.6)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.10)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ position: 'absolute', top: 16, right: 16, opacity: 0.06 }}><Car size={80} color="#60a5fa" /></div>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Car size={26} color="#60a5fa" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Are you a</p>
              <h3 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>Driver?</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.65, marginBottom: 22 }}>
                Access your driver profile, view your vehicles, track violations, and submit applications.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem' }}>
                Login to Driver Portal <ArrowRight size={15} />
              </div>
            </div>

            {/* Operator */}
            <div onClick={() => navigate('/login')} style={{ display: 'block', textDecoration: 'none', borderRadius: 16, padding: '36px 32px', background: 'rgba(249,115,22,0.08)', border: '1.5px solid rgba(249,115,22,0.25)', transition: 'all 0.25s', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.15)'; e.currentTarget.style.borderColor = 'rgba(251,146,60,0.55)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.08)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ position: 'absolute', top: 16, right: 16, opacity: 0.06 }}><UserCog size={80} color="#fb923c" /></div>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(251,146,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <UserCog size={26} color="#fb923c" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Are you an</p>
              <h3 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>Operator?</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.65, marginBottom: 22 }}>
                Manage your transport franchises, fleet vehicles, registered drivers, and compliance status.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fb923c', fontWeight: 700, fontSize: '0.85rem' }}>
                Login to Operator Portal <ArrowRight size={15} />
              </div>
            </div>

          </div>

          {/* Register CTA */}
          <div style={{ textAlign: 'center', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: 16 }}>
              New to the system? Create your account today.
            </p>
            <button onClick={() => navigate('/register')} style={{ padding: '14px 28px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Register Now — It's Free <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════ */}
      <footer style={{ background: '#040c22', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}>
              Powered by Advanced AI — GOVSERVE Platform
            </span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy Policy', 'Terms of Service', 'Contact'].map(l => (
              <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; }}>
                {l}
              </a>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
            © {new Date().getFullYear()} TMMS. All rights reserved.
          </span>
        </div>
      </footer>

    </div>
  );
}
