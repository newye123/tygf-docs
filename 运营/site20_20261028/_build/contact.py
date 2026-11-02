from PIL import Image, ImageDraw
import os, sys

here = os.path.dirname(os.path.abspath(__file__))
screens = os.path.join(here, '..', 'screens')
lang = sys.argv[1] if len(sys.argv) > 1 else 'zh'
suffix = '-home-1440-en.png' if lang == 'en' else '-home-1440.png'
files = sorted(f for f in os.listdir(screens) if f.endswith(suffix))
cols, tw, th, band = 4, 480, 333, 22
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + band)), '#111111')
draw = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(os.path.join(screens, f)).convert('RGB').resize((tw, th))
    x, y = (i % cols) * tw, (i // cols) * (th + band)
    sheet.paste(im, (x, y + band))
    draw.text((x + 8, y + 5), f.replace('-home-1440-en.png', '').replace('-home-1440.png', ''), fill='#ffffff')
out = os.path.join(screens, 'contact-%s.png' % lang)
sheet.save(out)
print(out, sheet.size, len(files))
