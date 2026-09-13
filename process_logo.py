import os
from PIL import Image

src_path = r"c:\Users\uwemd\.gemini\antigravity-ide\brain\7a85ab67-4ea4-4d7a-a386-d5a4e609cc01\.user_uploaded\media_1789316587232.png"
base_dir = r"c:\Users\uwemd\.gemini\antigravity-ide\scratch\JW-Original-Song-Lyrics-App"

try:
    img = Image.open(src_path)
    
    # 1. public/logo.png
    img.save(os.path.join(base_dir, "public", "logo.png"))
    
    # 2. public/favicon.ico
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    img.save(os.path.join(base_dir, "public", "favicon.ico"), format="ICO", sizes=icon_sizes)
    
    # 3. mobile/assets/icon.png
    img_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    img_1024.save(os.path.join(base_dir, "mobile", "assets", "icon.png"))
    
    # 4. mobile/assets/adaptive-icon.png
    img_1024.save(os.path.join(base_dir, "mobile", "assets", "adaptive-icon.png"))
    
    # 5. mobile/assets/favicon.png
    img_48 = img.resize((48, 48), Image.Resampling.LANCZOS)
    img_48.save(os.path.join(base_dir, "mobile", "assets", "favicon.png"))
    
    # 6. mobile/assets/splash.png
    # Let's make the background white since the logo is purple with white accents, 
    # but the image itself might be transparent. I'll make it transparent or #030712 based on the theme. 
    # Given the app is a dark theme (#030712), a dark background splash screen is best.
    splash = Image.new("RGBA", (1242, 2436), (3, 7, 18, 255))
    img_splash = img.resize((800, 800), Image.Resampling.LANCZOS)
    x = (1242 - 800) // 2
    y = (2436 - 800) // 2
    
    if img_splash.mode in ('RGBA', 'LA') or (img_splash.mode == 'P' and 'transparency' in img_splash.info):
        splash.paste(img_splash, (x, y), img_splash)
    else:
        splash.paste(img_splash, (x, y))
        
    splash.save(os.path.join(base_dir, "mobile", "assets", "splash.png"))
    print("Successfully processed all images.")
except Exception as e:
    print(f"Error: {e}")
