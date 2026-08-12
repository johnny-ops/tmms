# GOVSERVE AI Service

FastAPI-based AI backend for real-time traffic violation detection using YOLOv8.

## Requirements

- **Python 3.12** (strictly required)
- NVIDIA GPU optional (YOLO runs on CPU by default)

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and configure .env
copy .env.example .env
# Edit .env with your Supabase credentials

# 5. Run the service
.\venv\Scripts\python.exe main.py
```

Service runs at: `http://localhost:8001`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/cameras/CAM-001/status` | Camera status |
| POST | `/api/cameras/CAM-001/start` | Start YOLO inference |
| POST | `/api/cameras/CAM-001/stop` | Stop inference |
| GET | `/api/cameras/CAM-001/stream` | MJPEG stream |
| WS | `/ws/camera/CAM-001` | WebSocket stats |
| GET | `/api/cameras/CAM-001/violation_config` | Get line config |
| POST | `/api/cameras/CAM-001/violation_config` | Save line config |
| POST | `/api/cameras/{id}/upload_video` | Analyze uploaded video |

## Environment Variables

See `.env.example` for all available configuration options.

## Python Dependencies

```
ultralytics==8.3.0        # YOLOv8 model + ByteTrack tracking
opencv-python==4.10.0.84  # Video capture and frame processing
supabase==2.9.1           # Database client
python-dotenv==1.0.1      # .env file loader
fastapi==0.115.0          # REST API framework
uvicorn[standard]==0.30.6 # ASGI server + WebSocket support
websockets==13.0.1        # WebSocket protocol
numpy==1.26.4             # Array operations
python-multipart==0.0.12  # File upload support
```
