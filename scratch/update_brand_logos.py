import os
from PIL import Image

base_dir = r"C:\Users\jayak\.gemini\antigravity-ide\brain\564f6a40-447f-4500-a650-bfee5c1102a9\.user_uploaded"
out_dir = r"c:\Users\jayak\.gemini\antigravity-ide\scratch\tournament-var-system\frontend\public\sponsors"

os.makedirs(out_dir, exist_ok=True)

mapping = {
    "media_1787930070117.png": "sponsor1.png", # Quick Mix
    "media_1787930070172.png": "sponsor2.png", # NEO
    "media_1787930070105.png": "sponsor3.png", # N N STEELS
}

for src_name, dst_name in mapping.items():
    src_path = os.path.join(base_dir, src_name)
    dst_path = os.path.join(out_dir, dst_name)
    
    img = Image.open(src_path).convert("RGBA")
    
    # Auto-crop non-transparent / non-white outer padding if needed
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(dst_path, "PNG")
    print(f"Saved {dst_name} ({img.size}) to {dst_path}")
