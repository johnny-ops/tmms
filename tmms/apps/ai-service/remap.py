import os
import shutil
from pathlib import Path
mapping = {
    0: 2, 
    1: 6, 
    2: 1, 
    3: 5, 
    4: 0, 
    5: 0, 
    6: 3, 
}
src_dir = Path(r"C:\xampp\htdocs\GOVSERVE\tmms\PH Vehicles.v1i.yolov8")
dst_dir = Path(r"C:\xampp\htdocs\GOVSERVE\tmms\apps\ai-service\dataset")
def process_split(split_name_src, split_name_dst):
    src_img_dir = src_dir / split_name_src / "images"
    dst_img_dir = dst_dir / "images" / split_name_dst
    src_lbl_dir = src_dir / split_name_src / "labels"
    dst_lbl_dir = dst_dir / "labels" / split_name_dst
    for d in [dst_img_dir, dst_lbl_dir]:
        d.mkdir(parents=True, exist_ok=True)
        for f in d.iterdir():
            if f.is_file() and f.name != ".gitkeep":
                f.unlink()
    if src_img_dir.exists():
        for img_file in src_img_dir.iterdir():
            if img_file.is_file():
                shutil.copy2(img_file, dst_img_dir / img_file.name)
    if src_lbl_dir.exists():
        for lbl_file in src_lbl_dir.iterdir():
            if lbl_file.is_file() and lbl_file.suffix == ".txt":
                new_lines = []
                with open(lbl_file, "r") as f:
                    lines = f.readlines()
                for line in lines:
                    parts = line.strip().split()
                    if not parts:
                        continue
                    try:
                        old_id = int(parts[0])
                        if old_id in mapping:
                            new_id = mapping[old_id]
                            parts[0] = str(new_id)
                            new_lines.append(" ".join(parts))
                    except ValueError:
                        pass
                with open(dst_lbl_dir / lbl_file.name, "w") as f:
                    if new_lines:
                        f.write("\n".join(new_lines) + "\n")
print("Processing train split...")
process_split("train", "train")
print("Processing valid split...")
process_split("valid", "val")
print("Done!")
