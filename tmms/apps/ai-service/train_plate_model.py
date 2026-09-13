
import argparse
import sys
from pathlib import Path
PLATE_DATASET_YAML = """
# Philippine License Plate Detection Dataset
# Class: 0 = license_plate (single class)
path: datasets/license_plates
train: images/train
val:   images/val
nc: 1
names:
  0: license_plate
"""
def ensure_plate_dataset_structure():
    base = Path(__file__).parent / "datasets" / "license_plates"
    dirs = [
        base / "images" / "train",
        base / "images" / "val",
        base / "labels" / "train",
        base / "labels" / "val",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
    yaml_path = base / "plate_detector.yaml"
    if not yaml_path.exists():
        yaml_path.write_text(PLATE_DATASET_YAML)
        print(f"✅ Created dataset config: {yaml_path}")
    return base, yaml_path
def check_plate_dataset(base: Path) -> bool:
    train_images = base / "images" / "train"
    n_train = len(list(train_images.glob("*.[jp][pn]g")) + list(train_images.glob("*.webp")))
    if n_train == 0:
        print("\n❌ No plate training images found.")
        print(f"\nPlace plate images in: {train_images}")
        print("\nRequired label format (in labels/train/*.txt):")
        print("  0 <x_center> <y_center> <width> <height>")
        print("\nFree plate datasets:")
        print("  - https://universe.roboflow.com/ → search 'license plate philippines'")
        print("  - https://universe.roboflow.com/ → search 'philippine plate detection'")
        return False
    n_val = len(list((base / "images" / "val").glob("*.[jp][pn]g")))
    print(f"\n✅ Plate dataset ready: {n_train} train images, {n_val} val images")
    return True
def main():
    parser = argparse.ArgumentParser(
        description="Train TMMS Philippine license plate detector"
    )
    parser.add_argument("--epochs", type=int, default=50,   help="Training epochs (default: 50)")
    parser.add_argument("--batch",  type=int, default=None, help="Batch size (auto if not set)")
    parser.add_argument("--imgsz",  type=int, default=320,  help="Image size (default: 320, smaller for plate crops)")
    args = parser.parse_args()
    print("=" * 60)
    print("  TMMS — License Plate Detector Training")
    print("=" * 60)
    base, yaml_path = ensure_plate_dataset_structure()
    if not check_plate_dataset(base):
        sys.exit(1)
    device = "cpu"
    batch  = args.batch or 8
    try:
        import torch
        if torch.cuda.is_available():
            device = "0"
            vram = torch.cuda.get_device_properties(0).total_memory / 1e9
            batch  = args.batch or (16 if vram >= 4 else 8)
            print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
    except ImportError:
        pass
    print(f"\n📋 Plate Detector Training Config:")
    print(f"   Base model:  yolov8n.pt (nano — fast for plate crops)")
    print(f"   Epochs:      {args.epochs}")
    print(f"   Batch size:  {batch}")
    print(f"   Image size:  {args.imgsz}px")
    print(f"   Device:      {device}")
    print()
    try:
        from ultralytics import YOLO
    except ImportError:
        print("❌ ultralytics not installed. Run: pip install ultralytics")
        sys.exit(1)
    model = YOLO("yolov8n.pt")
    model.train(
        data    = str(yaml_path),
        epochs  = args.epochs,
        imgsz   = args.imgsz,
        batch   = batch,
        device  = device,
        project = "tmms_model",
        name    = "plate_detector_v1",
        save    = True,
        val     = True,
    )
    best = Path("tmms_model") / "plate_detector_v1" / "weights" / "best.pt"
    if best.exists():
        import shutil
        dest = Path(__file__).parent / "models" / "plate_detector_v1.pt"
        shutil.copy(best, dest)
        print(f"\n✅ Plate detector saved → {dest}")
        print("   The AI service will automatically use this for plate OCR.")
    else:
        print(f"\n⚠️  Training finished but best.pt not found at {best}")
if __name__ == "__main__":
    main()
