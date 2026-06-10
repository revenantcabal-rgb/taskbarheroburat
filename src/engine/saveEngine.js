'use strict';
const crypto = require('crypto');
const ES3_PASSWORD = 'emuMqG3bLYJ938ZDCfieWJ';
const GOLD_KEY = 100001;
const NET_TICKS_TO_UNIX_MS = 62135596800000;
const RARITY = ['COMMON','UNCOMMON','RARE','LEGENDARY','IMMORTAL','ARCANA','BEYOND','CELESTIAL','DIVINE','COSMIC'];
let DB = null;
function setDB(db){ DB = db; }

function decryptEs3(buffer){ const b=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer); const iv=b.subarray(0,16),ct=b.subarray(16); const key=crypto.pbkdf2Sync(ES3_PASSWORD,iv,100,16,'sha1'); const d=crypto.createDecipheriv('aes-128-cbc',key,iv); return Buffer.concat([d.update(ct),d.final()]).toString('utf8'); }
function safeJsonParse(t){ return JSON.parse(String(t).replace(/([:\[,])(\s*)(\d{16,})(?=\s*[,\]}])/g,'$1$2"$3"')); }
function loadFromDecryptedText(o){ const outer=JSON.parse(o); let inner=outer.PlayerSaveData?outer.PlayerSaveData.value:outer; if(typeof inner==='string') inner=safeJsonParse(inner); return inner; }
function loadSave(buffer){ return loadFromDecryptedText(decryptEs3(buffer)); }
const netTicksToDate=t=>{const n=typeof t==='string'?Number(t):t;return n?new Date(n/10000-NET_TICKS_TO_UNIX_MS):null;};
const pick=(a,t,s)=>{const r=(a||[]).find(x=>x.Type===t&&x.SubKey===s);return r?r.Value:null;};
const nz=v=>v&&v!==0&&v!=='0';

