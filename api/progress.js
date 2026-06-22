'use strict';
/* POST /api/progress — an OPT-IN brag-stats push from a HUD client.
   Body: { code, member:{id,name}, stats:{...} } (see _lib.cleanStats for the full whitelist — nothing else
   is stored). Upserts the member's latest snapshot, keeps a short history, and derives the member's
   "latest achievement" from their own snapshot deltas. Returns { ok, achievement }. */
const { CODE_RE, applyCors, sql, ensureSchema, cleanStats, deriveEvents, sendJson, str, rateLimited, normName, canonMemberId } = require('./_lib.js');

const HISTORY_KEEP = 20;
const EVENTS_KEEP = 300;      // per-crew activity-feed cap (newest kept)
const PUSH_CAP_PER_MIN = 6;   // the client self-throttles to ~1/min; 6 leaves room for join/toggle bursts

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return sendJson(res, 400, { ok: false, error: 'invalid JSON body' });

  const code = str(body.code, 32);
  if (!CODE_RE.test(code || '')) return sendJson(res, 400, { ok: false, error: 'invalid crew code (3-32 letters, numbers, - or _)' });
  const memberId = str(body.member && body.member.id, 64);
  const name = str(body.member && body.member.name, 24);
  if (!memberId || !name) return sendJson(res, 400, { ok: false, error: 'member id and display name required' });
  const stats = cleanStats(body.stats);
  if (!stats) return sendJson(res, 400, { ok: false, error: 'stats payload required' });

  const s = sql();
  if (!s) return sendJson(res, 503, { ok: false, error: 'leaderboard not configured yet (no database attached)' });

  // v1.0.28: the SERVER owns identity. The stored id is a deterministic hash of the normalized display name
  // (canonMemberId), NOT whatever the client sent. This is what kills "the same friend appears several times":
  // a new PC / reinstall / old random-UUID build / a name re-typed with different case or spacing would each
  // mint a different client id and strand the old row. Now every such variant resolves to ONE canonical row,
  // and any pre-existing duplicates are folded into it the instant the real member pushes again ("got back in").
  const canonId = canonMemberId(name);

  try {
    await ensureSchema(s);
    // per-PERSON fixed-window rate limit (keyed by the canonical id so client id drift can't dodge it)
    if (await rateLimited(s, 'push:' + code + ':' + canonId, PUSH_CAP_PER_MIN)) {
      return sendJson(res, 429, { ok: false, error: 'slow down — try again in a minute' });
    }
    // ---- identity reconcile: collapse every row in this crew whose display name normalizes the same way ----
    const existing = await s`SELECT member_id, name, stats, achievement, updated_at FROM tbh_crew_members WHERE crew_code = ${code}`;
    const wantNorm = normName(name);
    const canonRow = existing.find((r) => r.member_id === canonId) || null;
    const dupes = existing.filter((r) => r.member_id !== canonId && normName(r.name) === wantNorm);   // legacy / drifted rows of this same person
    // milestone baseline = the FRESHEST snapshot we already hold for this person (canonical row OR any duplicate),
    // so folding never re-announces "Joined" or re-fires milestones the member already crossed.
    let prevRow = canonRow;
    for (const r of dupes) { if (!prevRow || new Date(r.updated_at) > new Date(prevRow.updated_at)) prevRow = r; }
    const prevStats = prevRow ? prevRow.stats : null;
    const prevAch = prevRow ? prevRow.achievement : null;
    // fold each duplicate's history + activity-feed entries onto the canonical id, then delete the duplicate member
    // row. Done per-id (a friends crew holds at most a handful) to avoid any array-parameter binding ambiguity.
    for (const r of dupes) {
      await s`UPDATE tbh_crew_history SET member_id = ${canonId} WHERE crew_code = ${code} AND member_id = ${r.member_id}`;
      await s`UPDATE tbh_crew_events  SET member_id = ${canonId} WHERE crew_code = ${code} AND member_id = ${r.member_id}`;
      await s`DELETE FROM tbh_crew_members WHERE crew_code = ${code} AND member_id = ${r.member_id}`;
    }

    const events = deriveEvents(prevStats, stats);                                  // all milestones crossed this push
    const achievement = events.length ? { t: new Date().toISOString(), text: events[0].text } : (prevAch || null);
    await s`INSERT INTO tbh_crew_members (crew_code, member_id, name, stats, achievement, updated_at)
            VALUES (${code}, ${canonId}, ${name}, ${JSON.stringify(stats)}::jsonb, ${achievement ? JSON.stringify(achievement) : null}::jsonb, now())
            ON CONFLICT (crew_code, member_id)
            DO UPDATE SET name = EXCLUDED.name, stats = EXCLUDED.stats, achievement = EXCLUDED.achievement, updated_at = now()`;
    await s`INSERT INTO tbh_crew_history (crew_code, member_id, stats) VALUES (${code}, ${canonId}, ${JSON.stringify(stats)}::jsonb)`;
    // keep the per-member history small — achievements/momentum only need the recent snapshots
    await s`DELETE FROM tbh_crew_history WHERE id IN (
              SELECT id FROM tbh_crew_history WHERE crew_code = ${code} AND member_id = ${canonId}
              ORDER BY id DESC OFFSET ${HISTORY_KEEP})`;
    // append the new milestones to the crew activity feed (skip the "Joined" event on a member's very first share
    // if they already had history rows — only a genuine first-ever share should announce a join)
    if (events.length && !(events.length === 1 && events[0].kind === 'join' && prevStats)) {
      for (const e of events) {
        await s`INSERT INTO tbh_crew_events (crew_code, member_id, name, kind, text) VALUES (${code}, ${canonId}, ${name}, ${e.kind}, ${e.text})`;
      }
      await s`DELETE FROM tbh_crew_events WHERE id IN (
                SELECT id FROM tbh_crew_events WHERE crew_code = ${code} ORDER BY id DESC OFFSET ${EVENTS_KEEP})`;
    }
    return sendJson(res, 200, { ok: true, achievement, events, id: canonId, merged: dupes.length });
  } catch (e) {
    console.error('progress error', e);
    return sendJson(res, 500, { ok: false, error: 'crew service temporarily unavailable' });
  }
};
