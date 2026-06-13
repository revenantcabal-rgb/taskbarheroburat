'use strict';
/* Shared helpers for the TBH HUD crew API (Vercel serverless + Neon Postgres).
   PRIVACY CONTRACT (mirrors the dashboard's Crew tab): this API only ever receives the small, calibrated
   BRAG-STATS payload that the client shows the user before they opt in — never the save file. Everything
   stored is namespaced tbh_* in the database. A crew is gated by a shared code; no accounts. */
const { neon } = require('@neondatabase/serverless');

const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/;

// CORS: reflect known origins (GitHub Pages + the Vercel hosts); the desktop app loads from file:// and sends
// no/`null` Origin, which isn't a CORS request the browser will block — give it `*`. Anything else gets no
// CORS header (the crew code, not CORS, is the access gate — this API only ever serves opt-in brag-stats).
const ALLOWED_ORIGINS = [
  'https://revenantcabal-rgb.github.io',
  'https://taskbarheroburat.vercel.app',
  'https://tbh-crew-api.vercel.app',
];
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || origin === 'null') res.setHeader('Access-Control-Allow-Origin', '*');
  else if (ALLOWED_ORIGINS.indexOf(origin) >= 0 || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

let _sql = null;
// Accept whichever connection-string env var the host provides: the Neon integration sets DATABASE_URL; Vercel
// Postgres sets POSTGRES_URL (pooled, also Neon-backed). This lets the crew API run on any of the three hosts
// (FDC tbh-crew-api, the owner's taskbarheroburat project, or local) with no per-host code change.
function sql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  if (!_sql) _sql = neon(url);
  return _sql;
}

let _schemaReady = null;
function ensureSchema(s) {
  if (!_schemaReady) _schemaReady = (async () => {
    await s`CREATE TABLE IF NOT EXISTS tbh_crew_members (
      crew_code text NOT NULL,
      member_id text NOT NULL,
      name text NOT NULL,
      stats jsonb NOT NULL,
      achievement jsonb,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (crew_code, member_id)
    )`;
    await s`CREATE TABLE IF NOT EXISTS tbh_crew_history (
      id bigserial PRIMARY KEY,
      crew_code text NOT NULL,
      member_id text NOT NULL,
      stats jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE INDEX IF NOT EXISTS tbh_crew_hist_idx ON tbh_crew_history (crew_code, member_id, id DESC)`;
    // v1.0.17 (P5) — fixed-window rate counters (serverless has no shared memory; Postgres is the only
    // cross-instance state). One row per (bucket, minute); swept opportunistically by /prune.
    await s`CREATE TABLE IF NOT EXISTS tbh_rate (
      bucket text NOT NULL,
      window_start timestamptz NOT NULL,
      n int NOT NULL DEFAULT 1,
      PRIMARY KEY (bucket, window_start)
    )`;
    // v1.0.17 (P5) — enchant crowd-calibration: aggregate counters of the OPT-IN reported tuple
    // (gear type, stone ItemKey, rolled STATTYPE). No identifiers of any kind are stored.
    await s`CREATE TABLE IF NOT EXISTS tbh_enchant_reports (
      gt text NOT NULL,
      material_key bigint NOT NULL,
      stat_type text NOT NULL,
      n int NOT NULL DEFAULT 1,
      first_seen timestamptz NOT NULL DEFAULT now(),
      last_seen timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (gt, material_key, stat_type)
    )`;
    // v1.0.25 — the crew ACTIVITY FEED: an append-only log of milestones derived from each member's own
    // snapshot deltas (same source as the per-member "latest achievement", just kept as a stream, not one row).
    // Nothing here is identifying beyond the display name the member already shares on the board.
    await s`CREATE TABLE IF NOT EXISTS tbh_crew_events (
      id bigserial PRIMARY KEY,
      crew_code text NOT NULL,
      member_id text NOT NULL,
      name text NOT NULL,
      kind text NOT NULL,
      text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE INDEX IF NOT EXISTS tbh_crew_events_idx ON tbh_crew_events (crew_code, id DESC)`;
  })().catch((e) => { _schemaReady = null; throw e; });
  return _schemaReady;
}

