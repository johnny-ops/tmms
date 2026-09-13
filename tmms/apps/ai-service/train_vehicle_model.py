
import argparse
import os
import sys
from pathlib import Path
def check_dataset() -> bool:
    dataset_path = Path(__file__).parent / "dataset"
    train_images = dataset_path / "images" / "train"
    val_images   = dataset_path / "images" / "val"
    train_labels = dataset_path / "labels" / "train"
    val_labels   = dataset_path / "labels" / "val"
    issues = []
    for d in [train_images, val_images, train_labels, val_labels]:
        if not d.exists():
            issues.append(f"  Missing directory: {d}")
        elif not any(d.iterdir()):
            issues.append(f"  Empty directory: {d}")
    if issues:
        print("\n❌ Dataset is not ready:")
        for issue in issues:
            print(issue)
        print("\n→ See dataset/README.md for data collection instructions.")
        print("→ Place labeled images in dataset/images/train/ and dataset/images/val/")
        print("→ Place YOLO label files in dataset/labels/train/ and dataset/labels/val/")
        return False
    n_train = len(list(train_images.glob("*.[jp][pn]g")) + list(train_images.glob("*.webp")))
    n_val   = len(list(val_images.glob("*.[jp][pn]g"))   + list(val_images.glob("*.webp")))
    if n_train < 50:
        print(f"\n⚠️  Only {n_train} training images found. Minimum 50 required; 500+ recommended.")
        print("→ Model may have poor accuracy with this little data.")
        confirm = input("Continue anyway? [y/N] ").strip().lower()
        if confirm != "y":
            return False
    print(f"\n✅ Dataset ready: {n_train} train images, {n_val} val images")
    return True
def detect_device() -> str:
    try:
        import torch
        if torch.cuda.is_available():
            gpu = torch.cuda.get_device_name(0)
            vram = torch.cuda.get_device_properties(0).total_memory / 1e9
            print(f"✅ GPU detected: {gpu} ({vram:.1f} GB VRAM)")
            return "0"  
        else:
            print("ℹ️  No GPU detected — training on CPU (will be slow)")
            return "cpu"
    except ImportError:
        print("ℹ️  torch not available — using CPU")
        return "cpu"
def recommend_batch(device: str) -> int:
    if device == "cpu":
        return 4  
    try:
        import torch
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        if vram_gb >= 16:
            return 32
        elif vram_gb >= 8:
            return 16
        elif vram_gb >= 4:
            return 8
        else:
            return 4
    except Exception:
        return 4
def main():
    parser = argparse.ArgumentParser(
        description="Train TMMS Philippine vehicle detection model"
    )
    parser.add_argument("--epochs",  type=int, default=100, help="Training epochs (default: 100)")
    parser.add_argument("--batch",   type=int, default=None, help="Batch size (auto if not set)")
    parser.add_argument("--imgsz",   type=int, default=640,  help="Image size (default: 640)")
    parser.add_argument("--model",   type=str, default="./models/yolov8s.pt",
                        help="Base model to fine-tune (default: ./models/yolov8s.pt)")
    parser.add_argument("--name",    type=str, default="ph_traffic_v1",
                        help="Run name (default: ph_traffic_v1)")
    parser.add_argument("--resume",  action="store_true",
                        help="Resume interrupted training")
    args = parser.parse_args()
    print("=" * 60)
    print("  TMMS — Philippine Vehicle Model Training")
    print("=" * 60)
    if not check_dataset():
        sys.exit(1)
    device = detect_device()
    batch  = args.batch or recommend_batch(device)
    script_dir   = Path(__file__).parent
    data_yaml    = script_dir / "dataset" / "ph_traffic.yaml"
    models_dir   = script_dir / "models"
    models_dir.mkdir(exist_ok=True)
    base_model = args.model
    if not Path(base_model).exists():
        fallbacks = ["./models/yolov8s.pt", "./models/yolov8n.pt", "yolov8s.pt", "yolov8n.pt"]
        for fb in fallbacks:
            if Path(script_dir / fb).exists():
                base_model = str(script_dir / fb)
                print(f"ℹ️  Using fallback model: {base_model}")
                break
        else:
            base_model = "yolov8s.pt"
            print(f"ℹ️  Will auto-download: {base_model}")
    print(f"\n📋 Training Configuration:")
    print(f"   Base model:  {base_model}")
    print(f"   Dataset:     {data_yaml}")
    print(f"   Epochs:      {args.epochs}")
    print(f"   Batch size:  {batch}")
    print(f"   Image size:  {args.imgsz}px")
    print(f"   Device:      {device}")
    print(f"   Run name:    {args.name}")
    print()
    try:
        from ultralytics import YOLO
    except ImportError:
        print("❌ ultralytics not installed. Run: pip install ultralytics")
        sys.exit(1)
    model = YOLO(base_model)
    results = model.train(
        data    = str(data_yaml),
        epochs  = args.epochs,
        imgsz   = args.imgsz,
        batch   = batch,
        device  = device,
        project = "tmms_model",
        name    = args.name,
        resume  = args.resume,
        hsv_h   = 0.015,
        hsv_s   = 0.7,
        hsv_v   = 0.4,
        fliplr  = 0.5,
        mosaic  = 1.0,
        dropout = 0.0,
        save    = True,
        save_period = 10,  
        val     = True,
    )
    best_weights = Path("tmms_model") / args.name / "weights" / "best.pt"
    if best_weights.exists():
        dest = models_dir / "ph_traffic_v1.pt"
        import shutil
        shutil.copy(best_weights, dest)
        print(f"\n✅ Training complete!")
        print(f"   Best weights → {dest}")
        print(f"   Set in .env: YOLO_MODEL_PATH=./models/ph_traffic_v1.pt")
    else:
        print(f"\n⚠️  Training finished but best.pt not found at {best_weights}")
        print(f"   Check tmms_model/{args.name}/weights/ for saved checkpoints")
    print("\n📊 Model Performance Summary:")
    print("   (Check tmms_model/{name}/results.csv for full metrics)")
    print()
    print("   IMPORTANT: Do not claim accuracy without reviewing these numbers.")
    print("   Key metrics to check:")
    print("   - mAP50: Mean Average Precision at IoU=0.50")
    print("   - mAP50-95: Stricter metric across IoU thresholds")
    print("   - Per-class precision and recall")
    print()
    print("   A mAP50 > 0.80 is generally acceptable for production use.")
    print("   A mAP50 < 0.50 indicates insufficient or poor quality training data.")
if __name__ == "__main__":
    main()
