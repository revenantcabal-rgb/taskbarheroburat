'use strict';
/* GET /api/feed?code=<crew> — the crew ACTIVITY FEED: the most recent milestones across all members,
   newest first (≤40). Each item is { name, kind, text, t } where `kind` drives the client's icon.
   Milestones are derived server-side from each member's own snapshot deltas (see _lib.deriveEvents) —
   never invented, and nothing identifying beyond the display name the member already shares on the board. */
const { CODE_RE, applyCors, sql, ensureSchema, sendJson, str, rateLimited, clientIp } = require('./_lib.js');

const READ_CAP_PER_MIN = 30;
const FEED_LIMIT = 40;

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'GET only' });

  const code = str((req.query && req.query.code) || '', 32);
  if (!CODE_RE.test(code || '')) return sendJson(res, 400, { ok: false, error: 'invalid crew code (3-32 letters, numbers, - or _)' });

  const s = sql();
  if (!s) return sendJson(res, 503, { ok: false, error: 'leaderboard not configured yet (no database attached)' });

  try {
    await ensureSchema(s);
    if (await rateLimited(s, 'feed:' + clientIp(req), READ_CAP_PER_MIN)) {
      return sendJson(res, 429, { ok: false, error: 'slow down — try again in a minute' });
    }
    const rows = await s`SELECT name, kind, text, created_at
                         FROM tbh_crew_events WHERE crew_code = ${code}
                         ORDER BY id DESC LIMIT ${FEED_LIMIT}`;
    return sendJson(res, 200, {
      ok: true,
      events: rows.map((r) => ({ name: r.name, kind: r.kind, text: r.text, t: r.created_at })),
    });
  } catch (e) {
    console.error('feed error', e);
    return sendJson(res, 500, { ok: false, error: 'database error' });
  }
};