// v1.0.17 — simple fixed-window rate limit (cap per bucket per minute). FAIL-OPEN: a Neon hiccup here must
// never take an endpoint down harder, so errors allow the request (the caller's own try/catch still guards).
async function rateLimited(s, bucket, cap) {
  try {
    const r = await s`INSERT INTO tbh_rate (bucket, window_start, n)
                      VALUES (${bucket}, date_trunc('minute', now()), 1)
                      ON CONFLICT (bucket, window_start) DO UPDATE SET n = tbh_rate.n + 1
                      RETURNING n`;
    return r.length && r[0].n > cap;
  } catch (e) { return false; }
}
// best-effort client IP for per-IP buckets (Vercel sets x-forwarded-for; first hop = the client)
function clientIp(req) {
  const xf = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
// strip control characters, trim, clamp length — applied to every string that gets stored or echoed
const str = (v, max) => { if (typeof v !== 'string') return null; let out = ''; for (const ch of v) { const c = ch.charCodeAt(0); if (c >= 32 && c !== 127) out += ch; } return out.trim().slice(0, max); };

// ---- CANONICAL CREW IDENTITY (v1.0.28) — the fix for "the same friend shows up as several rows" ----
// Root cause: the member_id was minted on the CLIENT and stored verbatim, so a new PC, a reinstall, a stale
// pre-v1.0.27 build (random UUID) or a name typed with different case/spacing each created a brand-new row that
// the server never reconciled. The server is the only place that sees a whole crew at once, so it must own
// identity: a member's canonical id is a deterministic hash of their NORMALIZED display name, computed here.
// Same name (any case / spacing / unicode form, any client version, any machine) => the exact same row.
// normName + _crewHash are BYTE-FOR-BYTE identical to the client (UTF-8 bytes), so client and server agree.
function normName(n) { let s = String(n == null ? '' : n); try { s = s.normalize('NFKC'); } catch (e) {} return s.trim().toLowerCase().replace(/\s+/g, ' '); }
// two interleaved 32-bit FNV-1a streams over a byte sequence -> a stable ~14-char base36 id (mirrors the client's _crewHash)
function _crewHash(bytes) {
  let h1 = 0x811c9dc5 >>> 0, h2 = 0x1000193 >>> 0;
  for (let i = 0; i < bytes.length; i++) { const c = bytes[i] & 0xff; h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0; h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0; }
  return ('0000000' + (h1 >>> 0).toString(36)).slice(-7) + ('0000000' + (h2 >>> 0).toString(36)).slice(-7);
}
function canonMemberId(name) { return 'cm_' + _crewHash(Buffer.from(normName(name), 'utf8')); }

// whitelist + clamp the brag-stats payload — anything not listed here is dropped, never stored
const TIER_KEYS = ['LEGENDARY', 'IMMORTAL', 'ARCANA', 'BEYOND', 'CELESTIAL', 'DIVINE', 'COSMIC'];
// the calibrated Stat List line keys (v1.0.11) — mirrors STAT_LIST in the dashboard/saveEngine
const STATLIST_KEYS = ['IncreaseExpAmount', 'AdditionalExp', 'AdditionalExpStageBoss', 'AdditionalExpActBoss',
  'AdditionalExpNormalMonster', 'UnlockArrangeSlotCount', 'AllHeroMoveSpeed', 'AllHeroAttackSpeed', 'AllHeroAttackDamage'];
function cleanStats(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const heroes = Array.isArray(raw.topHeroes) ? raw.topHeroes.slice(0, 3).map((h) => ({
    cls: str(h && h.cls, 16) || '?', level: num(h && h.level) || 0,
  })) : [];
  // per-tier gear counts (v1.0.8): only the known tier names, only positive integers
  const tiers = {};
  if (raw.tiers && typeof raw.tiers === 'object') {
    TIER_KEYS.forEach((t) => { const n = num(raw.tiers[t]); if (n != null && n > 0) tiers[t] = Math.min(100000, Math.floor(n)); });
  }
  // rune stat totals (v1.0.10; v1.0.13 widened): the member's FULL account-wide rune totals — one {e,v} per
  // effect (the game has 39 distinct effects; cap 40) with untruncated names (longest is 36 chars; cap 48).
  // The old 6-entry/32-char caps cut the list — the owner wants the whole Stat List visible in Crew.
  const runeStats = Array.isArray(raw.runeStats) ? raw.runeStats.slice(0, 40).map((s) => ({
    e: str(s && s.e, 48) || '?', v: num(s && s.v) || 0,
  })).filter((s) => s.e !== '?' && s.v > 0) : [];
  // grouped Stat List (v1.0.11): only the calibrated line keys, raw positive values — anything else is dropped
  const statList = Array.isArray(raw.statList) ? raw.statList.slice(0, 12).map((s) => ({
    k: str(s && s.k, 32) || '', v: num(s && s.v) || 0,
  })).filter((s) => STATLIST_KEYS.indexOf(s.k) >= 0 && s.v > 0) : [];
  // v1.0.26 — last 3 RARE DROPS the member chose to showcase: only an item key, the epoch time, and the
  // dropper's own local clock string. The client only ever puts Immortal+ gear or Soulstones here; the board
  // re-resolves the name/icon/rarity from its OWN copy of the game data, so no item names are transmitted.
  const rareDrops = Array.isArray(raw.rareDrops) ? raw.rareDrops.slice(0, 3).map((r) => ({
    k: num(r && r.k) || 0, t: num(r && r.t) || 0, lt: str(r && r.lt, 16) || '',
  })).filter((r) => r.k > 0) : [];
  return {
    maxStage: num(raw.maxStage) || 0,
    maxStageLabel: str(raw.maxStageLabel, 40) || '',
    lifeGold: num(raw.lifeGold),
    kills: num(raw.kills),
    gold: num(raw.gold),
    topHeroes: heroes,
    runesLeveled: num(raw.runesLeveled),
    runesTotal: num(raw.runesTotal),
    trophies: num(raw.trophies),
    tiers,
    runeStats,
    statList,
    rareDrops,
    playHours: num(raw.playHours),
    ver: str(raw.ver, 12),
  };
}

// ---- stage-key decode (MIRRORS the dashboard/saveEngine; calibrated from the game's own StageInfoData):
//      key = difficulty*1000 + act*100 + stageNo, difficulty 1..4 = Normal/Nightmare/Hell/Torment ----
const DIFFICULTIES = ['Normal', 'Nightmare', 'Hell', 'Torment'];
function stageBits(key) {
  const k = +key || 0; const di = Math.floor(k / 1000) - 1, act = Math.floor((k % 1000) / 100), stg = k % 100;
  if (di < 0 || di > 3 || act < 1 || act > 3 || stg < 1) return null;
  return { di, act, stg, diff: DIFFICULTIES[di], label: 'Act ' + act + '-' + stg + ' · ' + DIFFICULTIES[di] };
}
// global monotonic stage index across difficulties (for progression momentum / ETA)
function stageIndex(key) { const b = stageBits(key); return b ? b.di * 30 + (b.act - 1) * 10 + b.stg : null; }
const capWord = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s);
const fmtBig = (n) => (n >= 1e9 ? (+(n / 1e9).toFixed(n % 1e9 ? 1 : 0)) + 'B' : n >= 1e6 ? (+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : '' + n);
// highest milestone in `miles` strictly crossed between prev and cur
function crossedMilestone(miles, prev, cur) { let hit = null; for (const m of miles) { if ((prev || 0) < m && (cur || 0) >= m) hit = m; } return hit; }
const GOLD_MILES = [1e6, 5e6, 1e7, 5e7, 1e8, 5e8, 1e9, 5e9, 1e10, 5e10, 1e11];
const KILL_MILES = [1e5, 5e5, 1e6, 2.5e6, 5e6, 1e7, 2.5e7, 5e7];
const TIER_ORDER = ['LEGENDARY', 'IMMORTAL', 'ARCANA', 'BEYOND', 'CELESTIAL', 'DIVINE', 'COSMIC'];

// ALL milestones crossed on THIS push, derived ONLY from the member's own snapshot deltas (never invented),
// most-bragworthy first. First share = joined. Returns [] when nothing changed.
function deriveEvents(prevStats, stats) {
  if (!prevStats) return [{ kind: 'join', text: 'Joined the crew' }];
  const ev = [];
  // 1) difficulty first-clear (the biggest moment) > a deeper stage in the same difficulty
  const pb = stageBits(prevStats.maxStage), cb = stageBits(stats.maxStage);
  if (cb && ((!pb && cb.di > 0) || (pb && cb.di > pb.di))) ev.push({ kind: 'difficulty', text: 'Broke into ' + cb.diff + ' difficulty' });
  // use the key-derived ENGLISH label (language-neutral) so clients can re-localize the feed — NOT the dropper's localized maxStageLabel
  else if ((stats.maxStage || 0) > (prevStats.maxStage || 0)) ev.push({ kind: 'stage', text: 'Reached ' + (cb ? cb.label : (stats.maxStageLabel || ('stage ' + stats.maxStage))) });
  // 2) first time a higher gear rarity tier ever appears
  const pt = prevStats.tiers || {}, ct = stats.tiers || {};
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) { const t = TIER_ORDER[i]; if ((ct[t] || 0) > 0 && !(pt[t] > 0)) { ev.push({ kind: 'tier', text: 'First ' + capWord(t) + ' gear!' }); break; } }
  // 3) lifetime gold + kill milestones
  const gm = crossedMilestone(GOLD_MILES, prevStats.lifeGold, stats.lifeGold); if (gm) ev.push({ kind: 'gold', text: 'Passed ' + fmtBig(gm) + ' lifetime gold' });
  const km = crossedMilestone(KILL_MILES, prevStats.kills, stats.kills); if (km) ev.push({ kind: 'kills', text: 'Passed ' + fmtBig(km) + ' kills' });
  // 4) top-hero level-up
  const top = (a) => (a && a.topHeroes || []).reduce((m, h) => Math.max(m, h.level || 0), 0);
  const tn = top(stats), tp = top(prevStats);
  if (tn > tp) { const h = (stats.topHeroes || []).filter((x) => (x.level || 0) === tn)[0]; ev.push({ kind: 'hero', text: (h ? h.cls : 'A hero') + ' hit Lv ' + tn }); }
  // 5) 10-rune milestone
  if (Math.floor((stats.runesLeveled || 0) / 10) > Math.floor((prevStats.runesLeveled || 0) / 10)) ev.push({ kind: 'runes', text: stats.runesLeveled + ' runes leveled' });
  // 6) a new Legendary+ (only when no bigger gear event already fired this push)
  if (!ev.some((e) => e.kind === 'tier') && (stats.trophies || 0) > (prevStats.trophies || 0)) ev.push({ kind: 'gear', text: 'Found a new Legendary+ item' });
  return ev;
}
// MOMENTUM from a member's own snapshot history (oldest->newest [{t,g,k,s,ph}]): measured rates only, null when
// there isn't a real delta to measure (never projected/invented). gold/kills over PLAYED hours; stage over wall days.
function computeMomentum(hist) {
  if (!Array.isArray(hist) || hist.length < 2) return null;
  const a = hist[0], b = hist[hist.length - 1];
  const out = { goldPerHr: null, killsPerHr: null, stagePerDay: null };
  const dPlay = (b.ph != null && a.ph != null) ? (b.ph - a.ph) : null;
  if (dPlay != null && dPlay > 0.05) {
    if (b.g != null && a.g != null) out.goldPerHr = Math.round((b.g - a.g) / dPlay);
    if (b.k != null && a.k != null) out.killsPerHr = Math.round((b.k - a.k) / dPlay);
  }
  const dDays = (b.t && a.t) ? ((+new Date(b.t) - +new Date(a.t)) / 86400000) : null;
  const si = stageIndex(b.s), pi = stageIndex(a.s);
  if (dDays != null && dDays > 0.04 && si != null && pi != null && si > pi) out.stagePerDay = +((si - pi) / dDays).toFixed(2);
  if (out.goldPerHr == null && out.killsPerHr == null && out.stagePerDay == null) return null;
  return out;
}

function sendJson(res, code, obj) { res.status(code).json(obj); }

module.exports = { CODE_RE, applyCors, sql, ensureSchema, cleanStats, deriveEvents, computeMomentum, stageIndex, sendJson, str, rateLimited, clientIp, normName, canonMemberId };
