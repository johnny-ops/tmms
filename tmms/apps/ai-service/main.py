"""
GOVCHECK AI Service — main.py  v3.0
=====================================
Real YOLOv8 traffic violation detection with:
  • Virtual tripwire line crossing → BEAT_RED_LIGHT / SWERVING
  • Forbidden zone polygon → ILLEGAL_PARKING / OBSTRUCTION
  • Stationary dwell-time tracking → ILLEGAL_PARKING
  • Speed estimation from pixel displacement → OVERSPEEDING
  • Evidence frame saved as base64 JPEG to Supabase
  • Video upload endpoint (POST /api/cameras/{id}/upload_video)
  • Multi-camera support via CAMERAS registry
"""

import asyncio
import base64
import io
import json
import logging
import math
import os
import shutil
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from supabase import create_client, Client
from ultralytics import YOLO
from pydantic import BaseModel

from streaming.stream_manager import StreamManager, StreamType, validate_stream
from vehicle_counter import VehicleCounter

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("govcheck-ai")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

YOLO_MODEL_PATH    = os.environ.get("YOLO_MODEL_PATH", "./yolov8n.pt")
YOLO_CONFIDENCE    = float(os.environ.get("YOLO_CONFIDENCE", "0.35"))
YOLO_IMG_SIZE      = int(os.environ.get("YOLO_IMG_SIZE", "640"))
YOLO_INFERENCE_FPS = int(os.environ.get("YOLO_INFERENCE_FPS", "10"))
YOLO_DEVICE        = os.environ.get("YOLO_DEVICE", "auto")

CCTV_STREAM_TYPE = os.environ.get("CCTV_STREAM_TYPE", "file")
# Ensure the path is resolved to the absolute path of the web assets directory
CCTV_STREAM_URL  = os.environ.get("CCTV_STREAM_URL", str((Path(__file__).parent / "../web/src/assets/sample.mp4").resolve()))

# COCO class IDs: 2=car, 3=motorcycle, 5=bus, 7=truck, 9=traffic light
VEHICLE_CLASSES = [2, 3, 5, 7, 9]
CLASS_NAMES = {2: "CAR", 3: "MOTORCYCLE", 5: "BUS", 7: "TRUCK", 9: "TRAFFIC LIGHT"}

VIDEO_UPLOAD_DIR = Path("./test-videos/uploads")
VIDEO_UPLOAD_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────────
# Supabase Client
# ─────────────────────────────────────────────
supabase_client: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase client initialized.")
    except Exception as e:
        logger.warning(f"⚠️  Supabase init failed: {e}")
else:
    logger.warning("⚠️  SUPABASE_URL/KEY not set — running without DB.")

# ─────────────────────────────────────────────
# YOLO Model
# ─────────────────────────────────────────────
logger.info(f"🔄 Loading YOLO model from: {YOLO_MODEL_PATH}")
model = YOLO(YOLO_MODEL_PATH)
device = None if YOLO_DEVICE == "auto" else YOLO_DEVICE
logger.info(f"✅ YOLO model loaded. Device: {YOLO_DEVICE}")

# ─────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────
app = FastAPI(title="GOVCHECK AI Service", version="3.0.0")

# CORS: allow_credentials=True is INCOMPATIBLE with allow_origins=["*"].
# For a public AI service with no cookie/session auth, we drop credentials
# and allow all origins. If you later need credentials, list explicit origins.
_ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://tmms-three.vercel.app,http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Camera Registry
# ─────────────────────────────────────────────
CAMERAS: dict[str, dict] = {
    "CAM-001": {
        "id":          "CAM-001",
        "name":        "Davao City — Leon Garcia St. (Test Feed)",
        "location":    "Davao City, Philippines",
        "stream_type": CCTV_STREAM_TYPE,
        "stream_url":  CCTV_STREAM_URL,
        "enabled":     True,
        "status":      "OFFLINE",
    }
}

# ─────────────────────────────────────────────
# Violation Rule Definitions  (per-camera config)
# Each camera can have:
#   "lines":  list of line segments [{name, p1:[x%,y%], p2:[x%,y%], rule}]
#   "zones":  list of polygons       [{name, points:[[x%,y%],...], rule, dwell_seconds}]
# Coordinates are percentages (0.0–1.0) of frame size so they scale automatically.
# ─────────────────────────────────────────────
DEFAULT_VIOLATION_CONFIG = {
    "lines": [
        # Diagonal Violation Line matching screenshot
        {
            "name": "Violation Line",
            "p1":   [0.05, 0.55],
            "p2":   [0.95, 0.75],
            "rule": "BEAT_RED_LIGHT",
            "direction": "down",
        },
    ],
    "zones": [
        # Yellow-box junction / no-stopping zone
        {
            "name":          "No Stopping Zone",
            "points":        [[0.3, 0.55], [0.7, 0.55], [0.7, 0.75], [0.3, 0.75]],
            "rule":          "OBSTRUCTION",
            "dwell_seconds": 4.0,
        },
        # Sidewalk / No Parking area
        {
            "name":          "No Parking — Sidewalk",
            "points":        [[0.0, 0.85], [0.35, 0.85], [0.35, 1.0], [0.0, 1.0]],
            "rule":          "ILLEGAL_PARKING",
            "dwell_seconds": 6.0,
        },
    ],
    "speed": {
        "enabled": True,
        "pixels_per_meter": 8.0,   # Rough calibration — tune per camera
        "threshold_kmh":   60.0,
    }
}

# Per-camera violation configs (overrideable)
CAMERA_VIOLATION_CONFIGS: dict[str, dict] = {
    "CAM-001": DEFAULT_VIOLATION_CONFIG,
}


