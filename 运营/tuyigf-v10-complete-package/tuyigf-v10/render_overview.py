from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageOps,ImageDraw,ImageFont
P=Path('/mnt/data/tuyigf-v10');s=(P/'tuyigf-complete-v10.html').read_text()
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 p.set_content(s,wait_until='load');p.wait_for_timeout(150)
 p.screenshot(path=str(P/'v10-home-full.png'),full_page=True,timeout=40000)
 for section,filename in [('pain','section-pain.png'),('how','section-how.png'),('typography','section-typography.png'),('results','section-results.png'),('trust','section-trust.png')]:
  p.locator('#'+section).screenshot(path=str(P/filename),timeout=40000)
 p.evaluate('location.hash="#/typography"');p.wait_for_timeout(150);p.screenshot(path=str(P/'v10-typography-page-desktop.png'))
 p.evaluate('location.hash="#/how"');p.wait_for_timeout(150);p.screenshot(path=str(P/'v10-how-desktop.png'))
 b.close()
images=[]
for name in ['v10-home-desktop.png','section-pain.png','section-how.png','section-typography.png','section-results.png','section-trust.png']:
 im=Image.open(P/name).convert('RGB'); im.thumbnail((720,450)); images.append((name,im.copy()))
W=1520; cardw=734;cardh=490; H=3*(cardh+25)+70
board=Image.new('RGB',(W,H),'#f0f0f0');draw=ImageDraw.Draw(board)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
labels=['HERO','THE PROBLEM','HOW IT WORKS','FONT x PSD x LANGUAGE','RESULTS','QUALITY & DELIVERY']
for i,(_,im) in enumerate(images):
 x=15+(i%2)*(cardw+22);y=65+(i//2)*(cardh+20)
 draw.rounded_rectangle((x,y,x+cardw,y+cardh),radius=14,fill='#ffffff',outline='#dddddd',width=2)
 draw.text((x+20,y+17),labels[i],fill='#222222',font=font)
 px=x+(cardw-im.width)//2;py=y+45
 board.paste(im,(px,py))
draw.text((25,22),'TUYI WORKSHOP  /  V10 COMPLETE SITE OVERVIEW',fill='#333333',font=font)
board.save(P/'v10-six-screen-overview.jpg',quality=89)
print('FULL PAGE SIZE',Image.open(P/'v10-home-full.png').size,'overview',board.size)
