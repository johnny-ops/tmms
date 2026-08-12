"""
Generate a synthetic traffic test video for YOLO development testing.
This creates a simple road scene with moving colored rectangles
representing vehicles crossing a counting line.
Run: python generate_test_video.py
"""
import cv2
import numpy as np
import os
import random

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "traffic.mp4")
WIDTH, HEIGHT, FPS, DURATION = 1280, 720, 30, 30  # 30-second video

# Colours representing different vehicle types
VEHICLE_COLOURS = {
    "car":        (60,  120, 200),
    "motorcycle": (200, 80,  60),
    "bus":        (40,  160, 80),
    "truck":      (160, 80,  160),
}

VEHICLE_SIZES = {
    "car":        (80,  48),
    "motorcycle": (40,  30),
    "bus":        (140, 70),
    "truck":      (120, 60),
}


class SimVehicle:
    def __init__(self, vid: int):
        self.id = vid
        self.kind = random.choice(list(VEHICLE_COLOURS.keys()))
        w, h = VEHICLE_SIZES[self.kind]
        self.w, self.h = w, h
        lane = random.choice([HEIGHT // 4, HEIGHT // 2, 3 * HEIGHT // 4])
        self.y = lane - h // 2 + random.randint(-20, 20)
        self.x = -w  # start off-screen left
        self.speed = random.randint(4, 10)
        self.colour = VEHICLE_COLOURS[self.kind]

    @property
    def done(self):
        return self.x > WIDTH + self.w

    def update(self):
        self.x += self.speed

    def draw(self, frame):
        x1, y1 = int(self.x), int(self.y)
        x2, y2 = x1 + self.w, y1 + self.h
        cv2.rectangle(frame, (x1, y1), (x2, y2), self.colour, -1)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 255, 255), 2)
        label = f"{self.kind[:3].upper()} #{self.id}"
        cv2.putText(frame, label, (x1 + 4, y1 + 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)


def generate():
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(OUTPUT_PATH, fourcc, FPS, (WIDTH, HEIGHT))

    total_frames = FPS * DURATION
    vehicles: list[SimVehicle] = []
    next_id = 1
    spawn_timer = 0

    for frame_idx in range(total_frames):
        # Road background
        frame = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
        frame[:] = (45, 50, 45)  # dark asphalt

        # Lane markings
        for y in [HEIGHT // 3, 2 * HEIGHT // 3]:
            for x in range(0, WIDTH, 60):
                cv2.rectangle(frame, (x, y - 2), (x + 30, y + 2), (200, 200, 60), -1)

        # Road edge lines
        cv2.line(frame, (0, 10), (WIDTH, 10), (200, 200, 200), 3)
        cv2.line(frame, (0, HEIGHT - 10), (WIDTH, HEIGHT - 10), (200, 200, 200), 3)

        # Virtual counting line
        count_x = WIDTH // 2
        cv2.line(frame, (count_x, 0), (count_x, HEIGHT), (0, 255, 100), 2)
        cv2.putText(frame, "COUNTING LINE", (count_x - 70, 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 100), 1)

        # Spawn vehicles
        spawn_timer += 1
        if spawn_timer >= random.randint(15, 45):
            vehicles.append(SimVehicle(next_id))
            next_id += 1
            spawn_timer = 0

        # Update and draw
        for v in vehicles:
            v.update()
            v.draw(frame)
        vehicles = [v for v in vehicles if not v.done]

        # Overlay info
        cv2.putText(frame, f"GOVCHECK | CCTV TEST FEED | Frame {frame_idx + 1}/{total_frames}",
                    (10, HEIGHT - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1)

        out.write(frame)

    out.release()
    size_mb = os.path.getsize(OUTPUT_PATH) / 1_048_576
    print(f"[✓] Generated test video: {OUTPUT_PATH} ({size_mb:.1f} MB, {total_frames} frames)")


if __name__ == "__main__":
    generate()