// gearStats(gk): authoritative inherent stats + unique-mod text for a GearKey (DB.gear from GearInfoData/UniqueModInfoData). No fabrication.
function gearStats(gk){ return (gk&&DB&&DB.gear)?(DB.gear[gk]||DB.gear[String(gk)]||null):null; }
function itemInfo(key){ const i=DB&&DB.items&&(DB.items[key]||DB.items[String(key)]); return i?{name:i.n,grade:i.g,type:i.t,gt:i.gt,lvl:i.lvl,ic:i.ic,mat:!!i.mat,gk:i.gk,base:gearStats(i.gk)}:{name:'#'+key,grade:null,type:null,gt:null,lvl:null,ic:null,mat:false,gk:null,base:null}; }
// enchant stat-mod -> authoritative display name (DB.stats from the game's StatModInfoData). No fabrication.
function statName(modKey){ const s=DB&&DB.stats&&DB.stats[String(modKey)]; return s?s.sn:('Stat #'+modKey); }
function resolveMods(ench){ return (ench||[]).filter(m=>m&&m.StatModKey).map(m=>{ const s=DB&&DB.stats&&DB.stats[String(m.StatModKey)]; return {name:s?s.sn:('Stat #'+m.StatType),value:m.Value,tier:m.Tier,mod:s?s.m:null,stat:s?s.s:null}; }); }
// Structural icon resolver: the game only ships base (rarity-0) gear icons (TYPE_<id>) plus
// Item_<id> for materials/currency. A gear key is [type:2][rarity:1][baseIndex:2][sub:1]; the icon
// for any rarity is the type's base icon at baseIndex (type+'00'+idx). Pure logic so it runs in the
// browser too; the renderer falls back to a placeholder on a 404 (img.onerror). Returns the icon id
// (render src = assets/sprites/Item_<iconId>.png). Never claims a specific base NAME — only the icon.
function iconId(key){ const s=String(key); if(s.length!==6) return s; const type=s.slice(0,2),rarity=s[2],suf=s.slice(3); if(rarity==='0') return s; return type+'00'+suf.slice(0,2); }
function heroClass(key){ const h=DB&&DB.heroes&&(DB.heroes[key]||DB.heroes[String(key)]); return h?h.cls:('#'+key); }
function skillName(key){ const s=DB&&DB.skills&&(DB.skills[key]||DB.skills[String(key)]); return s?s.n:null; }
// --- who's-carrying source breakdown (mirror of the inline engine) ---
function sumStats(list){ const by={}; (list||[]).forEach(s=>{ if(s.v==null||s.v==='')return; const v=typeof s.v==='number'?s.v:parseFloat(s.v); if(isNaN(v))return; const k=(s.st||s.sn)+'|'+(s.m||''); if(!by[k])by[k]={sn:s.sn,st:s.st,m:s.m,v:0}; by[k].v+=v; }); return Object.values(by).filter(x=>x.v).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)); }
function heroBase(key){ const h=DB&&DB.heroes&&(DB.heroes[key]||DB.heroes[String(key)]); return (h&&h.base)||[]; }
function heroSources(hSave, equipped, attrSave){
  const gearList=[]; (equipped||[]).forEach(it=>{ (it.base&&it.base.i||[]).forEach(s=>gearList.push({sn:s.sn,st:s.st,m:s.m,v:s.v})); (it.mods||[]).forEach(m=>gearList.push({sn:m.name,st:m.name,m:m.mod,v:m.value})); });
  const treeList=[], treeSkills=[];
  (attrSave||[]).forEach(n=>{ if(!(n.Level>0))return; const a=DB&&DB.attributes&&DB.attributes[n.Key]; if(!a||String(a.h)!==String(hSave.heroKey))return;
    if(a.type==='PASSIVESKILL'){ const p=DB&&DB.passives&&DB.passives[a.val]; if(p&&p.v!=null)treeList.push({sn:p.sn,st:p.st,m:p.m,v:(typeof p.v==='number'?p.v:parseFloat(p.v)||0)*n.Level}); }
    else { const sk=DB&&DB.skills&&DB.skills[a.val]; if(sk&&!treeSkills.includes(sk.n))treeSkills.push(sk.n); } });
  return {base:heroBase(hSave.heroKey), gear:sumStats(gearList), tree:sumStats(treeList), treeSkills};
}
// per-MonsterKey kill counts from aggregateSaveDatas Type-0 sub-counters (sum == total kills; calibrated).
function killsByMonster(psd){ const out=[]; (psd.aggregateSaveDatas||[]).forEach(a=>{ if(a.Type!==0||a.SubKey===0||!(a.Value>0))return; const nm=DB&&DB.monsters&&(DB.monsters[a.SubKey]||DB.monsters[String(a.SubKey)]); out.push({key:a.SubKey,name:nm||('Monster #'+a.SubKey),kills:a.Value}); }); return out.sort((x,y)=>y.kills-x.kills); }
function accountBuffs(psd){
  const runes=[]; (psd.RuneSaveData||[]).forEach(r=>{ const lv=r.Level||0; if(lv<=0)return; const d=DB&&DB.runes&&DB.runes[r.RuneKey]; if(!d)return; const cur=(d.lv||[]).find(x=>x.l===lv); runes.push({n:d.n,eff:d.eff,level:lv,val:cur?cur.val:null}); });
  runes.sort((a,b)=>b.level-a.level);
  const pk=(psd.commonSaveData||{}).ArrangedPetKey; const p=(pk&&DB&&DB.pets)?(DB.pets[pk]||DB.pets[String(pk)]):null;
  return {runes, pet:p?{key:pk,n:p.n,desc:p.desc}:(pk?{key:pk,n:'#'+pk}:null)};
}
const rarityRank=g=>{const i=RARITY.indexOf(g);return i<0?-1:i;};

function gold(psd){ const c=(psd.currenySaveDatas||[]).find(x=>x.Key===GOLD_KEY); return c?c.Quantity:0; }
function heroes(psd){ const party=((psd.commonSaveData||{}).arrangedHeroKey||[]).map(String);
  return (psd.heroSaveDatas||[]).map(h=>({key:h.heroKey,cls:heroClass(h.heroKey),level:h.HeroLevel,exp:Math.round(h.HeroExp||0),pts:h.AllocatedHeroAbilityPoint,unspent:h.AbilityPoint,gear:(h.equippedItemIds||[]).filter(nz).length,skills:(h.equippedSKillKey||[]).filter(s=>s&&s!==-1).map(skillName).filter(Boolean),deployed:party.includes(String(h.heroKey))})).sort((a,b)=>b.level-a.level); }
function inventory(psd){ const occ=a=>(psd[a]||[]).filter(s=>nz(s.ItemUniqueId)).length;
  return { owned:(psd.itemSaveDatas||[]).length, stashFilled:occ('stashSaveDatas'), stashSlots:(psd.stashSaveDatas||[]).length, invFilled:occ('inventorySaveDatas'), invSlots:(psd.inventorySaveDatas||[]).length, tradeFilled:occ('tradingStashSaveDatas') }; }
