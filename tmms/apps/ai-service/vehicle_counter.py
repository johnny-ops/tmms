"""
vehicle_counter.py
Counts vehicles crossing a configurable virtual line.
Prevents counting the same track_id more than once per direction.
"""
import logging

logger = logging.getLogger("vehicle_counter")


class VehicleCounter:
    """
    Virtual counting line positioned at `line_x` (vertical) or `line_y` (horizontal).
    Tracks vehicle centroids across frames to detect crossings.
    """

    def __init__(self, line_position: float = 0.5, axis: str = "x"):
        """
        line_position: fraction of frame width/height (0.0–1.0)
        axis: 'x' for vertical counting line, 'y' for horizontal
        """
        self.line_position = line_position
        self.axis = axis  # 'x' or 'y'

        # Per vehicle-type counts
        self.counts: dict[str, int] = {
            "car": 0, "motorcycle": 0, "bus": 0, "truck": 0,
            "jeepney": 0, "tricycle": 0, "uv_express": 0,
        }

        # Previous centroid positions: {track_id: float}
        self._prev_positions: dict[int, float] = {}
        # Track IDs already counted: {track_id}
        self._counted_ids: set[int] = set()

        self.total = 0

    def configure_frame_size(self, width: int, height: int):
        """Call once we know the frame dimensions."""
        if self.axis == "x":
            self.line_pixel = int(width * self.line_position)
        else:
            self.line_pixel = int(height * self.line_position)

    def update(self, detections: list[dict]) -> list[dict]:
        """
        detections: list of dicts with keys:
            track_id, vehicle_type, confidence, bbox=[x1,y1,x2,y2]
        Returns list of newly-counted events this frame.
        """
        new_crossings = []

        for det in detections:
            tid = det.get("track_id")
            if tid is None:
                continue

            x1, y1, x2, y2 = det["bbox"]
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            pos = cx if self.axis == "x" else cy

            # Record centroid
            prev_pos = self._prev_positions.get(tid)
            self._prev_positions[tid] = pos

            if prev_pos is None:
                continue  # First time seeing this track

            if tid in self._counted_ids:
                continue  # Already counted

            line = getattr(self, "line_pixel", None)
            if line is None:
                continue

            # Check if vehicle crossed the line (left→right or top→bottom)
            if prev_pos < line <= pos or prev_pos > line >= pos:
                vtype = det.get("vehicle_type", "car")
                if vtype in self.counts:
                    self.counts[vtype] += 1
                else:
                    self.counts[vtype] = 1
                self.total += 1
                self._counted_ids.add(tid)
                new_crossings.append({
                    "track_id": tid,
                    "vehicle_type": vtype,
                    "confidence": det.get("confidence", 0.0),
                })
                logger.info(f"[Counter] {vtype} #{tid} crossed line. Total: {self.total}")

        return new_crossings

    def reset(self):
        for k in self.counts:
            self.counts[k] = 0
        self.total = 0
        self._prev_positions.clear()
        self._counted_ids.clear()

    def snapshot(self) -> dict:
        return {
            "total": self.total,
            **self.counts,
        }
