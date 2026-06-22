// @ts-check
/* RENDERER E2E — loads the real dashboard.html in demo mode and exercises every tab + the known
   regression hotspots (i18n restore, the Farming penalty column). This is the safety net the UI never had:
   the engine has unit tests, but the 5,800-line renderer was only ever verified by hand. */
import { test, expect } from '@playwright/test';

const TABS = ['overview', 'live', 'party', 'inventory', 'loot', 'runes', 'advisor',
  'farming', 'lifetime', 'trends', 'crew', 'atlas', 'codex'];

/** collect console errors + uncaught page errors for a page (favicon 404 is benign and filtered) */
function trackErrors(page) {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => { errs.push('pageerror: ' + e.message); });
  return { list: () => errs.filter((e) => !/favicon|net::ERR.*favicon/i.test(e)) };
}

async function loadDemo(page) {
  await page.goto('/dashboard.html?demo');
  await page.waitForFunction(() => typeof window.setTab === 'function', null, { timeout: 15000 });
  await page.waitForFunction(() => window.current != null, null, { timeout: 15000 }); // demo save decrypted + loaded
}

test('demo dashboard loads cleanly (no console errors, Overview populated)', async ({ page }) => {
  const errs = trackErrors(page);
  await loadDemo(page);
  await expect(page.locator('#tab-overview')).not.toBeEmpty();
  expect(errs.list(), errs.list().join('\n')).toEqual([]);
});

test('every tab renders content with zero console errors', async ({ page }) => {
  const errs = trackErrors(page);
  await loadDemo(page);
  for (const t of TABS) {
    await page.evaluate((name) => window.setTab(name), t);
    const txt = (await page.locator('#tab-' + t).innerText()).trim();
    expect(txt.length, `tab "${t}" rendered empty`).toBeGreaterThan(10);
  }
  expect(errs.list(), errs.list().join('\n')).toEqual([]);
});

test('Farming tab applies the level-penalty (EXP kept column + near-level top stage)', async ({ page }) => {
  const errs = trackErrors(page);
  await loadDemo(page);
  await page.evaluate(() => {
    window.setTab('farming');
    window.farmState.mode = 'manual'; window.farmState.metric = 'exp';
    window.farmState.hero = '85'; window.farmState.expPct = '190';
    window.farmState.cal = [{ stage: '1101', min: '0', sec: '8' }, { stage: '2305', min: '2', sec: '0' }];
    window.renderFarming(window.current);
  });
  // the new penalty column must exist
  await expect(page.locator('#tab-farming')).toContainText('EXP kept');
  // the #1 EXP stage for a level-85 hero must keep a high % (a near-level stage), proving the penalty ranks correctly
  const firstRowKept = await page.locator('#tab-farming table.farmtbl tbody tr').first().locator('td').last().innerText();
  const pct = parseInt(firstRowKept.replace('%', ''), 10);
  expect(pct, 'top EXP stage should be near-level (high kept%)').toBeGreaterThanOrEqual(80);
  expect(errs.list(), errs.list().join('\n')).toEqual([]);
});

test('language toggle EN -> 中文 -> EN restores English chrome (guards the v1.0.23 i18n-restore bug)', async ({ page }) => {
  await loadDemo(page);
  const hasSetLang = await page.evaluate(() => typeof window.setLang === 'function');
  test.skip(!hasSetLang, 'setLang not exposed');
  await page.evaluate(() => window.setTab('overview'));
  await page.evaluate(() => window.setLang('zh'));
  // header/nav should now contain Chinese
  await expect(page.locator('body')).toContainText('总览'); // "Overview" in zh
  await page.evaluate(() => window.setLang('en'));
  // and revert fully — the bug was Chinese chrome surviving the switch back
  await expect(page.locator('body')).toContainText(/Overview/);
  await expect(page.locator('body')).not.toContainText('总览');
});

test('Live tab derives a Damage rate + Avg clear from a measured kill pace (ban-safe, no memory read)', async ({ page }) => {
  await loadDemo(page);
  // the demo carries no session kill-pace by default, so the derived-metric code path is otherwise dormant —
  // fabricate a measured pace, exactly as it exists after a minute of real play, and confirm the cards render.
  await page.evaluate(() => {
    window.session = {
      t0: Date.now() - 600000,
      earned0: (window.current.lifeGold != null ? window.current.lifeGold : window.current.gold) - 1000,
      kills0: (window.current.kills || 0) - 500,
    };
    window.setTab('live'); window.renderLive(window.current);
  });
  await expect(page.locator('#tab-live')).toContainText('Damage rate');
  await expect(page.locator('#tab-live')).toContainText('Avg clear');
  await expect(page.locator('#tab-live')).toContainText(/not a memory read/i); // it must stay honestly labelled
});

test('marketable items get a ban-safe Steam Market link (a plain anchor, never a fetch)', async ({ page }) => {
  await loadDemo(page);
  const href = await page.evaluate(() => {
    const cat = (typeof window.buildCatalog === 'function') ? window.buildCatalog() : [];
    const mk = cat.filter((e) => e.mkt && e.name)[0];
    if (!mk) return null;
    window.openCodexDetail(mk, false);
    const a = document.querySelector('.cxmodal a[href*="steamcommunity.com/market"]');
    const out = a ? a.getAttribute('href') : null;
    if (typeof window.closeCodexDetail === 'function') window.closeCodexDetail();
    return out;
  });
  expect(href, 'a Steam Market link should render on a marketable item').toContain('steamcommunity.com/market');
  expect(href).toContain('appid=3678970');
});
