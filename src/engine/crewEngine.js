/* crewEngine.js (v1.0.28) — the first extracted module of the TBH HUD monolith.
   Pure, dependency-free crew logic shared by THREE consumers: the browser/Electron renderer (window.CrewEngine),
   the Node test suite (require), and a parity check against the serverless API's own copy. Holds the things that
   were previously duplicated or inline: the canonical member identity (the dup-row fix), board de-duplication, and
   the PvP Arena math. NO DOM, NO i18n, NO formatting — those stay in the renderer (logic vs presentation). UMD so
   the exact same file loads via <script src> on file:// and GitHub Pages AND via require() in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CrewEngine = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- canonical identity (the duplicate-row fix) ----------
  // normName + crewMemberId are byte-for-byte identical to the server's api/_lib.canonMemberId (a committed test
  // asserts it). A member's id is a deterministic hash of their NORMALIZED display name over UTF-8 bytes, so the
  // same name on any machine / any client version resolves to one row.
  function normName(n) { var s = String(n == null ? '' : n); try { s = s.normalize('NFKC'); } catch (e) {} return s.trim().toLowerCase().replace(/\s+/g, ' '); }
  function utf8bytes(s) { try { return unescape(encodeURIComponent(s)); } catch (e) { return String(s || ''); } } // byte-string (chars 0..255), identical in Node + browser
  function crewHash(byteStr) { // two interleaved 32-bit FNV-1a streams -> a stable ~14-char base36 id
    var h1 = 0x811c9dc5 >>> 0, h2 = 0x1000193 >>> 0;
    for (var i = 0; i < byteStr.length; i++) { var c = byteStr.charCodeAt(i) & 0xff; h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0; h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0; }
    return ('0000000' + (h1 >>> 0).toString(36)).slice(-7) + ('0000000' + (h2 >>> 0).toString(36)).slice(-7);
  }
  function crewMemberId(name) { return 'cm_' + crewHash(utf8bytes(normName(name))); }

  // ---------- board de-duplication (client safety-net for the dup bug) ----------
  // collapse rows that share a normalized display name; keep the freshest, carry its momentum/spark/achievement.
  // Returns { rows, merged } (no side-channel state — the renderer reads .merged for its "merged N" note).
  function dedupeBoard(rows) {
    if (!rows || !rows.length) return { rows: rows || [], merged: 0 };
    var map = {}, order = [], merged = 0;
    rows.forEach(function (m) {
      var k = normName(m && m.name);
      if (!k) { order.push({ k: null, m: m }); return; }
      if (!map[k]) { map[k] = { k: k, m: m }; order.push(map[k]); return; }
      merged++;
      var cur = map[k].m;
      var newer = ((+new Date(m.updatedAt || 0)) > (+new Date(cur.updatedAt || 0))) ? m : cur, older = (newer === m) ? cur : m;
      newer.momentum = newer.momentum || older.momentum;
      if (!(newer.spark && newer.spark.length)) newer.spark = older.spark;
      newer.achievement = newer.achievement || older.achievement;
      map[k].m = newer;
    });
    return { rows: order.map(function (o) { return o.k === null ? o.m : map[o.k].m; }), merged: merged };
  }

  // ---------- stage index (global monotonic across difficulties) — mirrors the engine's stageIdx ----------
  function stageIdx(key) { var k = +key; if (!k) return null; var di = Math.floor(k / 1000) - 1, act = Math.floor(k % 1000 / 100), no = k % 100; if (di < 0 || di > 3 || act < 1 || act > 3 || no < 1 || no > 10) return null; return di * 30 + (act - 1) * 10 + no; }

  // ---------- Arena (PvP) math — pure; the renderer adds display strings + i18n ----------
  var RARITY = ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY', 'IMMORTAL', 'ARCANA', 'BEYOND', 'CELESTIAL', 'DIVINE', 'COSMIC'];
  function topHeroLv(st) { var m = 0; ((st && st.topHeroes) || []).forEach(function (h) { if ((h.level || 0) > m) m = h.level || 0; }); return m || null; }
  function gearScore(st) { var t = (st && st.tiers) || {}, sc = 0, any = false; RARITY.forEach(function (g, i) { if (t[g] > 0) { any = true; sc += t[g] * Math.pow(2, Math.max(0, i - 2)); } }); return any ? sc : (((st && st.trophies) != null && st.trophies > 0) ? st.trophies : null); }
  function mom(m) { return (m && m.momentum && m.momentum.goldPerHr > 0) ? m.momentum.goldPerHr : null; }

  // each duel category: raw value (no formatting) + weight (= points). Momentum is a 0.6 bonus round.
  var CATS = [
    { key: 'prog',    weight: 1.4, get: function (m) { return stageIdx((m.stats || {}).maxStage); } },
    { key: 'wealth',  weight: 1.0, get: function (m) { var v = (m.stats || {}).lifeGold; return v != null ? v : null; } },
    { key: 'combat',  weight: 1.0, get: function (m) { var v = (m.stats || {}).kills; return v != null ? v : null; } },
    { key: 'heroes',  weight: 1.1, get: function (m) { return topHeroLv(m.stats || {}); } },
    { key: 'runes',   weight: 1.0, get: function (m) { var v = (m.stats || {}).runesLeveled; return v != null ? v : null; } },
    { key: 'arsenal', weight: 1.2, get: function (m) { return gearScore(m.stats || {}); } }
  ];
  var MOM_CAT = { key: 'mom', weight: 0.6, get: function (m) { return mom(m); } };

  // Arena Power 0..9999 — a log-scaled weighted blend (a derived ranking, never an in-game value).
  function arenaPower(m) {
    var st = (m && m.stats) || {}, P = 0, W = 0;
    function lg(v, capv) { return v == null ? null : Math.min(1000, Math.round(1000 * Math.log(1 + Math.max(0, v)) / Math.log(1 + capv))); }
    var subs = {
      prog: (function () { var i = stageIdx(st.maxStage); return i == null ? null : Math.min(1000, Math.round(1000 * i / 120)); })(),
      wealth: lg(st.lifeGold, 1e11), combat: lg(st.kills, 5e7),
      heroes: (function () { var v = topHeroLv(st); return v == null ? null : Math.min(1000, Math.round(1000 * v / 60)); })(),
      runes: (function () { var v = st.runesLeveled; return v == null ? null : Math.min(1000, Math.round(1000 * v / 197)); })(),
      arsenal: lg(gearScore(st), 200)
    };
    var WT = [['prog', 1.4], ['wealth', 1], ['combat', 1], ['heroes', 1.1], ['runes', 1], ['arsenal', 1.2]];
    WT.forEach(function (p) { var s = subs[p[0]]; if (s != null) { P += s * p[1]; W += p[1]; } });
    return W ? Math.min(9999, Math.round(P / W * 10)) : 0;
  }

  var TIERS = [{ min: 0, id: 'bronze', cl: 't-bronze' }, { min: 1500, id: 'silver', cl: 't-silver' }, { min: 3000, id: 'gold', cl: 't-gold' },
    { min: 4500, id: 'platinum', cl: 't-plat' }, { min: 6000, id: 'diamond', cl: 't-dia' }, { min: 7500, id: 'master', cl: 't-master' }, { min: 9000, id: 'cosmic', cl: 't-cosmic' }];
  function arenaTier(power) { var t = TIERS[0]; TIERS.forEach(function (x) { if (power >= x.min) t = x; }); return t; }

  // a duel: structured rounds (raw values + win flag), winner, points, wins, powers. Mirrors the prior inline logic.
  function duel(a, b) {
    var rounds = [], aPts = 0, bPts = 0;
    CATS.forEach(function (c) {
      var av = c.get(a), bv = c.get(b), win = 'tie';
      if (av != null && bv != null) { if (av > bv) { win = 'a'; aPts += c.weight; } else if (bv > av) { win = 'b'; bPts += c.weight; } }
      else if (av != null) { win = 'a'; aPts += c.weight; } else if (bv != null) { win = 'b'; bPts += c.weight; }
      rounds.push({ key: c.key, weight: c.weight, av: av, bv: bv, win: win });
    });
    var am = MOM_CAT.get(a), bm = MOM_CAT.get(b);
    if (am != null || bm != null) {
      var mw = 'tie';
      if (am != null && bm != null) { if (am > bm) { mw = 'a'; aPts += MOM_CAT.weight; } else if (bm > am) { mw = 'b'; bPts += MOM_CAT.weight; } }
      else if (am != null) { mw = 'a'; aPts += MOM_CAT.weight; } else if (bm != null) { mw = 'b'; bPts += MOM_CAT.weight; }
      rounds.push({ key: 'mom', weight: MOM_CAT.weight, av: am, bv: bm, win: mw });
    }
    var aPow = arenaPower(a), bPow = arenaPower(b);
    var winner = aPts > bPts ? 'a' : (bPts > aPts ? 'b' : (aPow >= bPow ? 'a' : 'b'));
    return { a: a, b: b, rounds: rounds, aPts: aPts, bPts: bPts,
      aWins: rounds.filter(function (r) { return r.win === 'a'; }).length,
      bWins: rounds.filter(function (r) { return r.win === 'b'; }).length,
      winner: winner, aPow: aPow, bPow: bPow };
  }

  // round-robin standings: each member's W/L vs every other, sorted by wins then power. Returns {m,w,l,pow,tier}.
  function ladder(members) {
    var elig = (members || []).filter(function (m) { return m && m.stats; });
    return elig.map(function (m) {
      var w = 0, l = 0;
      elig.forEach(function (o) { if (o === m) return; if (duel(m, o).winner === 'a') w++; else l++; });
      var pow = arenaPower(m);
      return { m: m, w: w, l: l, pow: pow, tier: arenaTier(pow) };
    }).sort(function (x, y) { return (y.w - x.w) || (y.pow - x.pow); });
  }

  return {
    normName: normName, crewMemberId: crewMemberId, dedupeBoard: dedupeBoard, stageIdx: stageIdx,
    RARITY: RARITY, gearScore: gearScore, topHeroLv: topHeroLv, mom: mom,
    CATS: CATS, arenaPower: arenaPower, TIERS: TIERS, arenaTier: arenaTier, duel: duel, ladder: ladder,
  };
}));
