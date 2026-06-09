RANK=["COMMON","UNCOMMON","RARE","LEGENDARY","IMMORTAL","ARCANA","BEYOND","CELESTIAL","DIVINE","COSMIC"]
import csv
rows=list(csv.DictReader(open("scripts/_gamedata_raw/ItemInfoData.txt",encoding="utf-8-sig")))
gear=[r for r in rows if r["ITEMTYPE"]=="GEAR"]
ok=bad=0; mism=[]
for r in gear:
    k=r["ItemKey"]
    if len(k)!=6: continue
    d=int(k[2])
    want=RANK[d] if d<len(RANK) else None
    if r["GRADE"]==want: ok+=1
    else: bad+=1; mism.append((k,r["GRADE"],want))
print(f"GEAR rows checked: {ok+bad} | 3rd-digit==GRADE: {ok} | mismatches: {bad}")
for m in mism[:10]: print("  mismatch",m)
# also: do all NameKeys exist as ItemName_ in localization keys?
print("total rows:",len(rows),"| gear:",len(gear),"| material:",sum(1 for r in rows if r['ITEMTYPE']=='MATERIAL'),"| stagebox:",sum(1 for r in rows if r['ITEMTYPE']=='STAGEBOX'))
nk=set(r["NameKey"] for r in rows)
print("distinct NameKeys:",len(nk),"| sample:",list(nk)[:5])
