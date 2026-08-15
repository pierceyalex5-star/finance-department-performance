import json,sys
from pathlib import Path

src,world_out,na_out=sys.argv[1:4]
g=json.load(open(src,encoding='utf-8'))

def rings(geom):
    if not geom:return []
    if geom.get('type')=='Polygon':return geom.get('coordinates',[])
    if geom.get('type')=='MultiPolygon':
        out=[]
        for p in geom.get('coordinates',[]): out.extend(p)
        return out
    return []

def path_for(geom,proj):
    parts=[]
    for ring in rings(geom):
        pts=[]
        prev=None
        for lon,lat,*_ in ring:
            x,y=proj(lat,lon)
            if prev is not None and abs(x-prev)>520:
                if len(pts)>2:parts.append('M'+' L'.join(f'{a:.1f},{b:.1f}' for a,b in pts)+' Z')
                pts=[]
            pts.append((x,y));prev=x
        if len(pts)>2:parts.append('M'+' L'.join(f'{a:.1f},{b:.1f}' for a,b in pts)+' Z')
    return ' '.join(parts)

def world(lat,lon):return ((lon+180)/360*1000,(90-lat)/180*500)
NA=(-140,-50,14,72)
def na(lat,lon):
    minlon,maxlon,minlat,maxlat=NA
    return ((lon-minlon)/(maxlon-minlon)*1000,(maxlat-lat)/(maxlat-minlat)*560)

def make(proj,w,h,out,na_only=False):
    p=[]
    for f in g.get('features',[]):
        name=(f.get('properties') or {}).get('ADMIN') or (f.get('properties') or {}).get('NAME') or ''
        d=path_for(f.get('geometry'),proj)
        if not d:continue
        p.append(f'<path d="{d}" data-country="{name.replace(chr(34),"&quot;")}"/>')
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="none">
<style>path{{fill:#14384c;stroke:#4d7489;stroke-width:.8;vector-effect:non-scaling-stroke}} </style>
<rect width="100%" height="100%" fill="#071827"/>
<g>{''.join(p)}</g></svg>'''
    Path(out).write_text(svg,encoding='utf-8')
    print(out,len(p),'country features')

make(world,1000,500,world_out)
make(na,1000,560,na_out,True)
