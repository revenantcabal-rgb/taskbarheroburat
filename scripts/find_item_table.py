import UnityPy, os
from collections import Counter
DATA=r"D:\steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
files=["sharedassets0.assets","resources.assets","globalgamemanagers.assets","level0"]
for fn in files:
    p=os.path.join(DATA,fn)
    if not os.path.exists(p): continue
    env=UnityPy.load(p)
    texts=[]; mb=Counter()
    for obj in env.objects:
        if obj.type.name=="TextAsset":
            try:
                d=obj.read(); nm=d.m_Name
                # size of script
                raw=d.m_Script
                sz=len(raw.encode('utf-8','ignore')) if isinstance(raw,str) else (len(raw) if raw else 0)
                texts.append((nm,sz))
            except Exception as e: texts.append((f"<err {e}>",0))
        elif obj.type.name=="MonoBehaviour":
            try:
                d=obj.read()
                cls='?'
                sc=getattr(d,'m_Script',None)
                if sc:
                    try: ms=sc.read(); cls=getattr(ms,'m_ClassName','?')
                    except: cls='<unreadable>'
                mb[cls]+=1
            except Exception:
                mb['<err>']+=1
    print(f"\n===== {fn} =====")
    print(f"TextAssets ({len(texts)}):")
    for nm,sz in sorted(texts,key=lambda x:-x[1])[:40]:
        print(f"   {sz:>9} {nm}")
    print(f"MonoBehaviour classes (top 40 of {sum(mb.values())}):")
    for cls,n in mb.most_common(40):
        print(f"   {n:>5} {cls}")