function ownedItems(psd){ return (psd.itemSaveDatas||[]).map(it=>{ const info=itemInfo(it.ItemKey); return {uid:String(it.UniqueId),key:String(it.ItemKey),icon:info.ic||iconId(it.ItemKey),ench:(it.EnchantCount||[]).reduce((a,b)=>a+b,0),mods:resolveMods(it.EnchantData),...info}; }); }
function byRarity(psd){ const g={}; for(const it of ownedItems(psd)){ if(it.grade) g[it.grade]=(g[it.grade]||0)+1; } return g; }
function trophies(psd){ return ownedItems(psd).filter(it=>rarityRank(it.grade)>=3).sort((a,b)=>rarityRank(b.grade)-rarityRank(a.grade)); }
function lootDiff(prevPsd,curPsd){ const prev=new Set((prevPsd.itemSaveDatas||[]).map(it=>String(it.UniqueId))); return ownedItems(curPsd).filter(it=>!prev.has(it.uid)); }
function runes(psd){ const a=psd.RuneSaveData||[]; return {total:a.length,leveled:a.filter(r=>(r.Level||0)>0).length}; }
function aggregates(psd){ const a=psd.aggregateSaveDatas||[]; return { lifetimeGold:pick(a,2,0), totalKills:pick(a,0,0), perDifficultyCompletions:[0,1,2,3].map(d=>pick(a,16,d)) }; }
function summary(psd){ const c=psd.commonSaveData||{}; return {version:c.version,playTimeHours:c.playTime?+(c.playTime/3600).toFixed(1):null,maxCompletedStage:c.maxCompletedStage,currentStage:c.currentStageKey,currentWave:c.currentStageWave,arrangedParty:(c.arrangedHeroKey||[]).map(heroClass),activePet:c.ArrangedPetKey,lastSaved:netTicksToDate(c.lastSavedTime)}; }
function snapshotFromPsd(psd){ return {capturedAt:new Date().toISOString(),summary:summary(psd),gold:gold(psd),heroes:heroes(psd),inventory:inventory(psd),byRarity:byRarity(psd),trophies:trophies(psd),runes:runes(psd),aggregates:aggregates(psd)}; }
function snapshot(buffer){ return snapshotFromPsd(loadSave(buffer)); }
function rates(prev,cur){ const ms=new Date(cur.summary.lastSaved)-new Date(prev.summary.lastSaved); const h=ms/3600000; const d=(a,b)=>(a==null||b==null)?null:b-a; const ph=v=>(v==null||!h)?null:Math.round(v/h); const dg=d(prev.gold,cur.gold),dk=d(prev.aggregates.totalKills,cur.aggregates.totalKills); return {spanMinutes:+(ms/60000).toFixed(1),goldDelta:dg,goldPerHour:ph(dg),killsDelta:dk,killsPerHour:ph(dk)}; }
// History/trends — mirror of the inline engine. Lean scalar snapshot + per-interval rates from backups.
function trendPoint(psd){ const c=psd.commonSaveData||{}, a=psd.aggregateSaveDatas||[]; const goldRow=(psd.currenySaveDatas||[]).find(x=>x.Key===GOLD_KEY); const d=netTicksToDate(c.lastSavedTime); return {t:d?+d:null,gold:goldRow?goldRow.Quantity:0,lifeGold:pick(a,2,0),kills:pick(a,0,0),playH:c.playTime?+(c.playTime/3600).toFixed(2):null,maxStage:c.maxCompletedStage,items:(psd.itemSaveDatas||[]).length,runes:(psd.RuneSaveData||[]).filter(r=>(r.Level||0)>0).length}; }
function buildTrends(points){ const seen={},pts=[]; (points||[]).filter(p=>p&&p.t).sort((a,b)=>a.t-b.t).forEach(p=>{const k=p.t+'/'+p.lifeGold; if(seen[k])return; seen[k]=1; pts.push(p);}); for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i]; const dPlay=(b.playH!=null&&a.playH!=null)?b.playH-a.playH:null; const dWall=(b.t-a.t)/3600000; const h=(dPlay!=null&&dPlay>0.01)?dPlay:dWall; const dLife=(b.lifeGold!=null&&a.lifeGold!=null)?b.lifeGold-a.lifeGold:null; const dKills=(b.kills!=null&&a.kills!=null)?b.kills-a.kills:null; b.goldPerHr=(dLife!=null&&h>0.01)?Math.round(dLife/h):null; b.killsPerHr=(dKills!=null&&h>0.01)?Math.round(dKills/h):null; } return pts; }

module.exports={setDB,RARITY,decryptEs3,safeJsonParse,loadFromDecryptedText,loadSave,snapshot,snapshotFromPsd,gold,heroes,inventory,ownedItems,byRarity,trophies,lootDiff,runes,aggregates,summary,rates,trendPoint,buildTrends,netTicksToDate,itemInfo,gearStats,heroClass,skillName,heroSources,accountBuffs,killsByMonster,sumStats,iconId,statName,resolveMods,GOLD_KEY};
