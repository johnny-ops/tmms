import { useState, useEffect, useRef, useCallback } from 'react';

export type VehicleDetection = {
  track_id: number;
  vehicle_type: string;
  confidence: number;
  bbox: [number, number, number, number];
};

export type ViolationEvent = {
  camera_id: string;
  rule_triggered: string;
  ai_confidence: number;
  location: string;
  plate_number: string;
  vehicle_type: string;
  reason: string;
  verification_status: string;
  evidence_frame?: string;  // base64 JPEG data URL
};

export type CameraStats = {
  active_vehicles: number;
  inference_fps: number;
  counts: {
    total: number;
    car: number;
    motorcycle: number;
    bus: number;
    truck: number;
    jeepney: number;
    tricycle: number;
    uv_express: number;
  };
  violations: ViolationEvent[];
  timestamp: string;
};

type WSPayload = {
  type: string;
  camera_id: string;
  message?: string;
  detections?: VehicleDetection[];
  violations?: ViolationEvent[];
} & Partial<CameraStats>;

export function useCCTVWebSocket(cameraId: string, backendUrl = 'ws://localhost:8001') {
  const [status, setStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  const [stats, setStats] = useState<CameraStats | null>(null);
  const [detections, setDetections] = useState<VehicleDetection[]>([]);
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!cameraId) return;
    
    setStatus('CONNECTING');
    const wsUrl = `${backendUrl.replace('http', 'ws')}/ws/camera/${cameraId}`;
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setStatus('CONNECTED');
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WSPayload = JSON.parse(event.data);
          if (data.type === 'error') {
            console.error('[CCTV WS] Error from server:', data.message);
            return;
          }
          if (data.type === 'statistics') {
            setStats({
              active_vehicles: data.active_vehicles || 0,
              inference_fps: data.inference_fps || 0,
              counts: data.counts || {
                total: 0, car: 0, motorcycle: 0, bus: 0, truck: 0, jeepney: 0, tricycle: 0, uv_express: 0
              },
              violations: data.violations || [],
              timestamp: data.timestamp || new Date().toISOString()
            });
            if (data.detections) setDetections(data.detections);
            // Accumulate new violations (keep last 50)
            if (data.violations && data.violations.length > 0) {
              setViolations(prev => [...data.violations!, ...prev].slice(0, 50));
            }
          }
        } catch (err) {
          console.error('[CCTV WS] Parse error:', err);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[CCTV WS] Error:', error);
        setStatus('ERROR');
      };

      ws.current.onclose = () => {
        setStatus('DISCONNECTED');
        reconnectTimeout.current = setTimeout(connect, 3000);
      };
    } catch (err) {
      console.error('[CCTV WS] Setup error:', err);
      setStatus('ERROR');
    }
  }, [cameraId, backendUrl]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) ws.current.close();
    };
  }, [connect]);

  const clearViolations = () => setViolations([]);

  return { status, stats, detections, violations, clearViolations };
}


