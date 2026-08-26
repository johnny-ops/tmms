
import cv2
import time
import logging
from enum import Enum
from typing import Generator, Optional
logger = logging.getLogger("stream_manager")
class StreamType(str, Enum):
    FILE    = "file"
    RTSP    = "rtsp"
    HLS     = "hls"
    MJPEG   = "mjpeg"
    WEBCAM  = "webcam"
    YOUTUBE = "youtube"
class StreamManager:
    def __init__(self, stream_type: StreamType, stream_url: str, loop: bool = True,
                 webcam_index: int = 0):
        self.stream_type  = stream_type
        self.stream_url   = stream_url
        self.loop         = loop       
        self.webcam_index = webcam_index
        self._cap: Optional[cv2.VideoCapture] = None
        self.is_open      = False
    def _build_source(self):
        t = self.stream_type
        if t == StreamType.FILE:
            return self.stream_url
        if t == StreamType.RTSP:
            return self.stream_url
        if t == StreamType.HLS:
            return self.stream_url
        if t == StreamType.MJPEG:
            return self.stream_url
        if t == StreamType.YOUTUBE:
            # stream_url at this point is already a resolved HLS URL
            return self.stream_url
        if t == StreamType.WEBCAM:
            return self.webcam_index   
        raise ValueError(f"Unsupported stream type: {t}")
    def open(self) -> bool:
        source = self._build_source()
        if self.stream_type == StreamType.FILE:
            self._cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
        elif self.stream_type == StreamType.YOUTUBE:
            # YouTube-resolved HLS needs FFMPEG backend for reliable HLS reading
            self._cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
        elif self.stream_type == StreamType.WEBCAM:
            self._cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)  
            if not self._cap.isOpened():
                self._cap = cv2.VideoCapture(source)              
        else:
            self._cap = cv2.VideoCapture(source)
        if not self._cap.isOpened():
            logger.error(f"[StreamManager] Cannot open source: {source}")
            self.is_open = False
            return False
        self.is_open = True
        fps = self._cap.get(cv2.CAP_PROP_FPS) or 30
        w   = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h   = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        logger.info(f"[StreamManager] Opened {self.stream_type}:{source} @ {w}x{h} {fps:.0f}fps")
        return True
    def close(self):
        if self._cap and self._cap.isOpened():
            self._cap.release()
        self.is_open = False
    @property
    def fps(self) -> float:
        if self._cap:
            return self._cap.get(cv2.CAP_PROP_FPS) or 30.0
        return 30.0
    @property
    def width(self) -> int:
        return int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH)) if self._cap else 0
    @property
    def height(self) -> int:
        return int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) if self._cap else 0
    def read(self) -> tuple[bool, any]:
        if not self._cap or not self._cap.isOpened():
            return False, None
        ret, frame = self._cap.read()
        if not ret and self.stream_type == StreamType.FILE and self.loop:
            self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self._cap.read()
        return ret, frame
    def restart(self, new_url: str = None):
        if new_url:
            self.stream_url = new_url
        if self._cap and self.stream_type == StreamType.FILE:
            self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            logger.info("[StreamManager] File stream restarted from beginning.")
        else:
            self.close()
            self.open()
            logger.info("[StreamManager] Live stream reconnected.")
    def frames(self) -> Generator:
        if not self.is_open:
            if not self.open():
                return
        while True:
            ret, frame = self._cap.read()
            is_loop_restart = False
            if not ret:
                if self.stream_type == StreamType.FILE and self.loop:
                    self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = self._cap.read()
                    is_loop_restart = True
                    if not ret:
                        logger.warning("[StreamManager] Loop restart failed.")
                        break
                else:
                    logger.info("[StreamManager] Stream ended.")
                    break
            yield frame, is_loop_restart
def validate_stream(stream_type: str, stream_url: str) -> dict:
    import time as _time
    result = {
        "reachable": False,
        "stream_type": stream_type,
        "url": stream_url,
        "width": 0,
        "height": 0,
        "fps": 0.0,
        "frame_readable": False,
        "yolo_compatible": False,
        "error": None,
    }
    try:
        stype = StreamType(stream_type)
    except ValueError:
        result["error"] = f"Unknown stream type: {stream_type}"
        return result
    try:
        if stype == StreamType.WEBCAM:
            idx = int(stream_url) if stream_url.isdigit() else 0
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            if not cap.isOpened():
                cap = cv2.VideoCapture(idx)
        elif stype == StreamType.FILE:
            cap = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)
        else:
            cap = cv2.VideoCapture(stream_url)
        if not cap.isOpened():
            result["error"] = "Cannot open stream (connection refused or URL unreachable)"
            cap.release()
            return result
        result["reachable"] = True
        result["width"]  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        result["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        result["fps"]    = round(cap.get(cv2.CAP_PROP_FPS) or 0.0, 1)
        ret, frame = cap.read()
        if ret and frame is not None:
            result["frame_readable"] = True
            if result["width"] == 0:
                result["height"], result["width"] = frame.shape[:2]
            result["yolo_compatible"] = (
                result["width"] > 0 and result["height"] > 0 and frame.ndim == 3
            )
        else:
            result["error"] = "Stream opened but no frame could be read"
        cap.release()
    except Exception as e:
        result["error"] = str(e)
    return result
