#!/usr/bin/env python
"""Extract rune icons (READ-ONLY) from sharedassets0 -> src/assets/runes/Rune_<IconPath>.png.
Rune sprite names match RuneInfoData.IconPath (e.g. 'AllHeroAttackDamage')."""
import UnityPy, os, json
HERE=os.path.dirname(os.path.abspath(__file__)); PROJ=os.path.dirname(HERE)
SRC=r"D:\steam\steamapps\common\TaskbarHero\TaskBarHero_Data\sharedassets0.assets"
OUT=os.path.join(PROJ,"src","assets","runes"); os.makedirs(OUT,exist_ok=True)
db=json.load(open(os.path.join(PROJ,"src","engine","gamedata.min.json"),encoding="utf-8"))
want=set(r["ic"] for r in db["runes"].values() if r.get("ic"))
env=UnityPy.load(SRC)
found={}
for obj in env.objects:
    if obj.type.name=="Sprite":
        try: d=obj.read(); nm=d.m_Name
        except: continue
        if nm in want and nm not in found:
            try:
                img=d.image
                if img.mode!="RGBA": img=img.convert("RGBA")
                if img.getbbox() is None: continue
                img.save(os.path.join(OUT,"Rune_"+nm+".png")); found[nm]=img.size
            except Exception as e: print("skip",nm,e)
print(f"rune icons wanted {len(want)} | written {len(found)} | missing {sorted(want-set(found))[:10]}")
print("sizes:",{f"{w}x{h}":sum(1 for s in found.values() if s==(w,h)) for (w,h) in set(found.values())})
