import csv, json, os
RANK=["COMMON","UNCOMMON","RARE","LEGENDARY","IMMORTAL","ARCANA","BEYOND","CELESTIAL","DIVINE","COSMIC"]
db=json.load(open("src/engine/gamedata.min.json",encoding="utf-8"))
loc=json.load(open("src/engine/localization.min.json",encoding="utf-8"))
have=set(f[5:-4] for f in os.listdir("src/assets/sprites") if f.startswith("Item_") and f.endswith(".png"))
items=db["items"]
# coverage of FULL catalog
from collections import Counter,defaultdict
by_type=Counter(); name_ok=Counter(); icon_ok=Counter(); desc_ok=Counter(); by_grade=Counter()
no_name=[]; no_icon=[]
rows=list(csv.DictReader(open("scripts/_gamedata_raw/ItemInfoData.txt",encoding="utf-8-sig")))
for r in rows:
    k=r["ItemKey"]; t=r["ITEMTYPE"]; by_type[t]+=1
    it=items.get(k,{})
    nm=it.get("n","")
    fallback = nm.startswith("#") or any(nm==f"{g.capitalize()} Material" for g in RANK) or nm.endswith(" Item")
    if nm and not fallback: name_ok[t]+=1
    else: no_name.append((k,t,nm))
    ic=it.get("ic","")
    if ic in have: icon_ok[t]+=1
    else: no_icon.append((k,t,ic))
    dk=r["DescriptionKey"]
    if dk and (loc.get(dk) or loc.get(dk.replace("ItemDescription_",""))): desc_ok[t]+=1
    if t=="GEAR" and len(k)==6: by_grade[RANK[int(k[2])] if int(k[2])<10 else "?"]+=1
print("TOTAL catalog rows:",len(rows))
for t in by_type:
    print(f"  {t}: {by_type[t]} | named {name_ok[t]} | icon-on-disk {icon_ok[t]} | has-desc {desc_ok[t]}")
print("\nGEAR by rarity tier (endgame incl):")
for g in RANK: print(f"  {g}: {by_grade.get(g,0)}")
print("\nitems WITHOUT authoritative name:",len(no_name),no_name[:12])
print("items WITHOUT icon on disk:",len(no_icon),no_icon[:12])
# descriptions: how many distinct DescriptionKeys exist & resolve
dks=set(r["DescriptionKey"] for r in rows if r["DescriptionKey"])
dk_res=sum(1 for d in dks if loc.get(d))
print(f"\ndistinct DescriptionKeys referenced: {len(dks)} | resolve in loc: {dk_res}")
gear_with_desc=sum(1 for r in rows if r["ITEMTYPE"]=="GEAR" and r["DescriptionKey"])
print("GEAR rows with a DescriptionKey:",gear_with_desc)
