import os
from PIL import Image

sponsors_dir = r"c:\Users\jayak\.gemini\antigravity-ide\scratch\tournament-var-system\frontend\public\sponsors"

for filename in ["sponsor1.png", "sponsor2.png", "sponsor3.png"]:
    filepath = os.path.join(sponsors_dir, filename)
    if os.path.exists(filepath):
        img = Image.open(filepath).convert("RGBA")
        
        # Convert to RGB to find non-black bounding box
        rgb_img = img.convert("RGB")
        
        # Define threshold for "black" background (e.g. RGB < (25, 25, 25))
        pixels = rgb_img.load()
        width, height = rgb_img.size
        
        min_x, min_y = width, height
        max_x, max_y = 0, 0
        
        found = False
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y]
                # If pixel is not deep black
                if r > 25 or g > 25 or b > 25:
                    found = True
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y
                    
        if found and (max_x > min_x) and (max_y > min_y):
            # Add small padding
            pad = 5
            min_x = max(0, min_x - pad)
            min_y = max(0, min_y - pad)
            max_x = min(width, max_x + pad)
            max_y = min(height, max_y + pad)
            
            cropped = img.crop((min_x, min_y, max_x, max_y))
            cropped.save(filepath)
            print(f"Successfully trimmed {filename} from {width}x{height} to {cropped.size[0]}x{cropped.size[1]}")
        else:
            print(f"No non-black region found for {filename}")
