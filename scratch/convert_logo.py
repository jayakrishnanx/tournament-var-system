import os
from PIL import Image

src_path = r"C:\Users\jayak\.gemini\antigravity-ide\brain\564f6a40-447f-4500-a650-bfee5c1102a9\.user_uploaded\media_1787928036687.png"
dst_path = r"c:\Users\jayak\.gemini\antigravity-ide\scratch\tournament-var-system\frontend\public\logo.png"

if os.path.exists(src_path):
    img = Image.open(src_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # If pixel is deep black (R, G, B < 30)
        if item[0] < 30 and item[1] < 30 and item[2] < 30:
            newData.append((0, 0, 0, 0)) # Make transparent
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(dst_path, "PNG")
    print("Successfully converted logo to transparent PNG at", dst_path)