# ─────────────────────────────────────────────
# Violation Detector
# ─────────────────────────────────────────────
class ViolationDetector:
    """
    Stateful per-camera violation detector.
    Maintains per-track-ID state for:
      - Zone dwell time (for parking/stopping violations)
      - Previous positions (for speed + line-crossing)
      - Which violations already fired (to avoid spam)
    """

    # Seconds to wait before re-raising the same violation for the same track
    COOLDOWN_BETWEEN_SAME = 15.0
    # Seconds between ANY violation uploads (avoid Supabase flooding)
    UPLOAD_COOLDOWN       = 3.0

    def __init__(self, camera_id: str, frame_width: int, frame_height: int):
        self.camera_id    = camera_id
        self.W            = frame_width
        self.H            = frame_height
        self.config       = CAMERA_VIOLATION_CONFIGS.get(camera_id, DEFAULT_VIOLATION_CONFIG)

        # Resolve percentage coords → absolute pixel coords
        self._lines = self._resolve_lines(self.config.get("lines", []))
        self._zones = self._resolve_zones(self.config.get("zones", []))
        self._speed_cfg = self.config.get("speed", {})

        # Per-track state
        self._track_state: dict[int, dict] = {}
        # {track_id: {
        #    "prev_center": (x,y),
        #    "prev_time": float,
        #    "zone_entry": {zone_name: entry_time},
        #    "fired": {rule: last_fire_time},
        # }}

        self._last_upload_time = 0.0

    # ── Coordinate helpers ────────────────────────────────────────────────

    def _px(self, pct_point):
        return (int(pct_point[0] * self.W), int(pct_point[1] * self.H))

    def _resolve_lines(self, lines_cfg):
        resolved = []
        for l in lines_cfg:
            resolved.append({**l, "p1": self._px(l["p1"]), "p2": self._px(l["p2"])})
        return resolved

    def _resolve_zones(self, zones_cfg):
        resolved = []
        for z in zones_cfg:
            pts = np.array([self._px(p) for p in z["points"]], dtype=np.int32)
            resolved.append({**z, "pts": pts})
        return resolved

    # ── Geometry helpers ─────────────────────────────────────────────────

    @staticmethod
    def _segments_intersect(p1, p2, p3, p4):
        """Check if segment p1-p2 intersects segment p3-p4."""
        def ccw(A, B, C):
            return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
        return (ccw(p1,p3,p4) != ccw(p2,p3,p4)) and (ccw(p1,p2,p3) != ccw(p1,p2,p4))

    @staticmethod
    def _point_in_polygon(point, polygon_pts):
        """Check if point is inside polygon."""
        return cv2.pointPolygonTest(polygon_pts, point, False) >= 0

    @staticmethod
    def _bbox_center(bbox):
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) // 2, (y1 + y2) // 2)

    @staticmethod
    def _bbox_bottom(bbox):
        """Bottom-center of bounding box (feet of vehicle)."""
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) // 2, y2)

    # ── Main detection method ─────────────────────────────────────────────

    def detect(self, detections: list[dict], frame: np.ndarray, traffic_light_state: str = 'UNKNOWN') -> list[dict]:
        """
        Run all violation rules against current frame detections.
        Returns list of violation dicts (may be empty).
        """
        now = time.time()
        violations_found = []

        for det in detections:
            tid = det.get("track_id")
            if tid is None:
                continue

            bbox   = det["bbox"]
            center = self._bbox_center(bbox)
            bottom = self._bbox_bottom(bbox)
            vtype  = det.get("vehicle_type", "vehicle")
            conf   = det.get("confidence", 0.5)

            # Init per-track state
            if tid not in self._track_state:
                self._track_state[tid] = {
                    "prev_center": center,
                    "prev_time":   now,
                    "zone_entry":  {},
                    "fired":       {},
                }
            state = self._track_state[tid]

            prev_center = state["prev_center"]
            prev_time   = state["prev_time"]
            dt          = now - prev_time if (now - prev_time) > 0 else 0.01

            # ── 1. Line crossing ──────────────────────────────────────────
            for line in self._lines:
                rule = line["rule"]
                # Only check if enough movement happened (skip first frame)
                if prev_center != center:
                    crossed = self._segments_intersect(
                        prev_center, center, line["p1"], line["p2"]
                    )
                    if crossed:
                        # Direction filter
                        dir_cfg = line.get("direction", "any")
                        dy = center[1] - prev_center[1]
                        dir_ok = (
                            dir_cfg == "any"
                            or (dir_cfg == "down" and dy > 0)
                            or (dir_cfg == "up"   and dy < 0)
                        )
                        if dir_ok:
                            if rule == "BEAT_RED_LIGHT" and traffic_light_state != "RED LIGHT":
                                continue
                            
                            v = self._make_violation(
                                tid, vtype, conf, rule,
                                f"Crossed {line['name']}",
                                state, now, frame, bbox
                            )
                            if v:
                                violations_found.append(v)

            # ── 2. Zone dwell time ────────────────────────────────────────
            for zone in self._zones:
                zone_name    = zone["name"]
                rule         = zone["rule"]
                dwell_thresh = zone.get("dwell_seconds", 5.0)
                inside       = self._point_in_polygon((float(bottom[0]), float(bottom[1])), zone["pts"])

                if inside:
                    if zone_name not in state["zone_entry"]:
                        state["zone_entry"][zone_name] = now
                    dwell = now - state["zone_entry"][zone_name]
                    if dwell >= dwell_thresh:
                        v = self._make_violation(
                            tid, vtype, conf, rule,
                            f"Stopped in {zone_name} for {dwell:.0f}s",
                            state, now, frame, bbox
                        )
                        if v:
                            violations_found.append(v)
                else:
                    # Left zone — reset entry time
                    state["zone_entry"].pop(zone_name, None)

            # ── 3. Speed estimation ───────────────────────────────────────
            speed_cfg = self._speed_cfg
            if speed_cfg.get("enabled") and dt > 0:
                dx = center[0] - prev_center[0]
                dy = center[1] - prev_center[1]
                pixels = math.sqrt(dx*dx + dy*dy)
                ppm    = speed_cfg.get("pixels_per_meter", 8.0)
                mps    = (pixels / ppm) / dt        # meters/second
                kmh    = mps * 3.6
                thresh = speed_cfg.get("threshold_kmh", 60.0)
                if kmh > thresh:
                    v = self._make_violation(
                        tid, vtype, conf, "OVERSPEEDING",
                        f"Estimated {kmh:.0f} km/h (threshold {thresh:.0f} km/h)",
                        state, now, frame, bbox
                    )
                    if v:
                        violations_found.append(v)

            # Update state
            state["prev_center"] = center
            state["prev_time"]   = now

        # Cleanup stale tracks
        active_ids = {d.get("track_id") for d in detections}
        stale = [tid for tid in self._track_state if tid not in active_ids]
        for tid in stale:
            del self._track_state[tid]

        return violations_found

    def _make_violation(
        self, track_id, vehicle_type, confidence, rule,
        reason, state, now, frame, bbox
    ) -> Optional[dict]:
        """
        Build a violation dict if cooldowns allow it.
        Encodes the cropped vehicle frame as base64 JPEG.
        """
        fired = state.get("fired", {})
        last = fired.get(rule, 0)
        if now - last < self.COOLDOWN_BETWEEN_SAME:
            return None
        if now - self._last_upload_time < self.UPLOAD_COOLDOWN:
            return None

        # Crop evidence frame around vehicle (+20% padding)
        x1, y1, x2, y2 = bbox
        pad_x = int((x2 - x1) * 0.2)
        pad_y = int((y2 - y1) * 0.2)
        x1c = max(0, x1 - pad_x)
        y1c = max(0, y1 - pad_y)
        x2c = min(frame.shape[1], x2 + pad_x)
        y2c = min(frame.shape[0], y2 + pad_y)
        crop = frame[y1c:y2c, x1c:x2c]

        # Encode to base64 JPEG
        evidence_b64 = None
        try:
            _, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 80])
            evidence_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()
        except Exception:
            pass

        violation = {
            "camera_id":         self.camera_id,
            "rule_triggered":    rule,
            "ai_confidence":     round(min(confidence, 0.99), 2),
            "location":          CAMERAS.get(self.camera_id, {}).get("location", "Unknown"),
            "plate_number":      f"PUV-{track_id:04d}",   # Placeholder — real ALPR needed
            "vehicle_type":      vehicle_type,
            "reason":            reason,
            "verification_status": "AI_SUGGESTED",
            "evidence_frame":    evidence_b64,
        }

        fired[rule]               = now
        state["fired"]            = fired
        self._last_upload_time    = now

        logger.info(f"🚨 [{self.camera_id}] Violation: {rule} | Track {track_id} | {reason}")
        return violation

    # ── Drawing helpers ───────────────────────────────────────────────────

    def annotate_frame(self, frame: np.ndarray, detections: list[dict], violations: list[dict], tl_state: str) -> np.ndarray:
        """Custom YOLO rendering based on GOVCHECK specs."""
        overlay = frame.copy()

        # Draw violation line
        for line in self._lines:
            # Blue diagonal violation line
            cv2.line(overlay, line["p1"], line["p2"], (255, 0, 0), 2)
            cv2.putText(overlay, line["name"], (line["p1"][0] + 10, line["p1"][1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

        # Identify violators in this frame or recently (we'll just use the ones returned this frame)
        violator_tids = {v.get("plate_number", "").replace("PUV-", "").lstrip("0"): v for v in violations}
        
        for det in detections:
            tid = det.get("track_id")
            if not tid: continue
            
            x1, y1, x2, y2 = det["bbox"]
            vtype = det["vehicle_type"].upper()
            label = f"{vtype} {tid}"
            
            is_violator = str(tid) in violator_tids
            color = (0, 255, 255) if is_violator else (0, 255, 0) # BGR Yellow or Green
            
            # Draw bounding box
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)
            
            # Draw filled label background
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(overlay, (x1, y1 - 20), (x1 + w, y1), color, -1)
            
            # Draw label text
            cv2.putText(overlay, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
            
            if is_violator:
                cv2.putText(overlay, "VIOLATION", (x1, y2 + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # Draw Traffic Light State at top
        tl_color = (0,255,0) if tl_state == "GREEN LIGHT" else (0,0,255) if tl_state == "RED LIGHT" else (0,255,255) if tl_state == "YELLOW LIGHT" else (255,255,255)
        cv2.putText(overlay, f"Traffic Light: {tl_state}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.0, tl_color, 2)
        
        return overlay


# ─────────────────────────────────────────────
# Per-Camera Processing State
# ─────────────────────────────────────────────
class CameraSession:
    """Holds all runtime state for a running camera."""

    def __init__(self, camera_id: str):
        self.camera_id      = camera_id
        self.running        = False
        self.thread: Optional[threading.Thread] = None
        self.counter        = VehicleCounter(line_position=0.6, axis="y")
        self.active_vehicles: dict[int, dict] = {}
        self.frame_count    = 0
        self.inference_fps  = 0.0
        self.video_fps      = 0.0
        self.last_frame_jpg: Optional[bytes] = None
        self.ws_clients: list[WebSocket] = []
        self._lock          = threading.Lock()
        self.detector: Optional[ViolationDetector] = None
        self.recent_violations: list[dict] = []  # Last N violations for WS broadcast
        self.traffic_light_state = "UNKNOWN"
        self.tl_state_history: list[str] = []    # Buffer for temporal smoothing

    def add_ws_client(self, ws: WebSocket):
        with self._lock:
            self.ws_clients.append(ws)

    def remove_ws_client(self, ws: WebSocket):
        with self._lock:
            if ws in self.ws_clients:
                self.ws_clients.remove(ws)

    def get_ws_clients(self) -> list[WebSocket]:
        with self._lock:
            return list(self.ws_clients)

    def push_violation(self, v: dict):
        with self._lock:
            self.recent_violations.append(v)
            if len(self.recent_violations) > 20:
                self.recent_violations.pop(0)

    def pop_violations(self) -> list[dict]:
        with self._lock:
            vs = list(self.recent_violations)
            self.recent_violations.clear()
            return vs


SESSIONS: dict[str, CameraSession] = {}


# ─────────────────────────────────────────────
# Violation Upload to Supabase
# ─────────────────────────────────────────────
def upload_violation_to_supabase(violation: dict, session: CameraSession):
    """Upload a violation event to Supabase in background thread."""
    if not supabase_client:
        return

    evidence_url = None
    if violation.get("evidence_frame"):
        try:
            # Decode base64 (format: data:image/jpeg;base64,...)
            b64_data = violation["evidence_frame"].split(",")[1]
            image_bytes = base64.b64decode(b64_data)
            
            # Generate unique filename
            filename = f"ai_evidence_{int(time.time())}_{violation['camera_id']}.jpg"
            
            # Upload to Supabase Storage 'evidence' bucket
            supabase_client.storage.from_("evidence").upload(
                path=filename,
                file=image_bytes,
                file_options={"content-type": "image/jpeg"}
            )
            
            # Get public URL
            evidence_url = supabase_client.storage.from_("evidence").get_public_url(filename)
        except Exception as e:
            logger.error(f"Failed to upload evidence image: {e}")

    # Prepare DB record
    db_row = {
        "camera_id":          violation["camera_id"],
        "rule_triggered":     violation["rule_triggered"],
        "ai_confidence":      violation["ai_confidence"],
        "location":           violation["location"],
        "plate_number":       violation["plate_number"],
        "verification_status": "AI_SUGGESTED",
        "evidence_image_url": evidence_url,
    }

    try:
        supabase_client.table("ai_violation_candidates").insert(db_row).execute()
        logger.info(f"✅ Uploaded violation to Supabase: {violation['rule_triggered']}")
    except Exception as e:
        logger.error(f"Supabase upload error: {e}")


# ─────────────────────────────────────────────
# Camera Processing Thread
# ─────────────────────────────────────────────
def camera_loop(session: CameraSession):
    cam    = CAMERAS[session.camera_id]
    s_type = StreamType(cam["stream_type"])
    stream = StreamManager(s_type, cam["stream_url"], loop=True)

    if not stream.open():
        logger.error(f"[{session.camera_id}] Cannot open stream: {cam['stream_url']}")
        CAMERAS[session.camera_id]["status"] = "OFFLINE"
        session.running = False
        return

    CAMERAS[session.camera_id]["status"] = "ONLINE"
    session.counter.configure_frame_size(stream.width, stream.height)

    # Init violation detector with actual frame dimensions
    session.detector = ViolationDetector(session.camera_id, stream.width, stream.height)
    logger.info(f"[{session.camera_id}] ViolationDetector initialized ({stream.width}×{stream.height})")

    frame_interval  = 1.0 / YOLO_INFERENCE_FPS
    last_infer_time = 0.0
    loop = asyncio.new_event_loop()

    logger.info(f"[{session.camera_id}] 🚀 Camera loop started.")

    for frame, is_loop_restart in stream.frames():
        if not session.running:
            break

        if is_loop_restart:
            logger.info(f"[{session.camera_id}] Video loop restarted. Resetting tracking and violation state.")
            # Clear historical state of detector and session
            session.detector = ViolationDetector(session.camera_id, stream.width, stream.height)
            session.active_vehicles = {}
            # Note: We pass persist=False to the YOLO tracker for this frame to reset ByteTrack IDs

        now = time.time()
        session.frame_count += 1

        if now - last_infer_time < frame_interval:
            _encode_frame(session, frame)
            continue

        last_infer_time = now
        t0 = time.perf_counter()

        # YOLO tracking
        results = model.track(
            frame,
            classes=VEHICLE_CLASSES,
            conf=YOLO_CONFIDENCE,
            imgsz=YOLO_IMG_SIZE,
            device=device,
            persist=not is_loop_restart,
            verbose=False,
            tracker="bytetrack.yaml"
        )

        elapsed = time.perf_counter() - t0
        session.inference_fps = 1.0 / elapsed if elapsed > 0 else 0

        detections = _parse_detections(results)
        session.counter.update(detections)
        session.active_vehicles = {d["track_id"]: d for d in detections if d.get("track_id")}

        # ── Traffic Light Extraction ──────────────────────────────────
        tl_candidate = "UNKNOWN"
        for det in detections:
            if det["vehicle_type"] == "TRAFFIC LIGHT":
                x1, y1, x2, y2 = det["bbox"]
                # Only process if bounding box is reasonably sized
                if (x2 - x1) < 5 or (y2 - y1) < 15:
                    continue
                
                tl_crop = frame[y1:y2, x1:x2]
                if tl_crop.size > 0:
                    hsv = cv2.cvtColor(tl_crop, cv2.COLOR_BGR2HSV)
                    
                    # Split into vertical thirds: top (red), middle (yellow), bottom (green)
                    h, w = tl_crop.shape[:2]
                    third = h // 3
                    if third == 0:
                        continue
                        
                    top_roi = hsv[0:third, :]
                    mid_roi = hsv[third:2*third, :]
                    bot_roi = hsv[2*third:h, :]
                    
                    # Red masks
                    mask1_r = cv2.inRange(top_roi, (0, 70, 50), (10, 255, 255))
                    mask2_r = cv2.inRange(top_roi, (170, 70, 50), (180, 255, 255))
                    mask_r = cv2.bitwise_or(mask1_r, mask2_r)
                    
                    # Yellow mask
                    mask_y = cv2.inRange(mid_roi, (15, 100, 100), (35, 255, 255))
                    
                    # Green mask
                    mask_g = cv2.inRange(bot_roi, (40, 40, 40), (90, 255, 255))
                    
                    r_pixels = cv2.countNonZero(mask_r)
                    y_pixels = cv2.countNonZero(mask_y)
                    g_pixels = cv2.countNonZero(mask_g)
                    
                    # Threshold logic
                    px_thresh = 10  # Minimum bright pixels to be considered
                    
                    if r_pixels > y_pixels and r_pixels > g_pixels and r_pixels > px_thresh:
                        tl_candidate = "RED LIGHT"
                    elif y_pixels > r_pixels and y_pixels > g_pixels and y_pixels > px_thresh:
                        tl_candidate = "YELLOW LIGHT"
                    elif g_pixels > r_pixels and g_pixels > y_pixels and g_pixels > px_thresh:
                        tl_candidate = "GREEN LIGHT"
                
                # Assume one traffic light controls the scene for now
                break

        # Temporal smoothing
        session.tl_state_history.append(tl_candidate)
        if len(session.tl_state_history) > 5:
            session.tl_state_history.pop(0)
            
        # Count occurrences in history
        counts = {}
        for s in session.tl_state_history:
            counts[s] = counts.get(s, 0) + 1
            
        # If any state is present 4 or more times in last 5 frames, it wins
        for s, count in counts.items():
            if count >= 4:
                session.traffic_light_state = s
                break

        # ── Real violation detection ──────────────────────────────────
        violations = []
        if session.detector and detections:
            violations = session.detector.detect(detections, frame, tl_state)
            for v in violations:
                session.push_violation(v)
                # Upload to Supabase in separate thread (non-blocking)
                t = threading.Thread(
                    target=upload_violation_to_supabase, args=(v, session), daemon=True
                )
                t.start()

        # Annotate: draw custom GOVCHECK overlay
        if session.detector:
            annotated = session.detector.annotate_frame(frame, detections, violations, tl_state)
        else:
            annotated = frame

        _encode_frame(session, annotated)

        # Build and broadcast WS payload
        recent_violations = session.pop_violations()
        payload = _build_ws_payload(session, detections, recent_violations)
        _broadcast(session, payload, loop)

    stream.close()
    CAMERAS[session.camera_id]["status"] = "OFFLINE"
    session.running = False
    logger.info(f"[{session.camera_id}] Camera loop stopped.")


def _parse_detections(results) -> list[dict]:
    dets = []
    if not results:
        return dets
    res = results[0] if isinstance(results, list) else results
    if not hasattr(res, 'boxes') or res.boxes is None:
        return dets
    boxes = res.boxes
    for box in boxes:
        try:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf  = float(box.conf[0])
            cls   = int(box.cls[0])
            tid   = int(box.id[0]) if box.id is not None else None
            vtype = CLASS_NAMES.get(cls, "vehicle")
            dets.append({
                "track_id":     tid,
                "vehicle_type": vtype,
                "confidence":   round(conf, 3),
                "bbox":         [x1, y1, x2, y2],
            })
        except Exception:
            continue
    return dets


def _encode_frame(session: CameraSession, frame):
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    with session._lock:
        session.last_frame_jpg = buf.tobytes()


def _build_ws_payload(session: CameraSession, detections: list[dict], violations: list[dict]) -> dict:
    counts = session.counter.snapshot()
    return {
        "type":             "statistics",
        "camera_id":        session.camera_id,
        "active_vehicles":  len(session.active_vehicles),
        "inference_fps":    round(session.inference_fps, 1),
        "traffic_light_state": session.traffic_light_state,
        "detections":       detections,
        "counts":           counts,
        "violations":       violations,   # NEW: real violation events
        "timestamp":        datetime.utcnow().isoformat(),
    }


def _broadcast(session: CameraSession, payload: dict, loop: asyncio.AbstractEventLoop):
    import json
    msg = json.dumps(payload)
    clients = session.get_ws_clients()
    if not clients:
        return

    async def _send_all():
        for ws in clients:
            try:
                await ws.send_text(msg)
            except Exception:
                pass

    asyncio.run_coroutine_threadsafe(_send_all(), loop)


# ─────────────────────────────────────────────
# REST Endpoints
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":     "ok",
        "service":    "GOVCHECK AI Service",
        "version":    "3.0.0",
        "yolo_model": YOLO_MODEL_PATH,
        "device":     YOLO_DEVICE,
        "timestamp":  datetime.utcnow().isoformat(),
    }


@app.get("/api/cameras")
def list_cameras():
    result = []
    for cam_id, cam in CAMERAS.items():
        session = SESSIONS.get(cam_id)
        result.append({
            **cam,
            "active_vehicles": len(session.active_vehicles) if session else 0,
            "inference_fps":   round(session.inference_fps, 1) if session else 0,
            "running":         session.running if session else False,
        })
    return result


@app.get("/api/cameras/{camera_id}/status")
def camera_status(camera_id: str):
    cam = CAMERAS.get(camera_id)
    if not cam:
        return JSONResponse({"error": "Camera not found"}, status_code=404)
    session = SESSIONS.get(camera_id)
    return {
        **cam,
        "running":         session.running if session else False,
        "active_vehicles": len(session.active_vehicles) if session else 0,
        "inference_fps":   round(session.inference_fps, 1) if session else 0,
        "frame_count":     session.frame_count if session else 0,
    }


@app.post("/api/cameras/{camera_id}/start")
def start_camera(camera_id: str):
    cam = CAMERAS.get(camera_id)
    if not cam:
        return JSONResponse({"error": "Camera not found"}, status_code=404)

    session = SESSIONS.get(camera_id)
    if session and session.running:
        return {"status": "already_running", "camera_id": camera_id}

    session = CameraSession(camera_id)
    SESSIONS[camera_id] = session
    session.running = True

    t = threading.Thread(target=camera_loop, args=(session,), daemon=True)
    session.thread = t
    t.start()

    return {"status": "started", "camera_id": camera_id}


@app.post("/api/cameras/{camera_id}/stop")
def stop_camera(camera_id: str):
    session = SESSIONS.get(camera_id)
    if not session or not session.running:
        return {"status": "not_running", "camera_id": camera_id}
    session.running = False
    CAMERAS[camera_id]["status"] = "OFFLINE"
    return {"status": "stopped", "camera_id": camera_id}


# ─────────────────────────────────────────────
# Camera Source Configuration & Testing
# ─────────────────────────────────────────────

class StreamTestRequest(BaseModel):
    stream_type: str
    stream_url: str

@app.post("/api/cameras/test-stream")
def test_stream(req: StreamTestRequest):
    """Test a stream URL (HLS, RTSP, MJPEG, Webcam, File) and return its capabilities."""
    logger.info(f"Testing stream: {req.stream_type} @ {req.stream_url}")
    result = validate_stream(req.stream_type, req.stream_url)
    return result


class StreamAddRequest(BaseModel):
    camera_id: str
    name: str
    location: str
    stream_type: str
    stream_url: str

@app.post("/api/cameras/add-stream")
def add_stream(req: StreamAddRequest):
    """Register a new camera source dynamically."""
    if req.camera_id in CAMERAS:
        return JSONResponse({"error": "Camera ID already exists"}, status_code=400)
        
    CAMERAS[req.camera_id] = {
        "id":          req.camera_id,
        "name":        req.name,
        "location":    req.location,
        "stream_type": req.stream_type,
        "stream_url":  req.stream_url,
        "enabled":     True,
        "status":      "OFFLINE",
    }
    
    # Initialize default config in DB
    if supabase_client:
        try:
            supabase_client.table("camera_configs").insert({
                "camera_id": req.camera_id,
                "camera_name": req.name,
                "camera_location": req.location,
                "violation_lines": DEFAULT_VIOLATION_CONFIG.get("lines", []),
                "violation_zones": DEFAULT_VIOLATION_CONFIG.get("zones", []),
                "speed_config": DEFAULT_VIOLATION_CONFIG.get("speed", {})
            }).execute()
        except Exception as e:
            logger.warning(f"Could not init DB config for {req.camera_id}: {e}")
            
    return {"status": "added", "camera": CAMERAS[req.camera_id]}


class StreamSetSourceRequest(BaseModel):
    stream_type: str
    stream_url: str

@app.post("/api/cameras/{camera_id}/set-source")
def set_camera_source(camera_id: str, req: StreamSetSourceRequest):
    """Change the source of an existing camera (e.g. switch to Webcam)."""
    if camera_id not in CAMERAS:
        return JSONResponse({"error": "Camera not found"}, status_code=404)
        
    session = SESSIONS.get(camera_id)
    if session and session.running:
        session.running = False
        time.sleep(0.5)
        
    CAMERAS[camera_id]["stream_type"] = req.stream_type
    CAMERAS[camera_id]["stream_url"] = req.stream_url
    
    return {"status": "source_updated", "camera_id": camera_id, "type": req.stream_type}


# ─────────────────────────────────────────────
# Webcam Push-Frame Architecture
# ─────────────────────────────────────────────

class WebcamFrameRequest(BaseModel):
    frame_b64: str  # data:image/jpeg;base64,...

@app.post("/api/cameras/webcam/frame")
async def process_webcam_frame(req: WebcamFrameRequest):
    """
    Accepts a single base64 frame from the browser webcam, runs YOLO, and returns annotations.
    This provides 'real' analysis of webcam footage without WebRTC complexity.
    """
    try:
        header, encoded = req.frame_b64.split(",", 1)
        data = base64.b64decode(encoded)
        np_arr = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return JSONResponse({"error": "Invalid image data"}, status_code=400)
            
        # Run YOLO inference
        results = model.track(
            frame,
            classes=VEHICLE_CLASSES,
            conf=YOLO_CONFIDENCE,
            imgsz=YOLO_IMG_SIZE,
            device=device,
            persist=True,
            verbose=False,
            tracker="bytetrack.yaml"
        )
        
        detections = _parse_detections(results)
        
        # We don't maintain complex line-crossing state for this stateless endpoint,
        # but we do return the bounding boxes for the frontend to render
        
        return {
            "success": True,
            "detections": detections,
            "vehicle_count": len(detections)
        }
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# ─────────────────────────────────────────────
# Video Upload Endpoint
# ─────────────────────────────────────────────
@app.post("/api/cameras/{camera_id}/upload_video")
async def upload_video(camera_id: str, file: UploadFile = File(...)):
    """
    Upload a pre-recorded video to be used as the camera stream source.
    The camera will automatically restart with the new video.
    Supports: mp4, avi, mov, mkv
    """
    if camera_id not in CAMERAS:
        return JSONResponse({"error": "Camera not found"}, status_code=404)

    ext = Path(file.filename).suffix.lower()
    if ext not in [".mp4", ".avi", ".mov", ".mkv", ".webm"]:
        return JSONResponse({"error": "Unsupported video format"}, status_code=400)

    # Save uploaded file
    dest = VIDEO_UPLOAD_DIR / f"{camera_id}_uploaded{ext}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    size_mb = dest.stat().st_size / (1024 * 1024)
    logger.info(f"📤 Video uploaded for {camera_id}: {dest} ({size_mb:.1f} MB)")

    # Stop current session if running
    session = SESSIONS.get(camera_id)
    if session and session.running:
        session.running = False
        time.sleep(0.5)  # Let thread finish cleanly

    # Update camera to use the uploaded file
    CAMERAS[camera_id]["stream_type"] = "file"
    CAMERAS[camera_id]["stream_url"]  = str(dest)

    return {
        "status":   "uploaded",
        "camera_id": camera_id,
        "file":     file.filename,
        "size_mb":  round(size_mb, 2),
        "stream_url": str(dest),
        "message":  "Video uploaded. Click 'Start AI' to begin processing.",
    }


@app.get("/api/cameras/{camera_id}/violation_config")
def get_violation_config(camera_id: str):
    """Get the violation detection configuration for a camera from DB."""
    if supabase_client:
        try:
            res = supabase_client.table("camera_configs").select("*").eq("camera_id", camera_id).execute()
            if res.data:
                row = res.data[0]
                config = {
                    "lines": row.get("violation_lines", []),
                    "zones": row.get("violation_zones", []),
                    "speed": row.get("speed_config", {}),
                    "tl_roi": row.get("tl_roi", {})
                }
                CAMERA_VIOLATION_CONFIGS[camera_id] = config
                return config
        except Exception as e:
            logger.error(f"Error reading config from DB: {e}")
            
    # Fallback to memory
    return CAMERA_VIOLATION_CONFIGS.get(camera_id, DEFAULT_VIOLATION_CONFIG)


@app.post("/api/cameras/{camera_id}/violation_config")
async def set_violation_config(camera_id: str, config: dict):
    """Update the violation detection configuration for a camera in DB."""
    CAMERA_VIOLATION_CONFIGS[camera_id] = config
    
    if supabase_client:
        try:
            supabase_client.table("camera_configs").upsert({
                "camera_id": camera_id,
                "violation_lines": config.get("lines", []),
                "violation_zones": config.get("zones", []),
                "speed_config": config.get("speed", {}),
                "tl_roi": config.get("tl_roi", {}),
                "updated_at": datetime.utcnow().isoformat()
            }, on_conflict="camera_id").execute()
        except Exception as e:
            logger.error(f"Error writing config to DB: {e}")
            
    # Reinitialize detector if running
    session = SESSIONS.get(camera_id)
    if session and session.running and hasattr(session, 'detector') and session.detector:
        # Create a new detector with updated config
        w, h = session.detector.W, session.detector.H
        session.detector = ViolationDetector(camera_id, w, h)
        logger.info(f"[{camera_id}] Live detector reloaded with new config")
        
    return {"status": "config_updated", "camera_id": camera_id}


@app.get("/api/statistics")
def get_statistics():
    stats = {}
    for cam_id, session in SESSIONS.items():
        if session.running:
            stats[cam_id] = {
                "camera_id":     cam_id,
                "counts":        session.counter.snapshot(),
                "active":        len(session.active_vehicles),
                "inference_fps": round(session.inference_fps, 1),
            }
    return stats


# ─────────────────────────────────────────────
# Video Analysis Endpoint (Upload & YOLO)
# ─────────────────────────────────────────────
@app.post("/analyze-video")
async def analyze_video(file: UploadFile = File(...)):
    """
    Accept a video upload, run YOLO frame-by-frame, detect vehicles and violations,
    save valid candidates to Supabase, and return structured results.
    """
    # Validate file extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".mp4", ".avi", ".mov", ".mkv", ".webm"]:
        return JSONResponse({"error": f"Unsupported format: {ext}. Use .mp4, .avi, .mov, .mkv, or .webm"}, status_code=400)

    # Save temp file
    tmp_path = VIDEO_UPLOAD_DIR / f"analyze_{int(time.time())}{ext}"
    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        return JSONResponse({"error": f"Failed to save uploaded file: {e}"}, status_code=500)

    cap = cv2.VideoCapture(str(tmp_path))
    if not cap.isOpened():
        tmp_path.unlink(missing_ok=True)
        return JSONResponse({"error": "Could not open video file"}, status_code=400)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = round(total_frames / fps, 1) if fps > 0 else 0

    detections: list[dict] = []
    saved_violations: list[dict] = []
    seen_dedup: set[str] = set()  # Deduplication: rule + ~2-second time window

    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    counter = VehicleCounter(line_position=0.6, axis="y")
    detector = ViolationDetector("analyze_upload", W, H)
    frame_idx = 0
    # Process every Nth frame for speed (≈5 fps effective)
    sample_every = max(1, int(fps / 5))

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            if frame_idx % sample_every != 0:
                continue

            device_arg = None if YOLO_DEVICE == "auto" else YOLO_DEVICE
            results = model.track(frame, persist=True, verbose=False, device=device_arg)
            if not results or results[0].boxes is None:
                continue

            r = results[0]
            boxes_xyxy = r.boxes.xyxy.cpu().numpy() if r.boxes.xyxy is not None else []
            confs      = r.boxes.conf.cpu().numpy() if r.boxes.conf is not None else []
            class_ids  = r.boxes.cls.cpu().numpy().astype(int) if r.boxes.cls is not None else []
            track_ids  = r.boxes.id.cpu().numpy().astype(int) if r.boxes.id is not None else []

            for i, box in enumerate(boxes_xyxy):
                if i >= len(confs) or i >= len(class_ids):
                    break
                class_name = model.names.get(int(class_ids[i]), "unknown")
                detections.append({
                    "frame": frame_idx,
                    "class": class_name,
                    "confidence": round(float(confs[i]), 3),
                    "timestamp_s": round(frame_idx / fps, 2),
                })

            # Run violation detection
            parsed_dets = _parse_detections(r)
            violations_found = detector.detect(parsed_dets, frame)
            for v in violations_found:
                # Dedup: same rule within 5 seconds
                bucket_s = int((frame_idx / fps) / 5)
                key = f"{v['rule_triggered']}_{bucket_s}"
                if key in seen_dedup:
                    continue
                seen_dedup.add(key)

                # Capture evidence frame
                _, jpg_buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                b64_img = "data:image/jpeg;base64," + base64.b64encode(jpg_buf.tobytes()).decode()

                # Upload evidence to Supabase Storage
                evidence_url = None
                if supabase_client:
                    try:
                        filename = f"ai_evidence_{int(time.time())}_{frame_idx}.jpg"
                        supabase_client.storage.from_("evidence").upload(
                            path=filename,
                            file=jpg_buf.tobytes(),
                            file_options={"content-type": "image/jpeg"}
                        )
                        evidence_url = supabase_client.storage.from_("evidence").get_public_url(filename)
                    except Exception as e:
                        logger.warning(f"Evidence upload failed: {e}")

                # Save to Supabase
                db_row = {
                    "camera_id":           "video_upload",
                    "rule_triggered":      v["rule_triggered"],
                    "ai_confidence":       round(float(v.get("ai_confidence", 0.85)), 2),
                    "location":            "Uploaded Video Analysis",
                    "plate_number":        v.get("plate_number") or "UNKNOWN",
                    "verification_status": "AI_SUGGESTED",
                    "evidence_image_url":  evidence_url,
                }
                if supabase_client:
                    try:
                        supabase_client.table("ai_violation_candidates").insert(db_row).execute()
                    except Exception as e:
                        logger.error(f"Supabase insert failed: {e}")

                saved_violations.append({**db_row, "timestamp_s": round(frame_idx / fps, 2)})

    finally:
        cap.release()
        tmp_path.unlink(missing_ok=True)

    # Summarize vehicle type counts
    type_counts: dict[str, int] = {}
    for d in detections:
        type_counts[d["class"]] = type_counts.get(d["class"], 0) + 1

    return {
        "success": True,
        "video": {
            "filename": file.filename,
            "duration_s": duration,
            "total_frames": total_frames,
            "frames_analyzed": frame_idx // sample_every,
        },
        "summary": {
            "vehicles_detected": len(detections),
            "vehicle_types": type_counts,
            "violations_detected": len(saved_violations),
            "violations_saved_to_db": len(saved_violations),
        },
        "violations": saved_violations,
        "detections_sample": detections[:50],  # Return first 50 to keep payload small
    }


# ─────────────────────────────────────────────
# MJPEG Live Feed
# ─────────────────────────────────────────────
@app.get("/api/cameras/{camera_id}/stream")
async def mjpeg_stream(camera_id: str):
    session = SESSIONS.get(camera_id)
    if not session or not session.running:
        return JSONResponse({"error": "Camera not running"}, status_code=503)

    def generate():
        boundary = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
        while session and session.running:
            with session._lock:
                jpg = session.last_frame_jpg
            if jpg:
                yield boundary + jpg + b"\r\n"
            time.sleep(1 / 30)

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ─────────────────────────────────────────────
# WebSocket Endpoint
# ─────────────────────────────────────────────
@app.websocket("/ws/camera/{camera_id}")
async def ws_camera(websocket: WebSocket, camera_id: str):
    await websocket.accept()
    logger.info(f"[WS] Client connected to {camera_id}")

    session = SESSIONS.get(camera_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Camera not started"})
        await websocket.close()
        return

    session.add_ws_client(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.debug(f"[WS] Received: {data}")
    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected from {camera_id}")
    finally:
        session.remove_ws_client(websocket)


# ─────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT") or os.environ.get("AI_SERVICE_PORT", "8001"))
    logger.info(f"🚀 Starting GOVCHECK AI Service v3.0 on http://0.0.0.0:{port}")
    # IMPORTANT: Pass the `app` object directly (not "main:app" string).
    # Using a string causes uvicorn to spawn a subprocess on Windows which
    # re-imports main.py — initializing YOLO/Supabase twice and causing
    # winerror 10048 (address already in use) on the second bind attempt.
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
