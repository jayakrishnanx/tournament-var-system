import os
from PIL import Image

src_path = r"C:\Users\jayak\.gemini\antigravity-ide\brain\564f6a40-447f-4500-a650-bfee5c1102a9\.user_uploaded\media_1787931149443.png"
dst_path = r"c:\Users\jayak\.gemini\antigravity-ide\scratch\tournament-var-system\frontend\public\navbar-logo.png"

if os.path.exists(src_path):
    img = Image.open(src_path).convert("RGBA")
    
    # Crop any transparent borders automatically
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(dst_path, "PNG")
    print("Saved logo to", dst_path)
