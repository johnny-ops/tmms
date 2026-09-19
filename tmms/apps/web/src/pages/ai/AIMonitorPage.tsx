import { useNavigate } from 'react-router-dom';
import { 
  Camera, CheckCircle, XCircle, Eye, AlertTriangle, Clock, 
  Cpu, Play, Square, Activity, Video, Upload, FileVideo, X, ArrowRight, Bell, ShieldAlert, List, Car, Maximize2, Hash, FolderOpen, Check
} from 'lucide-react';
import { formatDateTime, getStatusBadgeClass, formatStatus, confidenceLabel, confidenceColor } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTable } from '@/hooks/useSupabase';

const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';

const VIOLATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BEAT_RED_LIGHT:  { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  SWERVING:        { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  ILLEGAL_PARKING: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  OBSTRUCTION:     { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  OVERSPEEDING:    { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
};

interface AnalysisResult {
  success: boolean;
  video: { filename: string; duration_s: number; total_frames: number; frames_analyzed: number };
  summary: { vehicles_detected: number; vehicle_types: Record<string, number>; violations_detected: number; violations_saved_to_db: number };
  violations: any[];
  detections_sample: any[];
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Confidence</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: confidenceColor(value) }}>
          {pct}% — {confidenceLabel(value)}
        </span>
      </div>
      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: confidenceColor(value), borderRadius: 9999, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function CandidateCard({
  candidate, onSendToReview, onReject
}: {
  candidate: any;
  onSendToReview: () => void;
  onReject: () => void;
}) {
  return (
    <div style={{
      background: 'white', border: '2px solid #fecaca', borderRadius: 10,
      padding: 16, boxShadow: '0 2px 8px rgba(239,68,68,0.08)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
            {candidate.vehicle_type && <span style={{ color: '#3b82f6', fontSize: '0.78rem', fontWeight: 600, marginRight: 6 }}>{candidate.vehicle_type}</span>}
            {candidate.rule_triggered}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {candidate.location ?? 'Location pending staff review'}
          </div>
        </div>
        <span className="badge badge-pending" style={{ flexShrink: 0 }}>
          Awaiting Review
        </span>
      </div>

      <ConfidenceMeter value={candidate.ai_confidence} />

      <div style={{ marginTop: 12, padding: '10px', background: '#fef9f0', borderRadius: 8, border: '1px solid #fde68a' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <AlertTriangle size={12} color="#d97706" />
          <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600 }}>
            AI-Suggested — Staff must review, search PUV database, and confirm before any violation is issued
          </span>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        {candidate.evidence_image_url && (
          <a href={candidate.evidence_image_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            <Eye size={12} /> Evidence
          </a>
        )}
        <button className="btn btn-danger btn-sm" onClick={onReject}><XCircle size={12} /> Dismiss</button>
        <button className="btn btn-primary btn-sm" onClick={onSendToReview} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowRight size={12} /> Send to Review
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#94a3b8', textAlign: 'right' }}>
        {formatDateTime(candidate.created_at)}
      </div>
    </div>
  );
}

function LiveViolationAlert({
  violationAlert,
  onDismiss,
  onSendToReview,
}: {
  violationAlert: any;
  onDismiss: () => void;
  onSendToReview: () => void;
}) {
  const colors: Record<string, { bg: string; border: string; badge: string; badgeText: string }> = {
    BEAT_RED_LIGHT:  { bg: '#fff1f2', border: '#fca5a5', badge: '#dc2626', badgeText: 'BEAT RED LIGHT' },
    SWERVING:        { bg: '#fff7ed', border: '#fcd34d', badge: '#d97706', badgeText: 'SWERVING' },
    ILLEGAL_PARKING: { bg: '#fffbeb', border: '#fde68a', badge: '#92400e', badgeText: 'ILLEGAL PARKING' },
    OBSTRUCTION:     { bg: '#f0fdf4', border: '#86efac', badge: '#166534', badgeText: 'OBSTRUCTION' },
    OVERSPEEDING:    { bg: '#fdf4ff', border: '#d8b4fe', badge: '#7e22ce', badgeText: 'OVERSPEEDING' },
  };
  const rule = violationAlert.rule_triggered || 'UNKNOWN';
  const theme = colors[rule] || { bg: '#f8fafc', border: '#cbd5e1', badge: '#475569', badgeText: rule };

  return (
    <div style={{
      background: theme.bg,
      border: `2px solid ${theme.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      width: 360,
      animation: 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div style={{ alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #fecaca' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={24} color="#dc2626" /> VIOLATION DETECTED
        </h2>
        <button onClick={onDismiss} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4,
          color: 'white', cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem',
        }}>
          <X size={16} />
        </button>
      </div>

      {violationAlert.evidence_frame && (
        <div style={{ background: '#000', position: 'relative' }}>
          <img
            src={violationAlert.evidence_frame}
            alt="Evidence"
            style={{ width: '100%', maxHeight: 180, objectFit: 'contain', display: 'block' }}
          />
          <div style={{
            position: 'absolute', bottom: 6, left: 6,
            background: theme.badge,
            color: 'white', fontSize: '0.7rem', fontWeight: 700,
            padding: '3px 8px', borderRadius: 4,
          }}>{theme.badgeText}</div>
        </div>
      )}

      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
              {violationAlert.vehicle_type && <span style={{ color: '#3b82f6', marginRight: 6, fontSize: '0.78rem' }}>{violationAlert.vehicle_type}</span>}
              {rule}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {violationAlert.location || 'Location pending staff review'}
              {violationAlert.violation_reason && <> · <em>{violationAlert.violation_reason}</em></>}
            </div>
          </div>
          <div style={{
            background: 'white', border: `1px solid ${theme.border}`,
            borderRadius: 8, padding: '4px 8px', textAlign: 'center', flexShrink: 0
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: theme.badge }}>
              {Math.round((violationAlert.ai_confidence || 0) * 100)}%
            </div>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>confidence</div>
          </div>
        </div>

        {violationAlert.plate_number && violationAlert.plate_number !== 'UNKNOWN' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
            <Hash size={14} color="#64748b" /> Plate: <code style={{ fontWeight: 700, color: '#0f172a' }}>{violationAlert.plate_number}</code>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={onDismiss} style={{
            flex: 1, padding: '6px 0', background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: 6, fontSize: '0.78rem', color: '#64748b', cursor: 'pointer', fontWeight: 600,
          }}>Dismiss</button>
          <button onClick={onSendToReview} style={{
            flex: 2, padding: '6px 0', background: theme.badge,
            border: 'none', borderRadius: 6, fontSize: '0.78rem', color: 'white', cursor: 'pointer',
            fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            <ArrowRight size={12} /> Send to Review
          </button>
        </div>
      </div>
    </div>
  );
}

export function AIMonitorPage() {
  const [activeTab, setActiveTab] = useState<'candidates' | 'live' | 'upload'>('live');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  
  const [liveStats, setLiveStats] = useState<any>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [cameraRunning, setCameraRunning] = useState(false);

  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  const [selectedSource, setSelectedSource] = useState<'cam1' | 'webcam' | 'custom' | 'server'>('server');
  const [customStreamUrl, setCustomStreamUrl] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const [webcamInterval, setWebcamInterval] = useState<any>(null);
  const [webcamDetections, setWebcamDetections] = useState<any[]>([]);

  
  const [serverVideos, setServerVideos] = useState<any[]>([]);
  const [selectedServerVideo, setSelectedServerVideo] = useState<string>('');
  const [applyingVideo, setApplyingVideo] = useState(false);
  const [activeVideoName, setActiveVideoName] = useState<string>('training.mp4');

  const [isConfiguringRules, setIsConfiguringRules] = useState(false);
  const [configLines, setConfigLines] = useState<any[]>([]);
  const [dragNode, setDragNode] = useState<{ lineIdx: number, pointIdx: 1 | 2 } | null>(null);

  const { data: violationTypes } = useTable('violation_types');

  
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const alertDismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissAlert = useCallback((id: string) => {
    const timer = alertDismissTimers.current.get(id);
    if (timer) { clearTimeout(timer); alertDismissTimers.current.delete(id); }
    setLiveAlerts(prev => prev.filter(a => a._alertId !== id));
  }, []);

  const handleSendAlertToReview = useCallback(async (violationAlert: any) => {
    dismissAlert(violationAlert._alertId);
    
    try {
      await supabase.from('ai_violation_candidates').insert({
        camera_id: violationAlert.camera_id || 'CAM-001',
        plate_number: violationAlert.plate_number || 'UNKNOWN',
        vehicle_type: violationAlert.vehicle_type || null,
        rule_triggered: violationAlert.rule_triggered || 'Unknown',
        location: violationAlert.location || 'Live Stream',
        ai_confidence: violationAlert.ai_confidence || 0.5,
        verification_status: 'PENDING_REVIEW',
        violation_reason: violationAlert.violation_reason || null,
      });
    } catch (e) { console.error('Failed to queue alert:', e); }
    window.alert('Sent to Staff Review Queue!');
  }, [dismissAlert]);

  useEffect(() => {
    let isMounted = true;

    async function initAIAndCamera() {
      // 1. Check AI service health
      try {
        const healthRes = await fetch(`${AI_BASE}/health`);
        if (isMounted) setAiOnline(healthRes.ok);
        if (!healthRes.ok) return; // AI offline — don't proceed
      } catch {
        if (isMounted) setAiOnline(false);
        return;
      }

      // 2. Load server videos list
      try {
        const vidRes = await fetch(`${AI_BASE}/api/videos`);
        const vidData = await vidRes.json();
        if (isMounted && vidData.videos && vidData.videos.length > 0) {
          setServerVideos(vidData.videos);
          const training = vidData.videos.find((v: any) => v.filename === 'training.mp4');
          const first = training || vidData.videos[0];
          setSelectedServerVideo(first.path);
          setActiveVideoName(first.filename);
        }
      } catch { /* videos endpoint optional */ }

      // 3. Check camera status — auto-start if not running
      try {
        const statusRes = await fetch(`${AI_BASE}/api/cameras/CAM-001/status`);
        const statusData = await statusRes.json();
        if (!isMounted) return;

        if (statusData.running) {
          setCameraRunning(true);
        } else {
          // Auto-start the camera so detection begins immediately
          try {
            await fetch(`${AI_BASE}/api/cameras/CAM-001/start`, { method: 'POST' });
            if (isMounted) setCameraRunning(true);
          } catch {
            if (isMounted) setCameraRunning(false);
          }
        }
      } catch {
        if (isMounted) setCameraRunning(false);
      }
    }

    initAIAndCamera();

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (activeTab !== 'live') return;
    
    let ws: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let isCleaning = false;
    let retryCount = 0;
    const MAX_RETRIES = 10;

    const connectWs = () => {
      if (isCleaning || retryCount >= MAX_RETRIES) return;
      // Don't create a new WS if one is already open
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

      retryCount++;
      ws = new WebSocket(`${AI_BASE.replace('http', 'ws')}/ws/camera/CAM-001`);
      ws.onopen = () => { setWsConnected(true); retryCount = 0; };
      ws.onerror = () => {}; 
      ws.onclose = () => {
        setWsConnected(false);
        if (!isCleaning && retryCount < MAX_RETRIES) {
          retryTimeout = setTimeout(connectWs, 3000);
        }
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'statistics') {
            setLiveStats(data);
            
            if (data.violations && data.violations.length > 0) {
              data.violations.forEach(async (v: any) => {
                if (v.ai_confidence >= 0.50) {
                } else {
                  
                  const alertId = `${v.rule_triggered}_${v.track_id}_${Date.now()}`;
                  const alert = { ...v, _alertId: alertId };
                  setLiveAlerts(prev => [...prev.slice(-4), alert]); 
                  
                  const timer = setTimeout(() => dismissAlert(alertId), 15000);
                  alertDismissTimers.current.set(alertId, timer);
                }
              });
            }
          }
        } catch (err) {}
      };
    };
    
    connectWs();
    return () => {
      isCleaning = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) {
        ws.onclose = null; 
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws!.close();
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
      stopWebcam();
    };
  }, [activeTab]);

  const toggleCamera = async () => {
    const action = cameraRunning ? 'stop' : 'start';
    try {
      await fetch(`${AI_BASE}/api/cameras/CAM-001/${action}`, { method: 'POST' });
      setCameraRunning(!cameraRunning);
    } catch (err) {
      alert('Failed to toggle camera.');
    }
  };

  const applyServerVideo = async () => {
    if (!selectedServerVideo) return;
    setApplyingVideo(true);
    try {
      
      if (cameraRunning) {
        await fetch(`${AI_BASE}/api/cameras/CAM-001/stop`, { method: 'POST' });
        setCameraRunning(false);
      }
      
      await fetch(`${AI_BASE}/api/cameras/CAM-001/set-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_type: 'file', stream_url: selectedServerVideo }),
      });
      
      const vid = serverVideos.find(v => v.path === selectedServerVideo);
      if (vid) setActiveVideoName(vid.filename);
      
      await fetch(`${AI_BASE}/api/cameras/CAM-001/start`, { method: 'POST' });
      setCameraRunning(true);
    } catch (err) {
      alert('Failed to apply video source.');
    }
    setApplyingVideo(false);
  };

  const handleTestStream = async () => {
    if (!customStreamUrl) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      let stype = 'hls';
      if (customStreamUrl.includes('rtsp')) stype = 'rtsp';
      if (customStreamUrl.includes('.mjpg')) stype = 'mjpeg';
      
      const res = await fetch(`${AI_BASE}/api/cameras/test-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_type: stype, stream_url: customStreamUrl })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ error: 'Failed to contact AI service' });
    }
    setIsTesting(false);
  };

  const handleApplyCustomStream = async () => {
    if (!testResult?.yolo_compatible) return;
    try {
      await fetch(`${AI_BASE}/api/cameras/CAM-001/set-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_type: testResult.stream_type, stream_url: customStreamUrl })
      });
      alert('Stream applied successfully. Start AI Stream to begin.');
      setSelectedSource('custom');
    } catch (err) {
      alert('Failed to apply stream');
    }
  };

  const startWebcam = async () => {
    if (!webcamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamRef.current.srcObject = stream;
      
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const interval = setInterval(async () => {
        if (!webcamRef.current) return;
        canvas.width = webcamRef.current.videoWidth;
        canvas.height = webcamRef.current.videoHeight;
        if (canvas.width === 0) return;
        
        ctx?.drawImage(webcamRef.current, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL('image/jpeg', 0.8);
        
        try {
          const res = await fetch(`${AI_BASE}/api/cameras/webcam/frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame_b64: b64 })
          });
          const data = await res.json();
          if (data.success) {
            setWebcamDetections(data.detections);
          }
        } catch(e) {}
      }, 300);
      setWebcamInterval(interval);
      setCameraRunning(true);
    } catch (err) {
      alert('Could not access webcam');
    }
  };

  const stopWebcam = () => {
    if (webcamInterval) clearInterval(webcamInterval);
    setWebcamInterval(null);
    if (webcamRef.current?.srcObject) {
      (webcamRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setCameraRunning(false);
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${AI_BASE}/api/cameras/CAM-001/violation_config`);
      const data = await res.json();
      setConfigLines(data.lines || []);
    } catch (e) {
      console.error(e);
    }
  };

  const saveConfig = async () => {
    try {
      await fetch(`${AI_BASE}/api/cameras/CAM-001/violation_config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: configLines, zones: [] })
      });
      alert('Violation lines saved successfully!');
      setIsConfiguringRules(false);
    } catch (e) {
      alert('Failed to save config.');
    }
  };

  const toggleConfig = () => {
    if (!isConfiguringRules) {
      loadConfig();
    }
    setIsConfiguringRules(!isConfiguringRules);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragNode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
    const newLines = [...configLines];
    if (dragNode.pointIdx === 1) newLines[dragNode.lineIdx].p1 = [x, y];
    else newLines[dragNode.lineIdx].p2 = [x, y];
    setConfigLines(newLines);
  };

  const handleSvgMouseUp = () => setDragNode(null);

  const changeSource = async (source: any) => {
    setSelectedSource(source);
    stopWebcam();
    if (cameraRunning && source !== 'cam1') {
      await fetch(`${AI_BASE}/api/cameras/CAM-001/stop`, { method: 'POST' });
      setCameraRunning(false);
    }
  };

  useEffect(() => {
    
    const fetchCandidates = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_violation_candidates')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setCandidates(data || []);
      } catch (err) {
        console.error('Failed to load candidates:', err);
      }
    };
    fetchCandidates();
    const fetchInterval = setInterval(fetchCandidates, 3000);

    let channel: any;
    try {
      channel = supabase
        .channel('public:ai_violation_candidates')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ai_violation_candidates' },
          (payload) => {
            console.log('Realtime INSERT received:', payload.new);
            setCandidates((prev) => {
              // Prevent duplicates
              if (prev.find((c) => c.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') setIsRealtimeConnected(true);
        });
    } catch (e) {
      console.error('Realtime connection failed:', e);
    }

    return () => {
      clearInterval(fetchInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function handleSendToReview(candidate: any) {
    
    await supabase
      .from('ai_violation_candidates')
      .update({ verification_status: 'PENDING_REVIEW' })
      .eq('id', candidate.id);
    setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, verification_status: 'PENDING_REVIEW' } : c));
    
    alert('Detection sent to Staff Review Queue. Staff can now review, search PUV database, and confirm the violation.');
  }

  async function handleReject(id: string) {
    if (confirm('Reject this AI-detected violation candidate? It will be marked as a false positive.')) {
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co') {
        await supabase.from('ai_violation_candidates').update({ verification_status: 'REJECTED' }).eq('id', id);
      }
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, verification_status: 'REJECTED' as const } : c));
    }
  }

  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Please drop a video file (.mp4, .avi, .mov, .webm)');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    if (aiOnline === false) {
      setError('AI Service is offline. Please start the AI service first (python main.py in apps/ai-service).');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setProgress('Uploading video to AI service...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setProgress('Processing video through YOLO model...');
      const response = await fetch(`${AI_BASE}/analyze-video`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResult(data);
      setProgress('Analysis complete!');
    } catch (err: any) {
      console.error('Video analysis failed:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleIssueUploadTicket = async (violation: any) => {
    
    try {
      const { error: err } = await supabase.from('ai_violation_candidates').insert({
        camera_id: 'VIDEO_UPLOAD',
        plate_number: violation.plate_number || 'UNKNOWN',
        vehicle_type: violation.vehicle_type || null,
        rule_triggered: violation.rule_triggered || 'Unknown',
        location: violation.location || 'Video Upload Analysis',
        ai_confidence: violation.ai_confidence || 0.5,
        evidence_image_url: violation.evidence_image_url || null,
        verification_status: 'PENDING_REVIEW',
      });
      if (err) throw err;
      alert('Detection added to Staff Review Queue. Staff must review, search PUV database, and confirm the violation.');
    } catch (err: any) {
      alert(`Failed to send to review queue: ${err.message}`);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const pendingCandidates = candidates.filter(c =>
    c.verification_status === 'AI_SUGGESTED' || c.verification_status === 'PENDING_REVIEW'
  );

  return (
    <div>

      {liveAlerts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 12,
          maxHeight: '90vh', overflowY: 'auto',
          pointerEvents: 'none',
        }}>
          <style>{`
            @keyframes slideInRight {
              from { opacity: 0; transform: translateX(40px) scale(0.95); }
              to   { opacity: 1; transform: translateX(0) scale(1); }
            }
          `}</style>
          {liveAlerts.map(liveAlert => (
            <div key={liveAlert._alertId} style={{ pointerEvents: 'all' }}>
              <LiveViolationAlert
                violationAlert={liveAlert}
                onDismiss={() => dismissAlert(liveAlert._alertId)}
                onSendToReview={() => handleSendAlertToReview(liveAlert)}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={20} color="#7c3aed" /> AI Monitor & CCTV
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            AI vehicle detection, live monitoring, and manual video upload analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ 
              width: 8, height: 8, borderRadius: '50%', 
              background: aiOnline ? '#22c55e' : '#ef4444', 
              display: 'inline-block', 
              animation: aiOnline ? 'pulse 2s infinite' : 'none' 
            }} />
            <span style={{ fontSize: '0.75rem', color: aiOnline ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
              AI Service {aiOnline ? 'Active' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {}
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
        padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start'
      }}>
        <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5 }}>
          <strong>Human Verification Required:</strong> All AI-detected violation candidates must be reviewed and verified by an authorized Traffic Enforcer or Transportation Officer before a ticket is issued. AI detections are decision support tools, not automatic enforcers.
        </div>
      </div>

      {}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {[
          { key: 'live', label: 'Live Dashboard', badge: 0 },
          { key: 'candidates', label: `Violation Candidates`, badge: pendingCandidates.length },
          { key: 'upload', label: 'Video Analysis Upload', badge: 0 }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, borderBottom: '2px solid transparent',
              marginBottom: -2,
              color: activeTab === tab.key ? '#3a65ae' : '#64748b',
              borderBottomColor: activeTab === tab.key ? '#3a65ae' : 'transparent',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            {tab.label}
            {tab.badge ? (
              <span style={{
                background: tab.key === 'candidates' ? '#fef2f2' : '#eff6ff',
                color: tab.key === 'candidates' ? '#dc2626' : '#3b82f6',
                fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: 9999
              }}>
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {}
      {activeTab === 'candidates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            {pendingCandidates.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={async () => {
                if (!confirm('Are you sure you want to DELETE ALL pending violation candidates? This cannot be undone.')) return;
                try {
                  const { error } = await supabase.from('ai_violation_candidates')
                    .delete()
                    .in('verification_status', ['PENDING_REVIEW', 'AI_SUGGESTED']);
                  if (error) throw error;
                  
                  
                  setCandidates(prev => prev.filter(c => c.verification_status !== 'PENDING_REVIEW' && c.verification_status !== 'AI_SUGGESTED'));
                } catch(e: any) { 
                  console.error(e);
                  alert('Delete failed: ' + e.message);
                }
              }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <XCircle size={13} /> Delete All Pending
              </button>
            )}
          </div>
          {pendingCandidates.length === 0 && (
            <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', padding: 40, textAlign: 'center' }}>
              <CheckCircle size={40} color="#22c55e" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: 600, color: '#1e293b' }}>No pending AI candidates</p>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>All AI-detected violation candidates have been reviewed.</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 14 }}>
            {pendingCandidates.map(c => (
              <CandidateCard key={c.id} candidate={c}
                onSendToReview={() => handleSendToReview(c)}
                onReject={() => handleReject(c.id)} />
            ))}
          </div>

          {candidates.some(c => c.verification_status !== 'AI_SUGGESTED') && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Reviewed Candidates</h3>
              <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Rule</th><th>Location</th><th>AI Confidence</th><th>Status</th><th>Reviewed</th></tr>
                  </thead>
                  <tbody>
                    {candidates.filter(c => c.verification_status !== 'AI_SUGGESTED').map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.rule_triggered}</td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.location ?? '—'}</td>
                        <td>{Math.round(c.ai_confidence * 100)}%</td>
                        <td><span className={`badge ${getStatusBadgeClass(c.verification_status)}`}>{formatStatus(c.verification_status)}</span></td>
                        <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{formatDateTime(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {}
      {activeTab === 'live' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {}
            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Camera Sources</h3>
                <button 
                  onClick={toggleConfig}
                  className={`btn ${isConfiguringRules ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                  <Cpu size={14}/> {isConfiguringRules ? 'Done Editing Rules' : 'Configure Rules'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button 
                  onClick={() => changeSource('server')}
                  className={`btn ${selectedSource === 'server' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                  <FileVideo size={14}/> Server Videos
                </button>
                <button 
                  onClick={() => changeSource('cam1')}
                  className={`btn ${selectedSource === 'cam1' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                  <Video size={14}/> CAM-001 (Local MP4)
                </button>
                <button 
                  onClick={() => changeSource('webcam')}
                  className={`btn ${selectedSource === 'webcam' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                  <Camera size={14}/> Webcam Test
                </button>
                <button 
                  onClick={() => changeSource('custom')}
                  className={`btn ${selectedSource === 'custom' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                >
                  <Activity size={14}/> Custom Stream
                </button>
              </div>

              {selectedSource === 'custom' && (
                <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Enter HLS (.m3u8), RTSP, or MJPEG URL" 
                      value={customStreamUrl} 
                      onChange={e => setCustomStreamUrl(e.target.value)}
                      style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleTestStream} disabled={isTesting}>
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  
                  {testResult && (
                    <div style={{ marginTop: 10, fontSize: '0.75rem', padding: 10, borderRadius: 6, background: testResult.error ? '#fef2f2' : '#f0fdf4', border: `1px solid ${testResult.error ? '#fecaca' : '#bbf7d0'}` }}>
                      {testResult.error ? (
                        <div style={{ color: '#991b1b' }}><strong>Error:</strong> {testResult.error}</div>
                      ) : (
                        <div>
                          <div style={{ color: '#166534', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={16} /> Connection Successful
                          </div>
                          <div style={{ color: '#166534' }}>
                            Type: {testResult.stream_type.toUpperCase()} • Res: {testResult.width}x{testResult.height} • FPS: {testResult.fps}
                          </div>
                          {testResult.yolo_compatible ? (
                            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleApplyCustomStream}>
                              Apply as Camera Source
                            </button>
                          ) : (
                            <div style={{ color: '#991b1b', marginTop: 4 }}>Frames cannot be extracted for YOLO</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {}
              {selectedSource === 'server' && (
                <div style={{ marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FolderOpen size={16} color="#3b82f6" /> Select a server-side video file:
                  </div>
                  {serverVideos.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No videos found. Add .mp4 files to test-videos/uploads/</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {serverVideos.map(v => (
                        <label key={v.path} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
                          border: `2px solid ${selectedServerVideo === v.path ? '#3a65ae' : '#e2e8f0'}`,
                          background: selectedServerVideo === v.path ? '#eff6ff' : 'white',
                          transition: 'all 0.15s',
                        }}>
                          <input
                            type="radio"
                            name="server-video"
                            value={v.path}
                            checked={selectedServerVideo === v.path}
                            onChange={() => setSelectedServerVideo(v.path)}
                            style={{ accentColor: '#3a65ae' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                              {v.filename === 'training.mp4' && '⭐ '}{v.filename}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {v.folder} • {v.size_mb} MB
                            </div>
                          </div>
                          {selectedServerVideo === v.path && (
                            <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 9999, fontWeight: 600 }}>Selected</span>
                          )}
                        </label>
                      ))}
                      <button
                        className="btn btn-primary"
                        onClick={applyServerVideo}
                        disabled={applyingVideo || !selectedServerVideo}
                        style={{ marginTop: 6, alignSelf: 'flex-start' }}
                      >
                        {applyingVideo ? '⏳ Applying...' : '▶ Load & Start AI Stream'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {}
            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ background: '#0f172a', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Video size={18} color="#e2e8f0" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
                      {selectedSource === 'server' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Video size={14} /> {activeVideoName}
                        </div>
                      ) : selectedSource === 'cam1' ? 'CAM-001: Leon Garcia St.' : 
                       selectedSource === 'webcam' ? 'Webcam YOLO Testing' : 
                       'Custom Authorized Stream'}
                    </span>
                    {selectedSource === 'server' && (
                      <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                        Source: Server Video • YOLOv8s + ph_traffic_v12
                      </span>
                    )}
                    {selectedSource === 'cam1' && (
                      <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                        Source: Local MP4 • redlight.mp4
                      </span>
                    )}
                  </div>
                </div>
                
                {selectedSource === 'webcam' ? (
                  <button 
                    onClick={cameraRunning ? stopWebcam : startWebcam}
                    style={{ 
                      background: cameraRunning ? '#dc2626' : '#16a34a', 
                      color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, 
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' 
                    }}
                  >
                    {cameraRunning ? 'Stop Webcam' : 'Start Webcam Inference'}
                  </button>
                ) : (
                  <button 
                    onClick={toggleCamera}
                    style={{ 
                      background: cameraRunning ? '#dc2626' : '#16a34a', 
                      color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, 
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' 
                    }}
                  >
                    {cameraRunning ? <><Square size={14} /> Stop AI Stream</> : <><Play size={14} /> Start AI Stream</>}
                  </button>
                )}
              </div>
              
              <div style={{ background: '#000', height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {selectedSource === 'webcam' ? (
                  <>
                    <video ref={webcamRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    {}
                    {webcamDetections.map((d, i) => (
                        <div key={i} style={{
                          position: 'absolute', border: '2px solid #22c55e',
                          left: `${(d.bbox[0] / (webcamRef.current?.videoWidth || 1)) * 100}%`,
                          top: `${(d.bbox[1] / (webcamRef.current?.videoHeight || 1)) * 100}%`,
                          width: `${((d.bbox[2] - d.bbox[0]) / (webcamRef.current?.videoWidth || 1)) * 100}%`,
                          height: `${((d.bbox[3] - d.bbox[1]) / (webcamRef.current?.videoHeight || 1)) * 100}%`,
                          pointerEvents: 'none'
                        }}>
                          <span style={{ background: '#22c55e', color: 'black', fontSize: '10px', padding: 2, position: 'absolute', top: -18, left: -2, whiteSpace: 'nowrap' }}>
                            {d.vehicle_type}
                          </span>
                        </div>
                    ))}
                  </>
                ) : cameraRunning ? (
                  <img 
                    src={`${AI_BASE}/api/cameras/CAM-001/stream`} 
                    alt="Live AI Stream" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => { (e.target as any).style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center' }}>
                    <Video size={48} style={{ opacity: 0.5, margin: '0 auto 12px' }} />
                    <p>Stream is currently offline.</p>
                    <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Click "Start AI Stream" to begin YOLO analysis.</p>
                  </div>
                )}
                
                {isConfiguringRules && (
                  <svg 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: dragNode ? 'grabbing' : 'crosshair' }}
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleSvgMouseUp}
                    onMouseLeave={handleSvgMouseUp}
                  >
                    {configLines.map((line, idx) => (
                      <g key={idx}>
                        <line 
                          x1={`${line.p1[0] * 100}%`} y1={`${line.p1[1] * 100}%`} 
                          x2={`${line.p2[0] * 100}%`} y2={`${line.p2[1] * 100}%`} 
                          stroke="#3b82f6" strokeWidth="3" strokeDasharray="5,5" 
                        />
                        <circle 
                          cx={`${line.p1[0] * 100}%`} cy={`${line.p1[1] * 100}%`} r="8" fill="#fff" stroke="#3b82f6" strokeWidth="2"
                          style={{ cursor: 'grab' }}
                          onMouseDown={() => setDragNode({ lineIdx: idx, pointIdx: 1 })}
                        />
                        <circle 
                          cx={`${line.p2[0] * 100}%`} cy={`${line.p2[1] * 100}%`} r="8" fill="#fff" stroke="#3b82f6" strokeWidth="2"
                          style={{ cursor: 'grab' }}
                          onMouseDown={() => setDragNode({ lineIdx: idx, pointIdx: 2 })}
                        />
                        <text x={`${line.p1[0] * 100}%`} y={`${line.p1[1] * 100}%`} dx="12" dy="-12" fill="#fff" fontSize="12" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                          {line.name}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}
                {isConfiguringRules && (
                  <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={saveConfig}>Save Layout</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color="#3b82f6" /> YOLO Statistics
              </h3>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>CAMERA STATUS</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: cameraRunning ? '#16a34a' : '#dc2626' }}>
                    {cameraRunning ? '● ONLINE' : '● OFFLINE'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>VIDEO SOURCE</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6' }}>
                    {selectedSource === 'server' ? `● ${activeVideoName}` : selectedSource === 'cam1' ? '● redlight.mp4' : selectedSource === 'webcam' ? '● WEBCAM' : '● CUSTOM HLS'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>TRACKER</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: cameraRunning ? '#16a34a' : '#94a3b8' }}>
                    {cameraRunning ? '● BYTE TRACK' : '● IDLE'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>YOLO AI</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: (wsConnected || selectedSource === 'webcam') && cameraRunning ? '#16a34a' : '#dc2626' }}>
                    {(wsConnected || selectedSource === 'webcam') && cameraRunning ? '● INFERENCE ACTIVE' : '● OFFLINE'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Vehicles Detected</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                    {liveStats?.detections?.length || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Active Tracks</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                    {liveStats?.active_vehicles || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Traffic Light</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: liveStats?.traffic_light_state === 'RED LIGHT' ? '#dc2626' : liveStats?.traffic_light_state === 'GREEN LIGHT' ? '#16a34a' : liveStats?.traffic_light_state === 'YELLOW LIGHT' ? '#d97706' : '#64748b' }}>
                    {liveStats?.traffic_light_state ? `● ${liveStats.traffic_light_state}` : '● UNKNOWN'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Recent Violations</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: liveStats?.violations?.length ? '#dc2626' : '#1e293b' }}>
                    {liveStats?.violations?.length || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Inference FPS</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                    {liveStats?.inference_fps || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Avg. Confidence</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                    {liveStats?.detections?.length 
                      ? (liveStats.detections.reduce((acc: number, d: any) => acc + d.confidence, 0) / liveStats.detections.length).toFixed(2)
                      : '0.00'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {activeTab === 'upload' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                border: '2px dashed #cbd5e1', borderRadius: 10, padding: 32,
                textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
                transition: 'border-color 0.2s',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/avi,video/quicktime,video/webm,.mkv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <FileVideo size={40} color="#94a3b8" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                {selectedFile ? selectedFile.name : 'Drop video here or click to browse'}
              </p>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                MP4, AVI, MOV, WebM, MKV — max 500MB
              </p>
            </div>

            {}
            {previewUrl && (
              <div style={{ position: 'relative' }}>
                <video
                  src={previewUrl}
                  controls
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', maxHeight: 280 }}
                />
                <button
                  onClick={clearFile}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                    borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {}
            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              disabled={!selectedFile || analyzing}
              style={{ width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 600 }}
            >
              {analyzing ? (
                <><Activity size={16} style={{ animation: 'spin 1s linear infinite' }} /> {progress}</>
              ) : (
                <><Video size={16} /> Analyze with YOLO</>
              )}
            </button>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '10px 14px', fontSize: '0.82rem', color: '#991b1b',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}
          </div>

          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!result && !analyzing && (
              <div style={{
                background: 'white', borderRadius: 10, border: '1px solid #e2e8f0',
                padding: 40, textAlign: 'center', height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <Video size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
                <p style={{ fontWeight: 600, color: '#1e293b' }}>No analysis yet</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                  Upload a video and click Analyze to see YOLO detection results
                </p>
              </div>
            )}

            {analyzing && (
              <div style={{
                background: 'white', borderRadius: 10, border: '1px solid #e2e8f0',
                padding: 40, textAlign: 'center',
              }}>
                <Activity size={40} color="#3a65ae" style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 2s linear infinite' }} />
                <p style={{ fontWeight: 600, color: '#1e293b' }}>Analyzing video...</p>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{progress}</p>
              </div>
            )}

            {result && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Duration', value: `${result.video.duration_s}s`, color: '#3a65ae' },
                    { label: 'Vehicles Detected', value: result.summary.vehicles_detected, color: '#22c55e' },
                    { label: 'Violations Found', value: result.summary.violations_detected, color: '#ef4444' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', padding: '14px' }}>
                      <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, marginBottom: 4 }}>{s.label}</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', padding: 16 }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>
                    Violations Detected ({result.violations.length})
                  </h3>
                  {result.violations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                      <CheckCircle size={24} style={{ margin: '0 auto 8px', display: 'block', color: '#22c55e' }} />
                      <p style={{ fontSize: '0.8rem' }}>No violations detected</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.violations.map((v, i) => {
                        const c = VIOLATION_COLORS[v.rule_triggered] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
                        return (
                          <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: c.text }}>{v.rule_triggered}</div>
                                <div style={{ fontSize: '0.72rem', color: c.text, opacity: 0.8 }}>
                                  {v.plate_number} · {(v.ai_confidence * 100).toFixed(0)}% · @{v.timestamp_s}s
                                </div>
                              </div>
                              <button
                                onClick={() => handleIssueUploadTicket(v)}
                                style={{ padding: '4px 10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: 5, fontSize: '0.7rem', cursor: 'pointer' }}
                              >
                                Send to Review
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
