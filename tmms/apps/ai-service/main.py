
import asyncio
import base64
import io
import json
import logging
import math
import os
import re
import shutil
import subprocess
import threading
import time
from collections import deque
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
load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("govcheck-ai")

# ---------------------------------------------------------------------------
# YouTube live stream resolver
# ---------------------------------------------------------------------------
_YT_URL_RE = re.compile(r"(youtube\.com|youtu\.be)")

def resolve_youtube_stream(yt_url: str, timeout: int = 60) -> Optional[str]:
    """Use yt-dlp to resolve a YouTube live stream URL into a direct HLS m3u8 URL.
    Tries Node.js as the JS runtime (required for modern YouTube extraction).
    Returns the URL even when yt-dlp exits with warnings (exit code 1).
    """
    ytdlp_exe = Path(__file__).parent / "venv" / "Scripts" / "yt-dlp.exe"
    if not ytdlp_exe.exists():
        ytdlp_exe = "yt-dlp"  # fallback to PATH

    # Find node.js runtime
    import shutil as _shutil
    node_bin = _shutil.which("node") or r"C:\Program Files\nodejs\node.exe"

    cmd = [
        str(ytdlp_exe), "-g", "--no-playlist",
        # Prefer 720p video-only HLS, fallback to lower resolution
        "-f", "232/231/230/229/269",
        "--hls-prefer-native",
        "--js-runtimes", f"node:{node_bin}",
        yt_url,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        # yt-dlp may exit with code 1 due to warnings even if URL was printed
        stdout = result.stdout.strip()
        lines = [l.strip() for l in stdout.splitlines()
                 if l.strip() and not l.startswith("WARNING") and not l.startswith("ERROR")]
        if lines:
            url = lines[0]
            logger.info(f"✅ Resolved YouTube stream ({url[:60]}...)")
            return url
        stderr = result.stderr.strip()
        logger.error(f"yt-dlp failed to resolve stream. stderr: {stderr[:400]}")
    except subprocess.TimeoutExpired:
        logger.error("yt-dlp timed out resolving YouTube URL")
    except FileNotFoundError:
        logger.error("yt-dlp not found — install with: pip install yt-dlp")
    except Exception as e:
        logger.error(f"resolve_youtube_stream error: {e}")
    return None


SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
YOLO_MODEL_PATH    = os.environ.get("YOLO_MODEL_PATH", "./models/yolov8s.pt")
YOLO_CONFIDENCE    = float(os.environ.get("YOLO_CONFIDENCE", "0.35"))
YOLO_IMG_SIZE      = int(os.environ.get("YOLO_IMG_SIZE", "1280"))
YOLO_INFERENCE_FPS = int(os.environ.get("YOLO_INFERENCE_FPS", "10"))
YOLO_DEVICE        = os.environ.get("YOLO_DEVICE", "auto")
TL_CLASSIFIER_MODEL_PATH = os.environ.get("TL_CLASSIFIER_MODEL", "")
OCR_ENABLED        = os.environ.get("OCR_ENABLED", "false").lower() == "true"
OCR_MIN_CONFIDENCE = float(os.environ.get("OCR_MIN_CONFIDENCE", "0.5"))
CCTV_STREAM_TYPE = os.environ.get("CCTV_STREAM_TYPE", "file")
_raw_stream_url  = os.environ.get(
    "CCTV_STREAM_URL",
    str((Path(__file__).parent / "../web/src/assets/sample.mp4").resolve())
)
_script_dir = Path(__file__).parent
if not Path(_raw_stream_url).is_absolute() and not _raw_stream_url.startswith("rtsp") and not _raw_stream_url.startswith("http"):
    CCTV_STREAM_URL = str((_script_dir / _raw_stream_url).resolve())
else:
    CCTV_STREAM_URL = _raw_stream_url
VEHICLE_CLASSES = [2, 3, 5, 7, 9]
CLASS_NAMES = {
    2: "CAR",
    3: "MOTORCYCLE",
    5: "BUS",
    7: "TRUCK",
    9: "TRAFFIC LIGHT",
}
PH_CLASS_NAMES = {
    0: "CAR",
    1: "MOTORCYCLE",
    2: "BUS",
    3: "TRUCK",
    4: "TRAFFIC LIGHT",
    5: "TRICYCLE",
    6: "JEEPNEY",
    7: "PEDICAB",
    8: "E-BIKE",
}
VIDEO_UPLOAD_DIR = Path(__file__).parent / "test-videos" / "uploads"
VIDEO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
supabase_client: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase client initialized.")
    except Exception as e:
        logger.warning(f"⚠️  Supabase init failed: {e}")
else:
    logger.warning("⚠️  SUPABASE_URL/KEY not set — running without DB.")
def _load_model_with_fallback() -> YOLO:
    script_dir = Path(__file__).parent
    fallback_chain = [
        YOLO_MODEL_PATH,
        str(script_dir / "models" / "tl_violation_runs" / "rtl_v1" / "weights" / "best.pt"),
        str(script_dir / "models" / "rtl_violation_v1.pt"),
        str(script_dir / "models" / "yolov8s.pt"),
        str(script_dir / "models" / "yolov8n.pt"),
        "yolov8s.pt",   
    ]
    for model_path in fallback_chain:
        resolved = Path(model_path) if Path(model_path).is_absolute() else script_dir / model_path
        if resolved.exists() or not Path(model_path).suffix == ".pt":
            try:
                active_path = str(resolved) if Path(model_path).suffix == ".pt" else model_path
                logger.info(f"🔄 Loading YOLO model: {active_path}")
                m = YOLO(active_path)
                logger.info(f"✅ YOLO model loaded: {active_path} | Device: {YOLO_DEVICE}")
                return m, active_path
            except Exception as e:
                logger.warning(f"⚠️  Failed to load {model_path}: {e}")
        else:
            logger.info(f"ℹ️  Model not found locally, skipping: {model_path}")
    logger.info("🔄 Auto-downloading yolov8s.pt from Ultralytics...")
    m = YOLO("yolov8s.pt")
    dest = script_dir / "models" / "yolov8s.pt"
    shutil.copy("yolov8s.pt", dest)
    logger.info(f"✅ yolov8s.pt downloaded and saved to {dest}")
    return m, "yolov8s.pt"
model, ACTIVE_MODEL_PATH = _load_model_with_fallback()
device = None if YOLO_DEVICE == "auto" else YOLO_DEVICE
IS_COCO_MODEL = len(getattr(model, "names", {})) == 80
IS_CUSTOM_PH_MODEL = "ph_traffic" in Path(ACTIVE_MODEL_PATH).name.lower()
logger.info(f"📋 Model type: COCO={IS_COCO_MODEL}, PH_MODEL={IS_CUSTOM_PH_MODEL}")

class PlateOCR:
    PH_PLATE_PATTERN = re.compile(
        r"^[A-Z]{2,3}\s?\d{3,4}[A-Z]?$",
        re.IGNORECASE
    )
    MIN_PLATE_CONFIDENCE = OCR_MIN_CONFIDENCE
    def __init__(self, enabled: bool = OCR_ENABLED):
        self.enabled = enabled
        self._reader = None
        self._plate_detector: Optional[YOLO] = None
        self._initialized = False
        if enabled:
            self._init_reader()
            self._init_plate_detector()
    def _init_reader(self):
        try:
            import easyocr
            self._reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            logger.info("✅ EasyOCR initialized for license plate reading.")
            self._initialized = True
        except ImportError:
            logger.warning("⚠️  EasyOCR not installed — plate OCR disabled. Run: pip install easyocr")
            self.enabled = False
        except Exception as e:
            logger.warning(f"⚠️  EasyOCR init failed: {e}")
            self.enabled = False
    def _init_plate_detector(self):
        plate_model_path = Path(__file__).parent / "models" / "plate_detector_v1.pt"
        if plate_model_path.exists():
            try:
                self._plate_detector = YOLO(str(plate_model_path))
                logger.info("✅ Plate detector model loaded.")
            except Exception as e:
                logger.warning(f"⚠️  Plate detector load failed: {e}")
                self._plate_detector = None
        else:
            logger.info("ℹ️  No plate_detector_v1.pt found — using full vehicle crop for OCR.")
    def extract(self, frame: np.ndarray, vehicle_bbox: list) -> tuple[Optional[str], float]:
        if not self.enabled or not self._initialized:
            return None, 0.0
        x1, y1, x2, y2 = vehicle_bbox
        vehicle_crop = frame[y1:y2, x1:x2]
        if vehicle_crop.size == 0:
            return None, 0.0
        plate_region = vehicle_crop  
        if self._plate_detector is not None:
            try:
                plate_results = self._plate_detector(vehicle_crop, verbose=False, conf=0.4)
                if plate_results and plate_results[0].boxes is not None and len(plate_results[0].boxes) > 0:
                    box = plate_results[0].boxes[0]
                    px1, py1, px2, py2 = map(int, box.xyxy[0])
                    plate_region = vehicle_crop[py1:py2, px1:px2]
                    if plate_region.size == 0:
                        plate_region = vehicle_crop
            except Exception as e:
                logger.debug(f"Plate detector error: {e}")
                plate_region = vehicle_crop
        try:
            gray = cv2.cvtColor(plate_region, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape
            if w < 100:
                scale = 100 / w
                gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            gray = cv2.bilateralFilter(gray, 11, 17, 17)
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            ocr_input = binary
        except Exception:
            ocr_input = plate_region
        try:
            results = self._reader.readtext(ocr_input, allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ")
            if not results:
                return None, 0.0
            best_text = ""
            best_conf = 0.0
            for (_, text, conf) in results:
                if conf > best_conf:
                    best_text = text.upper().strip()
                    best_conf = conf
            if best_conf < self.MIN_PLATE_CONFIDENCE:
                return None, best_conf
            cleaned = re.sub(r"\s+", " ", best_text).strip()
            if self.PH_PLATE_PATTERN.match(cleaned):
                return cleaned, round(best_conf, 3)
            if len(cleaned) >= 4 and any(c.isdigit() for c in cleaned):
                return cleaned, round(best_conf * 0.7, 3)  
            return None, best_conf
        except Exception as e:
            logger.debug(f"OCR extraction error: {e}")
            return None, 0.0
plate_ocr = PlateOCR(enabled=OCR_ENABLED)
if not OCR_ENABLED:
    logger.info("ℹ️  OCR_ENABLED=false — plate numbers will be tracked by ID only. Set OCR_ENABLED=true to enable.")
app = FastAPI(title="GOVCHECK AI Service", version="4.0.0")
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
CAMERAS: dict[str, dict] = {
    "CAM-001": {
        "id":          "CAM-001",
        "name":        "Live Traffic — YouTube",
        "location":    "Live Traffic Camera",
        "stream_type": "youtube",
        "stream_url":  "https://www.youtube.com/watch?v=sTF-6_xinUU",
        "enabled":     True,
        "status":      "OFFLINE",
    }
}
DEFAULT_VIOLATION_CONFIG = {
    "lines": [
        {
            "name":      "Violation Line",
            "p1":        [0.05, 0.55],
            "p2":        [0.95, 0.75],
            "rule":      "BEAT_RED_LIGHT",
            "direction": "down",
            "approach_zone_y": [0.30, 0.55],
        },
    ],
    "zones": [
        {
            "name":          "No Stopping Zone",
            "points":        [[0.3, 0.55], [0.7, 0.55], [0.7, 0.75], [0.3, 0.75]],
            "rule":          "OBSTRUCTION",
            "dwell_seconds": float(os.environ.get("OBSTRUCTION_DWELL_S", "6.0")),
        },
        {
            "name":          "No Parking — Sidewalk",
            "points":        [[0.0, 0.85], [0.35, 0.85], [0.35, 1.0], [0.0, 1.0]],
            "rule":          "ILLEGAL_PARKING",
            "dwell_seconds": float(os.environ.get("PARKING_DWELL_S", "15.0")),
        },
    ],
    "speed": {
        "enabled":            True,
        "pixels_per_meter":   float(os.environ.get("SPEED_PIXELS_PER_METER", "8.0")),
        "threshold_kmh":      float(os.environ.get("SPEED_THRESHOLD_KMH", "60.0")),
        "is_calibrated":      os.environ.get("SPEED_IS_CALIBRATED", "false").lower() == "true",
    },
    "swerving": {
        "enabled":            True,
        "min_lateral_px":     float(os.environ.get("SWERVING_MIN_LATERAL_PX", "30.0")),
        "trajectory_frames":  int(os.environ.get("SWERVING_TRAJECTORY_FRAMES", "8")),
        "min_direction_changes": int(os.environ.get("SWERVING_MIN_DIR_CHANGES", "2")),
        "cooldown_s":         float(os.environ.get("SWERVING_COOLDOWN_S", "20.0")),
    },
}
CAMERA_VIOLATION_CONFIGS: dict[str, dict] = {
    "CAM-001": DEFAULT_VIOLATION_CONFIG,
}
class ViolationDetector:
    COOLDOWN_BETWEEN_SAME = 15.0   
    UPLOAD_COOLDOWN       = 3.0    
    MIN_DETECTION_CONF    = 0.50   
    def __init__(self, camera_id: str, frame_width: int, frame_height: int):
        self.camera_id = camera_id
        self.W         = frame_width
        self.H         = frame_height
        self.config    = CAMERA_VIOLATION_CONFIGS.get(camera_id, DEFAULT_VIOLATION_CONFIG)
        self._lines     = self._resolve_lines(self.config.get("lines", []))
        self._zones     = self._resolve_zones(self.config.get("zones", []))
        self._speed_cfg = self.config.get("speed", {})
        self._sw_cfg    = self.config.get("swerving", {})
        self._track_state: dict[int, dict] = {}
        self._last_upload_time = 0.0
    def _px(self, pct_point):
        return (int(pct_point[0] * self.W), int(pct_point[1] * self.H))
    def _resolve_lines(self, lines_cfg):
        resolved = []
        for l in lines_cfg:
            entry = {**l, "p1": self._px(l["p1"]), "p2": self._px(l["p2"])}
            if "approach_zone_y" in l:
                ay = l["approach_zone_y"]
                entry["approach_zone_y_px"] = (
                    int(ay[0] * self.H),
                    int(ay[1] * self.H),
                )
            resolved.append(entry)
        return resolved
    def _resolve_zones(self, zones_cfg):
        resolved = []
        for z in zones_cfg:
            pts = np.array([self._px(p) for p in z["points"]], dtype=np.int32)
            resolved.append({**z, "pts": pts})
        return resolved
    @staticmethod
    def _segments_intersect(p1, p2, p3, p4):
        def ccw(A, B, C):
            return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])
        return (ccw(p1, p3, p4) != ccw(p2, p3, p4)) and (ccw(p1, p2, p3) != ccw(p1, p2, p4))
    @staticmethod
    def _point_in_polygon(point, polygon_pts):
        return cv2.pointPolygonTest(polygon_pts, point, False) >= 0
    @staticmethod
    def _bbox_center(bbox):
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) // 2, (y1 + y2) // 2)
    @staticmethod
    def _bbox_bottom(bbox):
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) // 2, y2)
    @staticmethod
    def _distance(p1, p2) -> float:
        return math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2)
    @staticmethod
    def _find_best_tl_bbox(detections: list[dict]) -> Optional[list]:
        """Return the bbox of the highest-confidence traffic-light detection, or None."""
        TL_TYPES = {
            "red_light", "RED_LIGHT", "RED LIGHT",
            "green_light", "GREEN_LIGHT", "GREEN LIGHT",
            "yellow_light", "YELLOW_LIGHT", "YELLOW LIGHT",
            "TRAFFIC LIGHT", "traffic light",
        }
        best_conf = 0.0
        best_bbox = None
        for d in detections:
            vt = d.get("vehicle_type", "")
            if vt in TL_TYPES or vt.upper().replace("_", " ") in TL_TYPES:
                if d.get("confidence", 0) > best_conf:
                    best_conf = d["confidence"]
                    best_bbox = d["bbox"]
        return best_bbox

    def detect(self, detections: list[dict], frame: np.ndarray, traffic_light_state: str = "UNKNOWN") -> list[dict]:
        now = time.time()
        violations_found = []
        for det in detections:
            tid  = det.get("track_id")
            if tid is None:
                continue
            if det.get("confidence", 0) < self.MIN_DETECTION_CONF:
                continue
            vtype = det.get("vehicle_type", "")
            vtype_upper = vtype.upper()
            # Skip traffic light detections — they are not vehicles
            if vtype_upper in ("TRAFFIC LIGHT", "RED_LIGHT", "GREEN_LIGHT", "YELLOW_LIGHT",
                               "RED LIGHT", "GREEN LIGHT", "YELLOW LIGHT",
                               "red_light", "green_light", "yellow_light"):
                continue
            bbox   = det["bbox"]
            center = self._bbox_center(bbox)
            bottom = self._bbox_bottom(bbox)
            vtype  = det.get("vehicle_type", "vehicle")
            conf   = det.get("confidence", 0.5)
            if tid not in self._track_state:
                self._track_state[tid] = {
                    "prev_center":    center,
                    "prev_bottom":    bottom,
                    "prev_time":      now,
                    "zone_entry":     {},
                    "fired":          {},
                    "approach_seen":  {},
                    "trajectory":     deque(maxlen=self._sw_cfg.get("trajectory_frames", 8)),
                    "stationary_since": None,
                    "moving_frames": 0,
                }
            state = self._track_state[tid]
            prev_center = state["prev_center"]
            prev_bottom = state.get("prev_bottom", bottom)
            prev_time   = state["prev_time"]
            dt          = max(now - prev_time, 0.01)
            state["trajectory"].append((center[0], center[1], now))
            movement = self._distance(prev_center, center)
            STATIONARY_THRESHOLD_PX = 5.0  
            if movement < STATIONARY_THRESHOLD_PX:
                if state["stationary_since"] is None:
                    state["stationary_since"] = now
                state["moving_frames"] = 0
            else:
                state["moving_frames"] = state.get("moving_frames", 0) + 1
                if state["moving_frames"] >= 3:
                    state["stationary_since"] = None
            for line in self._lines:
                rule      = line["rule"]
                line_name = line["name"]
                if prev_center == center:
                    continue
                approach_zone = line.get("approach_zone_y_px")
                if approach_zone:
                    az_top, az_bot = approach_zone
                    if az_top <= center[1] <= az_bot:
                        state["approach_seen"][line_name] = True
                crossed = self._segments_intersect(
                    prev_bottom, bottom, line["p1"], line["p2"]
                )
                if not crossed:
                    continue
                dir_cfg = line.get("direction", "any")
                dy = center[1] - prev_center[1]
                dir_ok = (
                    dir_cfg == "any"
                    or (dir_cfg == "down" and dy > 0)
                    or (dir_cfg == "up"   and dy < 0)
                )
                if not dir_ok:
                    continue
                if rule == "BEAT_RED_LIGHT":
                    # Normalize the traffic light state for comparison
                    tl_normalized = traffic_light_state.upper().replace("_", " ")
                    if tl_normalized != "RED LIGHT":
                        logger.debug(
                            f"[{self.camera_id}] BEAT_RED_LIGHT suppressed: "
                            f"light is '{traffic_light_state}' (not RED)"
                        )
                        continue
                    # approach_zone check is now OPTIONAL — only enforce if vehicle
                    # was seen approaching (prevents false positives on vehicles
                    # already past the line on first detection)
                    if approach_zone and not state["approach_seen"].get(line_name, False):
                        # Grant a one-time pass: mark as seen so next crossing works
                        state["approach_seen"][line_name] = True
                        # Still flag it — vehicle crossed the line during red
                        logger.debug(
                            f"[{self.camera_id}] BEAT_RED_LIGHT: approach zone not seen "
                            f"for track {tid} — flagging anyway (vehicle may have entered mid-scene)"
                        )
                    state["approach_seen"][line_name] = False
                # For red-light violations, capture the traffic light bbox too
                tl_bbox = self._find_best_tl_bbox(detections) if rule == "BEAT_RED_LIGHT" else None
                v = self._make_violation(
                    tid, vtype, conf, rule,
                    f"Crossed {line_name}" + (" while light is RED" if rule == "BEAT_RED_LIGHT" else ""),
                    state, now, frame, bbox, tl_bbox=tl_bbox
                )
                if v:
                    violations_found.append(v)
            for zone in self._zones:
                zone_name    = zone["name"]
                rule         = zone["rule"]
                dwell_thresh = zone.get("dwell_seconds", 5.0)
                inside       = self._point_in_polygon(
                    (float(bottom[0]), float(bottom[1])), zone["pts"]
                )
                if inside:
                    if zone_name not in state["zone_entry"]:
                        state["zone_entry"][zone_name] = now
                    dwell = now - state["zone_entry"][zone_name]
                    if dwell >= dwell_thresh:
                        if rule == "ILLEGAL_PARKING" or rule == "OBSTRUCTION":
                            if rule == "OBSTRUCTION" and traffic_light_state == "RED LIGHT":
                                continue
                            if state["stationary_since"] is None:
                                continue  
                            stationary_duration = now - state["stationary_since"]
                            if stationary_duration < dwell_thresh * 0.5:
                                continue  
                        v = self._make_violation(
                            tid, vtype, conf, rule,
                            f"Stopped in {zone_name} for {dwell:.0f}s",
                            state, now, frame, bbox
                        )
                        if v:
                            violations_found.append(v)
                else:
                    state["zone_entry"].pop(zone_name, None)
            if self._sw_cfg.get("enabled", True):
                swerving_v = self._check_swerving(tid, state, vtype, conf, frame, bbox, now)
                if swerving_v:
                    violations_found.append(swerving_v)
            speed_cfg = self._speed_cfg
            if speed_cfg.get("enabled") and len(state["trajectory"]) >= 5:
                first_pt = state["trajectory"][0]
                last_pt = state["trajectory"][-1]
                time_diff = last_pt[2] - first_pt[2]
                if time_diff > 0:
                    dx = last_pt[0] - first_pt[0]
                    dy = last_pt[1] - first_pt[1]
                    pixels = math.sqrt(dx * dx + dy * dy)
                    ppm    = speed_cfg.get("pixels_per_meter", 8.0)
                    mps    = (pixels / ppm) / time_diff
                    kmh    = mps * 3.6
                    thresh = speed_cfg.get("threshold_kmh", 60.0)
                    if kmh > thresh:
                        calibration_note = "" if speed_cfg.get("is_calibrated") else " ⚠️ uncalibrated"
                        v = self._make_violation(
                            tid, vtype, conf, "OVERSPEEDING",
                            f"Est. {kmh:.0f} km/h (limit {thresh:.0f} km/h){calibration_note}",
                            state, now, frame, bbox
                        )
                        if v:
                            violations_found.append(v)

            # UNIVERSAL RED LIGHT BEATING (Works without hardcoded lines)
            # Triggers if a vehicle continues moving significantly while light is RED
            tl_normalized = traffic_light_state.upper().replace("_", " ")
            if tl_normalized == "RED LIGHT":
                if state.get("moving_frames", 0) >= 8 and len(state["trajectory"]) >= 5:
                    # Compare current position to oldest tracked position
                    oldest = state["trajectory"][0]
                    dx = center[0] - oldest[0]
                    dy = center[1] - oldest[1]
                    total_dist = math.sqrt(dx*dx + dy*dy)
                    # Must have moved at least 20px total (ignores stationary vehicles)
                    if total_dist > 20:
                        tl_bbox = self._find_best_tl_bbox(detections)
                        v = self._make_violation(
                            tid, vtype, conf, "BEAT_RED_LIGHT",
                            f"Vehicle detected moving through intersection during RED light",
                            state, now, frame, bbox, tl_bbox=tl_bbox
                        )
                        if v:
                            violations_found.append(v)

            state["prev_center"] = center
            state["prev_bottom"] = bottom
            state["prev_time"]   = now
        active_ids = {d.get("track_id") for d in detections}
        stale = [tid for tid in self._track_state if tid not in active_ids]
        for tid in stale:
            del self._track_state[tid]
        return violations_found
    def _check_swerving(
        self, tid: int, state: dict, vtype: str, conf: float,
        frame: np.ndarray, bbox: list, now: float
    ) -> Optional[dict]:
        trajectory = state["trajectory"]
        sw_cfg     = self._sw_cfg
        min_frames  = sw_cfg.get("trajectory_frames", 8)
        min_lateral = sw_cfg.get("min_lateral_px", 30.0)
        min_changes = sw_cfg.get("min_direction_changes", 2)
        if len(trajectory) < min_frames:
            return None  
        positions = [(p[0], p[1]) for p in trajectory]
        x_displacements = [
            positions[i + 1][0] - positions[i][0]
            for i in range(len(positions) - 1)
        ]
        if not x_displacements:
            return None
        x_values    = [p[0] for p in positions]
        total_swing = max(x_values) - min(x_values)
        if total_swing < min_lateral:
            return None  
        y_values = [p[1] for p in positions]
        total_forward = abs(y_values[-1] - y_values[0])
        min_forward_px = sw_cfg.get("min_forward_px", 50.0)
        if total_forward < min_forward_px:
            return None  
        direction_changes = 0
        for i in range(1, len(x_displacements)):
            if x_displacements[i] != 0 and x_displacements[i - 1] != 0:
                if (x_displacements[i] > 0) != (x_displacements[i - 1] > 0):
                    direction_changes += 1
        if direction_changes < min_changes:
            return None  
        swerving_cooldown = sw_cfg.get("cooldown_s", 20.0)
        fired = state.get("fired", {})
        last_swerving = fired.get("SWERVING", 0)
        if now - last_swerving < swerving_cooldown:
            return None
        return self._make_violation(
            tid, vtype, conf, "SWERVING",
            f"Abrupt lateral movement: {total_swing:.0f}px swing, {direction_changes} direction changes",
            state, now, frame, bbox
        )
    def _make_violation(
        self, track_id, vehicle_type, confidence, rule,
        reason, state, now, frame, bbox,
        tl_bbox: Optional[list] = None
    ) -> Optional[dict]:
        if confidence < self.MIN_DETECTION_CONF:
            logger.warning(f"[{self.camera_id}] Suppressed {rule} for track {track_id}: Confidence {confidence:.2f} < {self.MIN_DETECTION_CONF}")
            return None
        fired = state.get("fired", {})
        last  = fired.get(rule, 0)
        if now - last < self.COOLDOWN_BETWEEN_SAME:
            logger.warning(f"[{self.camera_id}] Suppressed {rule} for track {track_id}: Cooldown active ({(now - last):.1f}s < {self.COOLDOWN_BETWEEN_SAME}s)")
            return None

        H_frame, W_frame = frame.shape[:2]
        ts_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # ------------------------------------------------------------------
        # Build evidence frame
        # For BEAT_RED_LIGHT: composite image showing traffic light + vehicle
        # For other violations: padded crop of the vehicle only
        # ------------------------------------------------------------------
        evidence_b64 = None
        try:
            if rule == "BEAT_RED_LIGHT" and tl_bbox is not None:
                evidence_b64 = self._build_redlight_evidence(
                    frame, bbox, tl_bbox, track_id, vehicle_type, ts_str
                )
            else:
                x1, y1, x2, y2 = bbox
                pad_x = int((x2 - x1) * 0.25)
                pad_y = int((y2 - y1) * 0.25)
                x1c   = max(0, x1 - pad_x)
                y1c   = max(0, y1 - pad_y)
                x2c   = min(W_frame, x2 + pad_x)
                y2c   = min(H_frame, y2 + pad_y)
                crop  = frame[y1c:y2c, x1c:x2c].copy()
                # Draw vehicle box (in crop-local coords)
                cv2.rectangle(crop,
                              (pad_x, pad_y),
                              (x2c - x1c - pad_x, y2c - y1c - pad_y),
                              (0, 0, 255), 2)
                cv2.putText(crop, rule, (6, 22),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 255), 2)
                cv2.putText(crop, ts_str, (6, crop.shape[0] - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
                _, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
                evidence_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()
        except Exception as e:
            logger.debug(f"Evidence capture error: {e}")

        plate_text = None
        ocr_confidence = 0.0
        if OCR_ENABLED and plate_ocr.enabled:
            try:
                plate_text, ocr_confidence = plate_ocr.extract(frame, bbox)
            except Exception as e:
                logger.debug(f"Plate OCR failed for track {track_id}: {e}")
        violation = {
            "camera_id":           self.camera_id,
            "track_id":            track_id,
            "rule_triggered":      rule,
            "ai_confidence":       round(min(confidence, 0.99), 2),
            "location":            None,
            "plate_number":        plate_text,
            "ocr_confidence":      round(ocr_confidence, 3) if ocr_confidence else None,
            "vehicle_type":        vehicle_type,
            "violation_reason":    reason,
            "verification_status": "AI_SUGGESTED",
            "evidence_frame":      evidence_b64,
        }
        fired[rule]            = now
        state["fired"]         = fired
        self._last_upload_time = now
        logger.info(
            f"🚨 [{self.camera_id}] Violation: {rule} | "
            f"Track {track_id} ({vehicle_type}) | {reason} | "
            f"Plate: {plate_text or 'unknown'}"
        )
        return violation

    def _build_redlight_evidence(
        self, frame: np.ndarray, veh_bbox: list, tl_bbox: list,
        track_id, vehicle_type: str, ts_str: str
    ) -> Optional[str]:
        """
        Build a composite evidence image for a red-light violation.

        Layout:
          ┌─────────────────────────────────────────┐
          │         BEAT RED LIGHT  – <timestamp>   │  (header bar)
          ├──────────────────┬──────────────────────┤
          │   Traffic Light  │   Violating Vehicle  │  (panels)
          │   [red box]      │   [red box + label]  │
          └──────────────────┴──────────────────────┘

        If both detections are close enough, a single wide-angle scene crop
        is used instead of two separate panels.
        """
        try:
            H_frame, W_frame = frame.shape[:2]
            PANEL_H = 320
            PANEL_W = 400
            HEADER_H = 36
            BORDER = 3

            def padded_crop(bbox, pad_frac=0.35):
                x1, y1, x2, y2 = bbox
                pw = int((x2 - x1) * pad_frac)
                ph = int((y2 - y1) * pad_frac)
                cx1 = max(0, x1 - pw)
                cy1 = max(0, y1 - ph)
                cx2 = min(W_frame, x2 + pw)
                cy2 = min(H_frame, y2 + ph)
                return frame[cy1:cy2, cx1:cx2].copy(), (cx1, cy1, cx2, cy2)

            def draw_box_on_crop(crop, orig_bbox, crop_origin, color, label):
                ox, oy = crop_origin
                x1, y1, x2, y2 = orig_bbox
                lx1, ly1 = x1 - ox, y1 - oy
                lx2, ly2 = x2 - ox, y2 - oy
                cv2.rectangle(crop, (lx1, ly1), (lx2, ly2), color, 2)
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
                cv2.rectangle(crop, (lx1, ly1 - th - 6), (lx1 + tw + 6, ly1), color, -1)
                cv2.putText(crop, label, (lx1 + 3, ly1 - 4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            # ---- Check if bboxes are close enough for a single scene crop ----
            vx1, vy1, vx2, vy2 = veh_bbox
            tx1, ty1, tx2, ty2 = tl_bbox
            # Union bbox with generous padding
            margin = 60
            ux1 = max(0,        min(vx1, tx1) - margin)
            uy1 = max(0,        min(vy1, ty1) - margin)
            ux2 = min(W_frame,  max(vx2, tx2) + margin)
            uy2 = min(H_frame,  max(vy2, ty2) + margin)
            union_area   = (ux2 - ux1) * (uy2 - uy1)
            frame_area   = W_frame * H_frame
            use_single   = union_area < (frame_area * 0.55)  # single crop if ≤55% of frame

            if use_single:
                scene = frame[uy1:uy2, ux1:ux2].copy()
                origin = (ux1, uy1)
                # Draw traffic light box – orange
                draw_box_on_crop(scene, tl_bbox, origin, (0, 100, 255), "RED LIGHT")
                # Draw vehicle box – red
                draw_box_on_crop(scene, veh_bbox, origin, (0, 0, 255),
                                 f"{vehicle_type.upper()} #{track_id} VIOLATOR")
                # Resize to fixed width
                tgt_w = PANEL_W * 2
                scale = tgt_w / scene.shape[1]
                scene = cv2.resize(scene, (tgt_w, max(1, int(scene.shape[0] * scale))))
                canvas = scene
            else:
                # ---- Two-panel layout ----
                tl_crop,  (tcx1, tcy1, _, _) = padded_crop(tl_bbox,  pad_frac=0.5)
                veh_crop, (vcx1, vcy1, _, _) = padded_crop(veh_bbox, pad_frac=0.35)

                draw_box_on_crop(tl_crop,  tl_bbox,  (tcx1, tcy1), (0, 100, 255), "RED LIGHT")
                draw_box_on_crop(veh_crop, veh_bbox, (vcx1, vcy1), (0, 0,   255),
                                 f"{vehicle_type.upper()} #{track_id}")

                # Resize both panels to same height
                tl_resized  = cv2.resize(tl_crop,  (PANEL_W, PANEL_H))
                veh_resized = cv2.resize(veh_crop, (PANEL_W, PANEL_H))

                # Divider line between panels
                divider = np.zeros((PANEL_H, BORDER, 3), dtype=np.uint8)
                divider[:] = (80, 80, 80)
                canvas = np.hstack([tl_resized, divider, veh_resized])

            # ---- Header bar ----
            total_w = canvas.shape[1]
            header = np.zeros((HEADER_H, total_w, 3), dtype=np.uint8)
            header[:] = (30, 30, 30)  # dark background
            # Red accent bar on left
            cv2.rectangle(header, (0, 0), (6, HEADER_H), (0, 0, 220), -1)
            header_text = f"BEAT RED LIGHT  |  {ts_str}"
            cv2.putText(header, header_text, (14, HEADER_H - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1)

            # Panel labels (only for two-panel mode)
            if not use_single:
                label_bar = np.zeros((24, total_w, 3), dtype=np.uint8)
                label_bar[:] = (50, 50, 50)
                cv2.putText(label_bar, "TRAFFIC LIGHT", (10, 17),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 180, 255), 1)
                cv2.putText(label_bar, "VIOLATING VEHICLE", (PANEL_W + BORDER + 10, 17),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (80, 80, 255), 1)
                canvas = np.vstack([label_bar, canvas])

            # Timestamp footer
            footer = np.zeros((22, total_w, 3), dtype=np.uint8)
            footer[:] = (20, 20, 20)
            cv2.putText(footer, f"CAM: {self.camera_id}  |  Track #{track_id}  |  AI Evidence",
                        (8, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (160, 160, 160), 1)

            composite = np.vstack([header, canvas, footer])
            _, buf = cv2.imencode(".jpg", composite, [cv2.IMWRITE_JPEG_QUALITY, 88])
            return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()
        except Exception as e:
            logger.debug(f"_build_redlight_evidence error: {e}")
            return None
    def annotate_frame(self, frame: np.ndarray, detections: list[dict], violations: list[dict], tl_state: str) -> np.ndarray:
        overlay = frame.copy()
        violator_tids = {v.get("track_id") for v in violations}
        for det in detections:
            tid = det.get("track_id")
            x1, y1, x2, y2 = det["bbox"]
            vtype           = det["vehicle_type"].upper()
            conf_str        = f"{det.get('confidence', 0):.2f}"
            is_violator     = tid in violator_tids
            color  = (0, 0, 255) if is_violator else (0, 255, 0)
            if not tid and vtype in ["RED_LIGHT", "GREEN_LIGHT", "YELLOW_LIGHT"]:
                color = (0, 165, 255) if vtype == "YELLOW_LIGHT" else ((0, 0, 255) if vtype == "RED_LIGHT" else (0, 255, 0))
            label  = f"{vtype} #{tid}" if tid else f"{vtype}"
            label += f" {conf_str}"
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(overlay, (x1, y1 - 18), (x1 + w + 4, y1), color, -1)
            cv2.putText(overlay, label, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            if is_violator:
                cv2.putText(overlay, "VIOLATION", (x1, y2 + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255), 2)
        model_label = f"{'PH Model' if IS_CUSTOM_PH_MODEL else 'COCO Pretrained'} | conf {YOLO_CONFIDENCE}"
        cv2.putText(overlay, model_label, (10, self.H - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1)
        return overlay
class CameraSession:
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
        self.recent_violations: list[dict] = []
        self.traffic_light_state = "UNKNOWN"
        self.tl_state_history: list[str] = []
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
def upload_violation_to_supabase(violation: dict, session: CameraSession):
    if not supabase_client:
        return
    evidence_url = None
    if violation.get("evidence_frame"):
        try:
            b64_data    = violation["evidence_frame"].split(",")[1]
            image_bytes = base64.b64decode(b64_data)
            filename    = f"ai_evidence_{int(time.time())}_{violation['camera_id']}.jpg"
            supabase_client.storage.from_("evidence").upload(
                path=filename,
                file=image_bytes,
                file_options={"content-type": "image/jpeg"}
            )
            evidence_url = supabase_client.storage.from_("evidence").get_public_url(filename)
        except Exception as e:
            logger.error(f"Failed to upload evidence image: {e}")
    db_row = {
        "camera_id":           violation["camera_id"],
        "rule_triggered":      violation["rule_triggered"],
        "ai_confidence":       violation["ai_confidence"],
        "location":            violation["location"],
        "plate_number":        violation.get("plate_number") or "UNKNOWN",
        "verification_status": "AI_SUGGESTED",
        "evidence_image_url":  evidence_url,
        "vehicle_type":        violation.get("vehicle_type"),
        "track_id":            violation.get("track_id"),
        "ocr_confidence":      violation.get("ocr_confidence"),
        "violation_reason":    violation.get("violation_reason"),
    }
    try:
        supabase_client.table("ai_violation_candidates").insert(db_row).execute()
        logger.info(f"✅ Uploaded violation to Supabase: {violation['rule_triggered']}")
    except Exception as e:
        logger.error(f"Supabase upload error: {e}")
def camera_loop(session: CameraSession):
    cam    = CAMERAS[session.camera_id]
    s_type = StreamType(cam["stream_type"])
    stream_url = cam["stream_url"]

    # Resolve YouTube live stream to a direct HLS URL
    if s_type == StreamType.YOUTUBE:
        logger.info(f"[{session.camera_id}] Resolving YouTube stream: {stream_url}")
        resolved = resolve_youtube_stream(stream_url)
        if not resolved:
            logger.error(f"[{session.camera_id}] Failed to resolve YouTube URL. Aborting.")
            CAMERAS[session.camera_id]["status"] = "OFFLINE"
            session.running = False
            return
        stream_url = resolved

    stream = StreamManager(s_type, stream_url, loop=(s_type == StreamType.FILE))
    if not stream.open():
        logger.error(f"[{session.camera_id}] Cannot open stream: {cam['stream_url']}")
        CAMERAS[session.camera_id]["status"] = "OFFLINE"
        session.running = False
        return
    CAMERAS[session.camera_id]["status"] = "ONLINE"
    session.counter.configure_frame_size(stream.width, stream.height)
    session.detector = ViolationDetector(session.camera_id, stream.width, stream.height)
    logger.info(f"[{session.camera_id}] ViolationDetector initialized ({stream.width}×{stream.height})")
    frame_interval  = 1.0 / YOLO_INFERENCE_FPS
    last_infer_time = 0.0
    loop = asyncio.new_event_loop()
    # Store reference to the main FastAPI event loop for broadcasting
    main_loop = getattr(session, '_main_loop', None)
    is_loop_restart = False
    logger.info(f"[{session.camera_id}] 🚀 Camera loop started.")
    while session.running:
        ret, frame = stream.read()
        if not ret:
            logger.info(f"[{session.camera_id}] Stream ended — restarting.")
            # For YouTube streams, re-resolve the URL since HLS manifests expire
            new_url = None
            if s_type == StreamType.YOUTUBE:
                logger.info(f"[{session.camera_id}] Re-resolving YouTube URL...")
                new_url = resolve_youtube_stream(cam["stream_url"])
                if not new_url:
                    logger.error(f"[{session.camera_id}] YouTube re-resolve failed. Stopping.")
                    break
            stream.restart(new_url=new_url)
            is_loop_restart = True
            time.sleep(0.1)
            continue
        if is_loop_restart:
            is_loop_restart = False
            session.detector = ViolationDetector(session.camera_id, stream.width, stream.height)
            session.active_vehicles = {}
        now = time.time()
        session.frame_count += 1
        if now - last_infer_time < frame_interval:
            _encode_frame(session, frame)
            continue
        last_infer_time = now
        t0 = time.perf_counter()
        results = model.track(
            frame,
            classes=VEHICLE_CLASSES if IS_COCO_MODEL else None,
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
        tl_state = _extract_traffic_light_state(detections, frame, session)
        violations = []
        if session.detector and detections:
            violations = session.detector.detect(detections, frame, tl_state)
            for v in violations:
                session.push_violation(v)
                t = threading.Thread(
                    target=upload_violation_to_supabase, args=(v, session), daemon=True
                )
                t.start()
        if session.detector:
            annotated = session.detector.annotate_frame(frame, detections, violations, tl_state)
        else:
            annotated = frame
        _encode_frame(session, annotated)
        recent_violations = session.pop_violations()
        payload = _build_ws_payload(session, detections, recent_violations)
        _broadcast(session, payload)
    stream.close()
    CAMERAS[session.camera_id]["status"] = "OFFLINE"
    session.running = False
    logger.info(f"[{session.camera_id}] Camera loop stopped.")
def _extract_traffic_light_state(detections: list[dict], frame: np.ndarray, session: CameraSession) -> str:
    """
    Determines traffic light state using a sliding-window majority vote.
    - Window size: 7 frames
    - A state is confirmed only if it appears >= 4 times in the window (majority)
    - Resets to UNKNOWN if no traffic light is detected in the last 3 frames
    """
    tl_candidate = "UNKNOWN"
    best_conf = 0.0
    # Normalize traffic-light class names regardless of model casing
    # RTL model outputs: 'red_light', 'green_light', 'yellow_light' (lowercase)
    # COCO model outputs: 'TRAFFIC LIGHT'
    TL_CLASS_MAP = {
        "red_light":    "RED LIGHT",
        "RED_LIGHT":    "RED LIGHT",
        "green_light":  "GREEN LIGHT",
        "GREEN_LIGHT":  "GREEN LIGHT",
        "yellow_light": "YELLOW LIGHT",
        "YELLOW_LIGHT": "YELLOW LIGHT",
    }
    for det in detections:
        vtype = det.get("vehicle_type", "")
        normalized = TL_CLASS_MAP.get(vtype)
        if normalized is None:
            # Try uppercase lookup too
            normalized = TL_CLASS_MAP.get(vtype.upper().replace(" ", "_"))
        if normalized:
            conf = det.get("confidence", 0.0)
            # Pick the highest-confidence traffic light detection in this frame
            if conf > best_conf:
                best_conf = conf
                tl_candidate = normalized
    logger.debug(f"[TL] Frame candidate: {tl_candidate} (conf={best_conf:.2f})")

    session.tl_state_history.append(tl_candidate)
    WINDOW_SIZE = 7
    if len(session.tl_state_history) > WINDOW_SIZE:
        session.tl_state_history.pop(0)

    # If the last 3 frames all have no light detected, reset immediately to UNKNOWN
    recent_3 = session.tl_state_history[-3:] if len(session.tl_state_history) >= 3 else session.tl_state_history
    if all(s == "UNKNOWN" for s in recent_3):
        session.traffic_light_state = "UNKNOWN"
        return "UNKNOWN"

    # Majority vote: a non-UNKNOWN state must appear >= 4 times in the window
    counts: dict[str, int] = {}
    for s in session.tl_state_history:
        counts[s] = counts.get(s, 0) + 1

    MAJORITY_THRESHOLD = 4
    tl_state = session.traffic_light_state
    for s, count in counts.items():
        if s != "UNKNOWN" and count >= MAJORITY_THRESHOLD:
            tl_state = s
            break

    session.traffic_light_state = tl_state
    return tl_state
def _parse_detections(results) -> list[dict]:
    dets = []
    if not results:
        return dets
    res = results[0] if isinstance(results, list) else results
    if not hasattr(res, "boxes") or res.boxes is None:
        return dets
    model_names = getattr(model, "names", {})
    boxes = res.boxes
    for box in boxes:
        try:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf  = float(box.conf[0])
            cls   = int(box.cls[0])
            tid   = int(box.id[0]) if box.id is not None else None
            if IS_CUSTOM_PH_MODEL and cls in PH_CLASS_NAMES:
                vtype = PH_CLASS_NAMES[cls]
            elif cls in model_names:
                vtype = model_names[cls].upper()
            else:
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
        "type":              "statistics",
        "camera_id":         session.camera_id,
        "active_vehicles":   len(session.active_vehicles),
        "inference_fps":     round(session.inference_fps, 1),
        "traffic_light_state": session.traffic_light_state,
        "detections":        detections,
        "counts":            counts,
        "violations":        violations,
        "timestamp":         datetime.utcnow().isoformat(),
        "model_info": {
            "path":         ACTIVE_MODEL_PATH,
            "type":         "Custom PH Traffic" if IS_CUSTOM_PH_MODEL else "Pretrained COCO",
            "confidence":   YOLO_CONFIDENCE,
            "imgsz":        YOLO_IMG_SIZE,
            "ocr_enabled":  OCR_ENABLED,
        },
    }
def _broadcast(session: CameraSession, payload: dict):
    """Send payload to all connected WebSocket clients using the main event loop."""
    msg = json.dumps(payload)
    clients = session.get_ws_clients()
    if not clients:
        return
    async def _send_all():
        dead = []
        for ws in clients:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            session.remove_ws_client(ws)
    main_loop = getattr(app.state, 'event_loop', None)
    if main_loop and main_loop.is_running():
        asyncio.run_coroutine_threadsafe(_send_all(), main_loop)
    else:
        # Fallback: try with a fresh loop (less reliable but prevents crash)
        try:
            asyncio.run(_send_all())
        except Exception:
            pass
@app.get("/")
def health():
    return {
        "status":       "ok",
        "service":      "GOVCHECK AI Service",
        "version":      "4.0.0",
        "model": {
            "path":     ACTIVE_MODEL_PATH,
            "type":     "Custom PH Traffic" if IS_CUSTOM_PH_MODEL else "Pretrained COCO (yolov8s)",
            "classes":  list(PH_CLASS_NAMES.values()) if IS_CUSTOM_PH_MODEL else list(CLASS_NAMES.values()),
        },
        "settings": {
            "confidence": YOLO_CONFIDENCE,
            "imgsz":      YOLO_IMG_SIZE,
            "fps":        YOLO_INFERENCE_FPS,
            "ocr":        OCR_ENABLED,
        },
        "timestamp":    datetime.utcnow().isoformat(),
    }
@app.get("/health")
def health_check():
    return {
        "status":     "ok",
        "service":    "GOVCHECK AI Service",
        "version":    "4.0.0",
        "model":      Path(ACTIVE_MODEL_PATH).name,
        "model_type": "Custom PH Traffic" if IS_CUSTOM_PH_MODEL else "Pretrained COCO (yolov8s)",
        "confidence": YOLO_CONFIDENCE,
        "imgsz":      YOLO_IMG_SIZE,
        "timestamp":  datetime.utcnow().isoformat() + "Z",
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
@app.get("/api/videos")
def list_videos():
    video_dir = Path(__file__).parent / "test-videos"
    upload_dir = Path(__file__).parent / "test-videos" / "uploads"
    videos = []
    for d in [video_dir, upload_dir]:
        if d.exists():
            for f in sorted(d.iterdir()):
                if f.suffix.lower() in (".mp4", ".avi", ".mov", ".mkv", ".webm") and f.is_file():
                    size_mb = round(f.stat().st_size / (1024 * 1024), 1)
                    videos.append({
                        "filename": f.name,
                        "path":     str(f.resolve()),
                        "folder":   "uploads" if d == upload_dir else "test-videos",
                        "size_mb":  size_mb,
                    })
    return {"videos": videos}
class StreamTestRequest(BaseModel):
    stream_type: str
    stream_url: str
@app.post("/api/cameras/test-stream")
def test_stream(req: StreamTestRequest):
    logger.info(f"Testing stream: {req.stream_type} @ {req.stream_url}")
    result = validate_stream(req.stream_type, req.stream_url)
    return result
class StreamAddRequest(BaseModel):
    camera_id:   str
    name:        str
    location:    str
    stream_type: str
    stream_url:  str
@app.post("/api/cameras/add-stream")
def add_stream(req: StreamAddRequest):
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
    if supabase_client:
        try:
            supabase_client.table("camera_configs").insert({
                "camera_id":       req.camera_id,
                "camera_name":     req.name,
                "camera_location": req.location,
                "violation_lines": DEFAULT_VIOLATION_CONFIG.get("lines", []),
                "violation_zones": DEFAULT_VIOLATION_CONFIG.get("zones", []),
                "speed_config":    DEFAULT_VIOLATION_CONFIG.get("speed", {}),
            }).execute()
        except Exception as e:
            logger.warning(f"Could not init DB config for {req.camera_id}: {e}")
    return {"status": "added", "camera": CAMERAS[req.camera_id]}

class YouTubeStreamRequest(BaseModel):
    camera_id: str
    name:      str
    location:  str
    yt_url:    str  # e.g. https://www.youtube.com/watch?v=XXXX

@app.post("/api/cameras/add-youtube")
def add_youtube_stream(req: YouTubeStreamRequest):
    """Register a YouTube live stream URL as a camera source.
    The backend will auto-resolve the HLS URL using yt-dlp each time the camera starts."""
    if req.camera_id in CAMERAS:
        return JSONResponse({"error": "Camera ID already exists"}, status_code=400)
    CAMERAS[req.camera_id] = {
        "id":          req.camera_id,
        "name":        req.name,
        "location":    req.location,
        "stream_type": "youtube",
        "stream_url":  req.yt_url,
        "enabled":     True,
        "status":      "OFFLINE",
    }
    CAMERA_VIOLATION_CONFIGS[req.camera_id] = DEFAULT_VIOLATION_CONFIG
    logger.info(f"[{req.camera_id}] YouTube stream registered: {req.yt_url}")
    return {"status": "added", "camera": CAMERAS[req.camera_id]}

class StreamSetSourceRequest(BaseModel):
    stream_type: str
    stream_url:  str
@app.post("/api/cameras/{camera_id}/set-source")
def set_camera_source(camera_id: str, req: StreamSetSourceRequest):
    if camera_id not in CAMERAS:
        return JSONResponse({"error": "Camera not found"}, status_code=404)
    session = SESSIONS.get(camera_id)
    if session and session.running:
        session.running = False
        time.sleep(0.5)
    CAMERAS[camera_id]["stream_type"] = req.stream_type
    CAMERAS[camera_id]["stream_url"]  = req.stream_url
    return {"status": "source_updated", "camera_id": camera_id, "type": req.stream_type}
class WebcamFrameRequest(BaseModel):
    frame_b64: str  
@app.post("/api/cameras/webcam/frame")
async def process_webcam_frame(req: WebcamFrameRequest):
    try:
        header, encoded = req.frame_b64.split(",", 1)
        data    = base64.b64decode(encoded)
        np_arr  = np.frombuffer(data, np.uint8)
        frame   = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return JSONResponse({"error": "Invalid image data"}, status_code=400)
        results = model.track(
            frame,
            classes=VEHICLE_CLASSES if not IS_CUSTOM_PH_MODEL else None,
            conf=YOLO_CONFIDENCE,
            imgsz=YOLO_IMG_SIZE,
            device=device,
            persist=True,
            verbose=False,
            tracker="bytetrack.yaml"
        )
        detections = _parse_detections(results)
        return {
            "success":       True,
            "detections":    detections,
            "vehicle_count": len(detections),
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
@app.post("/api/cameras/{camera_id}/upload_video")
async def upload_video(camera_id: str, file: UploadFile = File(...)):
    if camera_id not in CAMERAS:
        return JSONResponse({"error": "Camera not found"}, status_code=404)
    ext = Path(file.filename).suffix.lower()
    if ext not in [".mp4", ".avi", ".mov", ".mkv", ".webm"]:
        return JSONResponse({"error": "Unsupported video format"}, status_code=400)
    dest = VIDEO_UPLOAD_DIR / f"{camera_id}_uploaded{ext}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    size_mb = dest.stat().st_size / (1024 * 1024)
    logger.info(f"📤 Video uploaded for {camera_id}: {dest} ({size_mb:.1f} MB)")
    session = SESSIONS.get(camera_id)
    if session and session.running:
        session.running = False
        time.sleep(0.5)
    CAMERAS[camera_id]["stream_type"] = "file"
    CAMERAS[camera_id]["stream_url"]  = str(dest)
    return {
        "status":     "uploaded",
        "camera_id":  camera_id,
        "file":       file.filename,
        "size_mb":    round(size_mb, 2),
        "stream_url": str(dest),
        "message":    "Video uploaded. Click 'Start AI' to begin processing.",
    }
@app.get("/api/cameras/{camera_id}/violation_config")
def get_violation_config(camera_id: str):
    if supabase_client:
        try:
            res = supabase_client.table("camera_configs").select("*").eq("camera_id", camera_id).execute()
            if res.data:
                row    = res.data[0]
                config = {
                    "lines":   row.get("violation_lines", []),
                    "zones":   row.get("violation_zones", []),
                    "speed":   row.get("speed_config", {}),
                    "tl_roi":  row.get("tl_roi", {}),
                }
                CAMERA_VIOLATION_CONFIGS[camera_id] = config
                return config
        except Exception as e:
            logger.error(f"Error reading config from DB: {e}")
    return CAMERA_VIOLATION_CONFIGS.get(camera_id, DEFAULT_VIOLATION_CONFIG)
class ViolationLineConfig(BaseModel):
    name: str
    p1: list[float]
    p2: list[float]
    rule: str
    direction: str = "any"
    approach_zone_y: list[float] | None = None
    approach_zone_y_px: list[float] | None = None
class ViolationZoneConfig(BaseModel):
    name: str
    points: list[list[float]]
    rule: str
    dwell_seconds: float = 5.0
class SpeedConfig(BaseModel):
    enabled: bool = True
    pixels_per_meter: float = 8.0
    threshold_kmh: float = 60.0
    is_calibrated: bool = False
class SwervingConfig(BaseModel):
    enabled: bool = True
    min_lateral_px: float = 30.0
    trajectory_frames: int = 8
    min_direction_changes: int = 2
    cooldown_s: float = 20.0
    min_forward_px: float = 50.0
class ViolationConfigPayload(BaseModel):
    lines: list[ViolationLineConfig] = []
    zones: list[ViolationZoneConfig] = []
    speed: SpeedConfig = SpeedConfig()
    swerving: SwervingConfig = SwervingConfig()
    tl_roi: dict = {}
@app.post("/api/cameras/{camera_id}/violation_config")
async def set_violation_config(camera_id: str, config: ViolationConfigPayload):
    config_dict = config.dict(exclude_none=True)
    CAMERA_VIOLATION_CONFIGS[camera_id] = config_dict
    if supabase_client:
        try:
            supabase_client.table("camera_configs").upsert({
                "camera_id":       camera_id,
                "violation_lines": config_dict.get("lines", []),
                "violation_zones": config_dict.get("zones", []),
                "speed_config":    config_dict.get("speed", {}),
                "tl_roi":          config_dict.get("tl_roi", {}),
                "updated_at":      datetime.utcnow().isoformat(),
            }, on_conflict="camera_id").execute()
        except Exception as e:
            logger.error(f"Error writing config to DB: {e}")
    session = SESSIONS.get(camera_id)
    if session and session.running and hasattr(session, "detector") and session.detector:
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
@app.post("/analyze-video")
async def analyze_video(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".mp4", ".avi", ".mov", ".mkv", ".webm"]:
        return JSONResponse(
            {"error": f"Unsupported format: {ext}. Use .mp4, .avi, .mov, .mkv, or .webm"},
            status_code=400
        )
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
    fps          = cap.get(cv2.CAP_PROP_FPS) or 25
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration     = round(total_frames / fps, 1) if fps > 0 else 0
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    detections:      list[dict] = []
    saved_violations: list[dict] = []
    seen_dedup:       set[str]  = set()
    counter  = VehicleCounter(line_position=0.6, axis="y")
    detector = ViolationDetector("analyze_upload", W, H)
    frame_idx    = 0
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
            results = model.track(
                frame,
                classes=VEHICLE_CLASSES if not IS_CUSTOM_PH_MODEL else None,
                conf=YOLO_CONFIDENCE,
                imgsz=YOLO_IMG_SIZE,
                persist=True,
                verbose=False,
                device=device_arg
            )
            if not results or results[0].boxes is None:
                continue
            r          = results[0]
            model_names = getattr(model, "names", {})
            boxes_xyxy = r.boxes.xyxy.cpu().numpy() if r.boxes.xyxy is not None else []
            confs      = r.boxes.conf.cpu().numpy() if r.boxes.conf is not None else []
            class_ids  = r.boxes.cls.cpu().numpy().astype(int) if r.boxes.cls is not None else []
            for i, box in enumerate(boxes_xyxy):
                if i >= len(confs) or i >= len(class_ids):
                    break
                cls        = int(class_ids[i])
                class_name = model_names.get(cls, "unknown")
                detections.append({
                    "frame":       frame_idx,
                    "class":       class_name,
                    "confidence":  round(float(confs[i]), 3),
                    "timestamp_s": round(frame_idx / fps, 2),
                })
            parsed_dets       = _parse_detections(r)
            violations_found  = detector.detect(parsed_dets, frame)
            for v in violations_found:
                bucket_s = int((frame_idx / fps) / 5)
                key      = f"{v['rule_triggered']}_{bucket_s}"
                if key in seen_dedup:
                    continue
                seen_dedup.add(key)
                _, jpg_buf  = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                b64_img     = "data:image/jpeg;base64," + base64.b64encode(jpg_buf.tobytes()).decode()
                evidence_url = None
                if supabase_client:
                    try:
                        fname = f"ai_evidence_{int(time.time())}_{frame_idx}.jpg"
                        supabase_client.storage.from_("evidence").upload(
                            path=fname,
                            file=jpg_buf.tobytes(),
                            file_options={"content-type": "image/jpeg"}
                        )
                        evidence_url = supabase_client.storage.from_("evidence").get_public_url(fname)
                    except Exception as e:
                        logger.warning(f"Evidence upload failed: {e}")
                db_row = {
                    "camera_id":           "video_upload",
                    "rule_triggered":      v["rule_triggered"],
                    "ai_confidence":       round(float(v.get("ai_confidence", 0.85)), 2),
                    "location":            "Uploaded Video Analysis",
                    "plate_number":        v.get("plate_number") or "UNKNOWN",
                    "verification_status": "AI_SUGGESTED",
                    "evidence_image_url":  evidence_url,
                    "vehicle_type":        v.get("vehicle_type"),
                    "track_id":            v.get("track_id"),
                    "violation_reason":    v.get("violation_reason"),
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
    type_counts: dict[str, int] = {}
    for d in detections:
        type_counts[d["class"]] = type_counts.get(d["class"], 0) + 1
    return {
        "success": True,
        "model": {
            "path":      ACTIVE_MODEL_PATH,
            "type":      "Custom PH Traffic" if IS_CUSTOM_PH_MODEL else "Pretrained COCO (yolov8s)",
            "imgsz":     YOLO_IMG_SIZE,
            "confidence": YOLO_CONFIDENCE,
        },
        "video": {
            "filename":       file.filename,
            "duration_s":     duration,
            "total_frames":   total_frames,
            "frames_analyzed": frame_idx // sample_every,
        },
        "summary": {
            "vehicles_detected":    len(detections),
            "vehicle_types":        type_counts,
            "violations_detected":  len(saved_violations),
            "violations_saved_to_db": len(saved_violations),
        },
        "violations":        saved_violations,
        "detections_sample": detections[:50],
    }
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
@app.on_event("startup")
async def store_event_loop():
    """Store the main event loop reference so camera threads can broadcast to WS clients."""
    app.state.event_loop = asyncio.get_event_loop()
    logger.info("✅ Main event loop stored for WebSocket broadcasting.")

@app.websocket("/ws/camera/{camera_id}")
async def ws_camera(websocket: WebSocket, camera_id: str):
    await websocket.accept()
    logger.info(f"[WS] Client connected to {camera_id}")
    # Wait up to 10s for the session to exist (camera may be starting)
    session = None
    for _ in range(20):
        session = SESSIONS.get(camera_id)
        if session:
            break
        await asyncio.sleep(0.5)
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
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT") or os.environ.get("AI_SERVICE_PORT", "8001"))
    logger.info(f"🚀 Starting GOVCHECK AI Service v4.0 on http://0.0.0.0:{port}")
    logger.info(f"   Model:      {ACTIVE_MODEL_PATH}")
    logger.info(f"   Confidence: {YOLO_CONFIDENCE}")
    logger.info(f"   Image size: {YOLO_IMG_SIZE}")
    logger.info(f"   OCR:        {'Enabled' if OCR_ENABLED else 'Disabled (set OCR_ENABLED=true)'}")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
