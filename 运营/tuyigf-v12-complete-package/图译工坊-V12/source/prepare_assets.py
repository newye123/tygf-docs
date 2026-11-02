from PIL import Image, ImageFilter, ImageDraw
from pathlib import Path
import shutil
base=Path('/mnt/data/tuyigf-v12')
assets=base/'assets'; assets.mkdir(exist_ok=True)
files=[Path('/mnt/data/image.png'), *(base/'source'/f'image{n}.png' for n in ['', '_2','_3','_4','_5'])]
labels=['01-prepare','02-typography','03-inspection','04-reconcile','05-delivery','06-batch']
# Boxes that contain account balances, internal domains, workstation paths and identifiable project file names.
regions={
0:[(1205,0,1685,139)],
1:[],
2:[],
3:[(0,0,1210,86),(274,785,1080,880),(280,910,1000,1008)],
4:[(0,37,1260,128)],
5:[(25,238,1530,316),(40,322,1050,385),(456,729,1730,800),(42,825,421,1310),(486,865,1480,895),(20,590,410,840),(440,655,1250,715)]
}
for i,(f,lab) in enumerate(zip(files,labels)):
    img=Image.open(f).convert('RGB')
    for xy in regions[i]:
        x0,y0,x1,y1=xy
        x1=min(x1,img.width);y1=min(y1,img.height)
        part=img.crop((x0,y0,x1,y1)).filter(ImageFilter.GaussianBlur(16))
        img.paste(part,(x0,y0))
    img.save(assets/(lab+'.webp'),format='WEBP',quality=78,method=6)
    print(lab,img.size,(assets/(lab+'.webp')).stat().st_size)
# Contact sheet with no original files
imgs=[]
for lab in labels:
 im=Image.open(assets/(lab+'.webp'))
 target=(500,400) if im.width>700 else (165,400)
 im.thumbnail(target)
 imgs.append((lab,im.copy()))
w=1180;h=1200
sheet=Image.new('RGB',(w,h),'#F5F7F6');draw=ImageDraw.Draw(sheet)
positions=[(30,30),(550,30),(760,30),(30,465),(600,465),(30,875)]
for (label,im),(x,y) in zip(imgs,positions):
    draw.text((x,y),label,fill='#11211f')
    sheet.paste(im,(x,y+25))
sheet.save(assets/'source-overview.jpg',quality=88)
