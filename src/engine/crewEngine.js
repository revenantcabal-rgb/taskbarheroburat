/* crewEngine.js (v1.0.30) — the first extracted module of the TBH HUD monolith.
   Pure, dependency-free crew logic shared by THREE consumers: the browser/Electron renderer (window.CrewEngine),
   the Node test suite (require), and a parity check against the serverless API's own copy. Holds the things that
   were previously duplicated or inline: the canonical member identity (the dup-row fix) and board de-duplication.
   NO DOM, NO i18n, NO formatting — those stay in the renderer (logic vs presentation). UMD so the exact same file
   loads via <script src> on file:// and GitHub Pages AND via require() in Node.

   v1.0.30 — the Crew "Arena" (PvP duels / ladder / power / tier) was REMOVED at the owner's request. The crew is a
   cooperative board, not a competitive one; head-to-head "who beats whom" math has no place here. This module is now
   purely the identity + dedupe + stage-index helpers that keep the board accurate. */
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
  // key = difficulty*1000 + act*100 + stageNo, difficulty 1..4 (Normal/Nightmare/Hell/Torment). Used for
  // progression momentum / ETA and for ordering "furthest cleared" sensibly across difficulties.
  function stageIdx(key) { var k = +key; if (!k) return null; var di = Math.floor(k / 1000) - 1, act = Math.floor(k % 1000 / 100), no = k % 100; if (di < 0 || di > 3 || act < 1 || act > 3 || no < 1 || no > 10) return null; return di * 30 + (act - 1) * 10 + no; }

  return {
    normName: normName, crewMemberId: crewMemberId, dedupeBoard: dedupeBoard, stageIdx: stageIdx,
  };
}));
