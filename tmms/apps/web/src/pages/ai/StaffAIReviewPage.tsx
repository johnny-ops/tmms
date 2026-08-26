import { useState, useEffect, useCallback } from 'react';
import {
  Camera, AlertTriangle, CheckCircle, XCircle, Eye, Search,
  Clock, MapPin, Shield, User, Car, FileText, ChevronRight,
  AlertCircle, Loader, RefreshCw, Info, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime, formatDate, formatCurrency, getStatusBadgeClass, formatStatus } from '@/lib/utils';
import { useTable, useRealtime } from '@/hooks/useSupabase';




interface AICandidate {
  id: string;
  camera_id?: string;
  plate_number: string;
  vehicle_type?: string;
  rule_triggered: string;
  location?: string;
  ai_confidence: number;
  evidence_image_url?: string;
  verification_status: string;
  created_at: string;
  staff_plate_entry?: string;
  is_registered?: boolean;
  matched_vehicle_id?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

interface PUVMatch {
  id: string;
  plate_number: string;
  body_number?: string;
  make: string;
  model: string;
  year?: number;
  status: string;
  registration_expiry?: string;
  operator_id?: string;
  operator?: { id: string; full_name: string; contact_number?: string };
}

type ReviewStep = 'evidence' | 'puv_search' | 'confirm';
type PUVSearchStatus = 'idle' | 'searching' | 'match_found' | 'no_match';




function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? '#dc2626' : pct >= 60 ? '#d97706' : '#64748b';
  return (
    <span style={{
      fontSize: '0.8rem', fontWeight: 700, color,
      background: pct >= 85 ? '#fef2f2' : pct >= 60 ? '#fffbeb' : '#f1f5f9',
      padding: '2px 8px', borderRadius: 6, border: `1px solid ${pct >= 85 ? '#fecaca' : pct >= 60 ? '#fde68a' : '#e2e8f0'}`
    }}>
      {pct}% Confidence
    </span>
  );
}




function StatusPill({ status }: { status: string }) {
  const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
    AI_SUGGESTED:  { label: 'AI Detected',       bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    PENDING_REVIEW:{ label: 'Pending Review',     bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    UNDER_REVIEW:  { label: 'Under Review',       bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    VERIFIED:      { label: 'Confirmed',          bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    REJECTED:      { label: 'Rejected',           bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  };
  const c = configs[status] || { label: status, bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}




function EvidencePanel({ url, candidate }: { url?: string; candidate: AICandidate }) {
  const [imgError, setImgError] = useState(false);

  if (!url) {
    return (
      <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '32px', textAlign: 'center' }}>
        <Camera size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No evidence frame captured</p>
        <p style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 4 }}>The AI detection was recorded without an image capture</p>
      </div>
    );
  }

  const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.avi');
  if (isVideo) {
    return (
      <video controls style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', maxHeight: 280, background: '#000' }}>
        <source src={url} />
        Your browser does not support video.
      </video>
    );
  }

  return (
    <>
      <img
        src={url}
        alt="AI Detection Evidence"
        onError={() => setImgError(true)}
        style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', maxHeight: 280, objectFit: 'contain', background: '#0f172a', display: imgError ? 'none' : 'block' }}
      />
      {imgError && (
        <div style={{ background: '#fef2f2', border: '1px dashed #fecaca', borderRadius: 8, padding: '32px', textAlign: 'center' }}>
          <AlertTriangle size={32} color="#f87171" style={{ margin: '0 auto 8px' }} />
          <p style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>Image failed to load</p>
          <p style={{ color: '#b91c1c', fontSize: '0.72rem', marginTop: 4 }}>
            The evidence exists but cannot be displayed. This usually happens if the Supabase storage bucket "evidence" is not set to Public.
          </p>
          <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: 8, display: 'inline-block' }}>Open Image Directly</a>
        </div>
      )}
    </>
  );
}




