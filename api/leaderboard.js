'use strict';
/* GET /api/leaderboard?code=<crew> — the latest opt-in snapshot per crew member (max 50, newest first).
   Returns { ok, members:[{ id, name, stats, achievement, updatedAt }] }. Ranking/sorting is done client-side
   so each player can rank the same crew by a different stat. */
const { CODE_RE, applyCors, sql, ensureSchema, computeMomentum, sendJson, str, rateLimited, clientIp } = require('./_lib.js');

const READ_CAP_PER_MIN = 30;   // the client polls every 30s and only while the Crew tab is open
const HIST_PER_MEMBER = 8;     // recent snapshots used for momentum + the row sparkline

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'GET only' });

  const code = str((req.query && req.query.code) || '', 32);
  if (!CODE_RE.test(code || '')) return sendJson(res, 400, { ok: false, error: 'invalid crew code (3-32 letters, numbers, - or _)' });

  const s = sql();
  if (!s) return sendJson(res, 503, { ok: false, error: 'leaderboard not configured yet (no database attached)' });

  try {
    await ensureSchema(s);
    // v1.0.17: per-IP fixed-window rate limit
    if (await rateLimited(s, 'get:' + clientIp(req), READ_CAP_PER_MIN)) {
      return sendJson(res, 429, { ok: false, error: 'slow down — try again in a minute' });
    }
    const rows = await s`SELECT member_id, name, stats, achievement, updated_at
                         FROM tbh_crew_members WHERE crew_code = ${code}
                         ORDER BY updated_at DESC LIMIT 50`;
    // recent snapshot history per member (one query) → momentum + a lifetime-gold sparkline.
    // Extract ONLY the 4 scalars momentum/sparkline need, server-side — never pull the full stats jsonb 8×/member.
    // (That repeated jsonb egress is what exhausted the Neon free-tier data-transfer quota; 2026-06-23 incident.)
    const hrows = await s`SELECT member_id, g, k, s, ph, created_at FROM (
                            SELECT member_id,
                                   (stats->>'lifeGold')::float8  AS g,
                                   (stats->>'kills')::float8     AS k,
                                   (stats->>'maxStage')::int     AS s,
                                   (stats->>'playHours')::float8 AS ph,
                                   created_at,
                                   row_number() OVER (PARTITION BY member_id ORDER BY id DESC) rn
                            FROM tbh_crew_history WHERE crew_code = ${code}
                          ) t WHERE rn <= ${HIST_PER_MEMBER} ORDER BY member_id, created_at ASC`;
    const byMember = {};
    for (const h of hrows) {
      (byMember[h.member_id] = byMember[h.member_id] || []).push({ t: h.created_at, g: h.g, k: h.k, s: h.s, ph: h.ph });
    }
    // edge-cache the board: repeated polls (every 30s, across all crew members' clients) are served by Vercel's
    // CDN instead of re-hitting Neon — the main egress lever. ~20s staleness is fine for a friends board, and
    // errors are never cached (this header is only set on the success path).
    res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=40');
    res.setHeader('Vary', 'Origin');
    return sendJson(res, 200, {
      ok: true,
      members: rows.map((r) => {
        const hist = byMember[r.member_id] || [];
        return {
          id: r.member_id, name: r.name, stats: r.stats, achievement: r.achievement, updatedAt: r.updated_at,
          momentum: computeMomentum(hist),
          spark: hist.map((h) => (h.g != null ? h.g : 0)),   // lifetime-gold growth, oldest→newest
        };
      }),
    });
  } catch (e) {
    console.error('leaderboard error', e);
    return sendJson(res, 500, { ok: false, error: 'crew service temporarily unavailable' });
  }
};