function ReviewModal({
  candidate,
  violationTypes,
  onClose,
  onResolved
}: {
  candidate: AICandidate;
  violationTypes: any[];
  onClose: () => void;
  onResolved: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<ReviewStep>('evidence');
  const [puvSearchQuery, setPuvSearchQuery] = useState(candidate.plate_number || '');
  const [puvStatus, setPuvStatus] = useState<PUVSearchStatus>('idle');
  const [puvMatch, setPuvMatch] = useState<PUVMatch | null>(null);
  const [selectedViolationType, setSelectedViolationType] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const selectedVT = violationTypes.find(v => v.id === selectedViolationType);

  
  useEffect(() => {
    supabase
      .from('ai_violation_candidates')
      .update({ verification_status: 'UNDER_REVIEW', reviewed_by: user?.id })
      .eq('id', candidate.id);
  }, []);

  async function searchPUV() {
    if (!puvSearchQuery.trim()) return;
    setPuvStatus('searching');
    setPuvMatch(null);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, operator:operators(id, full_name, contact_number)')
        .or(`plate_number.ilike.%${puvSearchQuery}%,body_number.ilike.%${puvSearchQuery}%`)
        .limit(1)
        .single();

      if (error || !data) {
        setPuvStatus('no_match');
      } else {
        setPuvMatch(data as PUVMatch);
        setPuvStatus('match_found');
      }
    } catch {
      setPuvStatus('no_match');
    }
  }

  async function confirmViolation() {
    if (!selectedViolationType) {
      alert('Please select a violation type before confirming.');
      return;
    }
    setIsSubmitting(true);
    try {
      const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
      const now = new Date();

      const ticketPayload: any = {
        ticket_number: ticketNumber,
        plate_number: puvMatch?.plate_number || puvSearchQuery || candidate.plate_number || 'UNKNOWN',
        violation_type_id: selectedViolationType,
        location: candidate.location || 'Location not recorded',
        incident_date: now.toISOString().split('T')[0],
        incident_time: now.toTimeString().slice(0, 8),
        penalty_amount: selectedVT?.penalty_amount || 0,
        status: 'ISSUED',
        payment_status: 'UNPAID',
        notes: staffNotes,
        evidence_url: candidate.evidence_image_url || null,
        ai_detection_id: candidate.id,
        is_registered: puvStatus === 'match_found',
        issued_by: user?.id,
      };

      
      if (puvStatus === 'match_found' && puvMatch) {
        ticketPayload.vehicle_id = puvMatch.id;
        ticketPayload.operator_id = puvMatch.operator_id || null;
      }

      const { error: ticketError } = await supabase.from('traffic_tickets').insert(ticketPayload);
      if (ticketError) throw ticketError;

      
      await supabase.from('ai_violation_candidates').update({
        verification_status: 'VERIFIED',
        reviewed_by: user?.id,
        reviewed_at: now.toISOString(),
        is_registered: puvStatus === 'match_found',
        matched_vehicle_id: puvMatch?.id || null,
        staff_plate_entry: puvSearchQuery,
      }).eq('id', candidate.id);

      onResolved();
      onClose();
    } catch (err: any) {
      alert('Error creating violation: ' + err.message);
    }
    setIsSubmitting(false);
  }

  async function rejectDetection() {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from('ai_violation_candidates').update({
        verification_status: 'REJECTED',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      }).eq('id', candidate.id);
      onResolved();
      onClose();
    } catch (err: any) {
      alert('Error rejecting detection: ' + err.message);
    }
    setIsSubmitting(false);
  }

  const STEP_LABELS: { key: ReviewStep; label: string }[] = [
    { key: 'evidence', label: '1. Evidence Review' },
    { key: 'puv_search', label: '2. PUV Database Search' },
    { key: 'confirm', label: '3. Confirm / Reject' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 700, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>

        {}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#0f172a', borderRadius: '14px 14px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Camera size={18} color="#f59e0b" />
                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  AI DETECTION REVIEW
                </span>
              </div>
              <h2 style={{ color: 'white', fontSize: '1rem', fontWeight: 700 }}>{candidate.rule_triggered}</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>
                {candidate.vehicle_type || 'Vehicle'} · {formatDateTime(candidate.created_at)}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
              <XCircle size={22} />
            </button>
          </div>

          {}
          <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
            {STEP_LABELS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setStep(s.key)}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 6, border: 'none',
                  background: step === s.key ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                  color: step === s.key ? 'white' : '#94a3b8',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '24px' }}>

          {}
          {step === 'evidence' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>Vehicle Type</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{candidate.vehicle_type || 'Not identified'}</div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>Possible Violation</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#991b1b' }}>{candidate.rule_triggered}</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>Date / Time</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{formatDateTime(candidate.created_at)}</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>Location</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{candidate.location || 'Not recorded'}</div>
                </div>
              </div>

              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>AI Confidence</span>
                <ConfidenceBadge value={candidate.ai_confidence} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Evidence Frame</div>
                <EvidencePanel url={candidate.evidence_image_url} candidate={candidate} />
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600, marginBottom: 2 }}>AI Detection — Requires Staff Verification</p>
                  <p style={{ fontSize: '0.75rem', color: '#92400e' }}>
                    This is an AI-generated detection only. You must review the evidence, search the PUV database, and manually confirm or reject this violation.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setStep('puv_search')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Proceed to PUV Search <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {}
          {step === 'puv_search' && (
            <div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Info size={16} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>Staff Action Required</p>
                  <p style={{ fontSize: '0.75rem', color: '#1e40af' }}>
                    Search the PUV database using available vehicle information. If the AI detected a plate number, it is pre-filled below. You may change it or search by body number.
                  </p>
                </div>
              </div>

              {}
              {candidate.plate_number && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, marginBottom: 2 }}>AI-DETECTED PLATE (NOT VERIFIED)</div>
                    <code style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', letterSpacing: '0.1em' }}>{candidate.plate_number}</code>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPuvSearchQuery(candidate.plate_number)}>
                    Use This
                  </button>
                </div>
              )}

              {}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Search PUV Database
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    placeholder="Enter plate number, body number..."
                    value={puvSearchQuery}
                    onChange={e => { setPuvSearchQuery(e.target.value.toUpperCase()); setPuvStatus('idle'); }}
                    onKeyDown={e => e.key === 'Enter' && searchPUV()}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={searchPUV}
                    disabled={puvStatus === 'searching' || !puvSearchQuery.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {puvStatus === 'searching' ? <Loader size={14} /> : <Search size={14} />}
                    Search
                  </button>
                </div>
              </div>

              {}
              {puvStatus === 'searching' && (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '0.85rem' }}>
                  <Loader size={24} style={{ margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
                  Searching PUV database...
                </div>
              )}

              {puvStatus === 'match_found' && puvMatch && (
                <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <CheckCircle size={18} color="#16a34a" />
                    <span style={{ fontWeight: 700, color: '#15803d', fontSize: '0.9rem' }}>PUV MATCH FOUND — REGISTERED VEHICLE</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Plate Number', value: puvMatch.plate_number },
                      { label: 'Body Number', value: puvMatch.body_number || 'N/A' },
                      { label: 'Vehicle', value: `${puvMatch.make} ${puvMatch.model} ${puvMatch.year || ''}`.trim() },
                      { label: 'Status', value: puvMatch.status },
                      { label: 'Operator', value: puvMatch.operator?.full_name || 'N/A' },
                      { label: 'Reg. Expiry', value: puvMatch.registration_expiry ? formatDate(puvMatch.registration_expiry) : 'N/A' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'white', borderRadius: 6, padding: '8px 12px' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {puvStatus === 'no_match' && (
                <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <AlertCircle size={18} color="#d97706" />
                    <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }}>NO PUV MATCH FOUND</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#92400e', marginBottom: 4 }}>
                    No registered PUV record found for "{puvSearchQuery}" in the database.
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#b45309' }}>
                    Vehicle Status: <strong>UNREGISTERED</strong>. You may still confirm the violation as an unregistered vehicle violation.
                  </p>
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setStep('evidence')}>
                  ← Back to Evidence
                </button>
                <button
                  className="btn btn-primary"
                  disabled={puvStatus === 'idle' || puvStatus === 'searching'}
                  onClick={() => setStep('confirm')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Proceed to Confirm <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {}
          {step === 'confirm' && (
            <div>
              {}
              <div style={{
                background: puvStatus === 'match_found' ? '#f0fdf4' : '#fffbeb',
                border: `2px solid ${puvStatus === 'match_found' ? '#86efac' : '#fde68a'}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                {puvStatus === 'match_found'
                  ? <Shield size={18} color="#16a34a" />
                  : <AlertCircle size={18} color="#d97706" />
                }
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: puvStatus === 'match_found' ? '#15803d' : '#92400e' }}>
                    {puvStatus === 'match_found'
                      ? `Registered Vehicle: ${puvMatch?.plate_number} — ${puvMatch?.make} ${puvMatch?.model}`
                      : `Unregistered Vehicle — Plate: ${puvSearchQuery || 'Not entered'}`
                    }
                  </div>
                  <div style={{ fontSize: '0.75rem', color: puvStatus === 'match_found' ? '#166534' : '#b45309' }}>
                    {puvStatus === 'match_found' ? `Operator: ${puvMatch?.operator?.full_name || 'Unknown'}` : 'No matching PUV record found'}
                  </div>
                </div>
              </div>

              {}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Violation Type <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select className="form-input" value={selectedViolationType} onChange={e => setSelectedViolationType(e.target.value)}>
                  <option value="">Select the confirmed violation type...</option>
                  {violationTypes.map(v => (
                    <option key={v.id} value={v.id}>{v.code} — {v.name}</option>
                  ))}
                </select>
                {selectedVT && (
                  <div style={{ marginTop: 6, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '6px 10px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#9a3412' }}>
                      Penalty: <strong>{formatCurrency(selectedVT.penalty_amount)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Staff Notes (Optional)
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Add any additional notes about this violation..."
                  value={staffNotes}
                  onChange={e => setStaffNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {}
              {showRejectForm && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#991b1b', marginBottom: 8 }}>Rejection Reason</div>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Explain why this detection is being rejected (e.g., false positive, insufficient evidence)..."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    style={{ resize: 'vertical', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowRejectForm(false)}>Cancel</button>
                    <button className="btn btn-danger btn-sm" disabled={isSubmitting || !rejectionReason.trim()} onClick={rejectDetection}>
                      {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}

              {}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setStep('puv_search')}>
                  ← Back to PUV Search
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!showRejectForm && (
                    <button className="btn btn-danger" onClick={() => setShowRejectForm(true)} disabled={isSubmitting}>
                      <XCircle size={14} /> Reject Detection
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={confirmViolation}
                    disabled={isSubmitting || !selectedViolationType}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {isSubmitting ? (
                      <><Loader size={14} /> Confirming...</>
                    ) : puvStatus === 'match_found' ? (
                      <><CheckCircle size={14} /> Confirm Registered Violation</>
                    ) : (
                      <><CheckCircle size={14} /> Confirm Unregistered Violation</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




export function StaffAIReviewPage() {
  const [candidates, setCandidates] = useState<AICandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [reviewingCandidate, setReviewingCandidate] = useState<AICandidate | null>(null);
  const { data: violationTypes } = useTable('violation_types');

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ai_violation_candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('verification_status', statusFilter);
      }

      const { data, error } = await query;
      if (!error) setCandidates((data || []) as AICandidate[]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  
  useRealtime('ai_violation_candidates',
    () => fetchCandidates(),
    () => fetchCandidates()
  );

  const STATUS_FILTERS = [
    { value: 'PENDING_REVIEW', label: 'Pending Review' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
    { value: 'AI_SUGGESTED', label: 'AI Detected (New)' },
    { value: 'VERIFIED', label: 'Confirmed' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: '', label: 'All Detections' },
  ];

  const pendingCount = candidates.filter(c => c.verification_status === 'PENDING_REVIEW').length;

  return (
    <div>
      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Camera size={22} color="#1d4ed8" />
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              AI Detection Review
            </h1>
            {pendingCount > 0 && (
              <span style={{ background: '#dc2626', color: 'white', fontSize: '0.72rem', fontWeight: 700, borderRadius: 99, padding: '2px 8px' }}>
                {pendingCount} pending
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Review AI-detected violations. You must verify evidence, search the PUV database, and confirm or reject each detection.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pendingCount > 0 && (
            <button className="btn btn-danger btn-sm" onClick={async () => {
              if (!confirm('Are you sure you want to DELETE ALL pending violation candidates? This cannot be undone.')) return;
              try {
                const { error } = await supabase.from('ai_violation_candidates')
                  .delete()
                  .in('verification_status', ['PENDING_REVIEW', 'AI_SUGGESTED']);
                if (error) throw error;
                fetchCandidates();
              } catch(e: any) { 
                console.error(e);
                alert('Delete failed: ' + e.message);
              }
            }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={13} /> Delete All
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetchCandidates} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.78rem', color: '#1e40af' }}>
          <span style={{ fontWeight: 600 }}>WORKFLOW:</span>
          {['AI Detects Vehicle', 'AI Flags Possible Violation', 'Staff Reviews Evidence', 'Staff Searches PUV Database', 'Staff Confirms or Rejects'].map((step, i, arr) => (
            <div key={step} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{step}</span>
              {i < arr.length - 1 && <ChevronRight size={12} color="#93c5fd" />}
            </div>
          ))}
        </div>
      </div>

      {}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            style={{
              padding: '6px 14px', borderRadius: 99, border: '1px solid',
              borderColor: statusFilter === f.value ? '#3b82f6' : '#e2e8f0',
              background: statusFilter === f.value ? '#eff6ff' : 'white',
              color: statusFilter === f.value ? '#1d4ed8' : '#64748b',
              fontSize: '0.78rem', fontWeight: statusFilter === f.value ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
          <Loader size={28} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p>Loading detections...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <CheckCircle size={40} color="#86efac" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>No detections found</p>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            {statusFilter === 'PENDING_REVIEW' ? 'All AI detections have been reviewed.' : 'No detections match the selected filter.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Possible Violation</th>
                <th>Confidence</th>
                <th>Time</th>
                <th>Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.vehicle_type || 'Unknown'}</div>
                    {c.plate_number && <code style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.plate_number}</code>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#dc2626', fontSize: '0.85rem' }}>{c.rule_triggered}</div>
                  </td>
                  <td>
                    <ConfidenceBadge value={c.ai_confidence} />
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatDate(c.created_at)}</div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} color="#94a3b8" />
                      {c.location || 'N/A'}
                    </div>
                  </td>
                  <td><StatusPill status={c.verification_status} /></td>
                  <td>
                    {(c.verification_status === 'PENDING_REVIEW' || c.verification_status === 'AI_SUGGESTED' || c.verification_status === 'UNDER_REVIEW') && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setReviewingCandidate(c)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Eye size={12} /> Review
                      </button>
                    )}
                    {c.verification_status === 'VERIFIED' && (
                      <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle2 size={12} /> Confirmed
                      </span>
                    )}
                    {c.verification_status === 'REJECTED' && (
                      <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <XCircle size={12} /> Rejected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {}
      {reviewingCandidate && (
        <ReviewModal
          candidate={reviewingCandidate}
          violationTypes={violationTypes}
          onClose={() => setReviewingCandidate(null)}
          onResolved={() => { setReviewingCandidate(null); fetchCandidates(); }}
        />
      )}
    </div>
  );
}
