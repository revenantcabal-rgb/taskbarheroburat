'use strict';
/* Committed regression test for the save engine — guards the runePlan "save-for" data-honesty fix (a capped
   12-step plan must never label an AFFORDABLE rune as a save-for goal). */
const test = require('node:test');
const assert = require('node:assert');
const eng = require('../src/engine/saveEngine.js');
const gd = require('../src/engine/gamedata.min.json');
eng.setDB(gd);

test('runePlan: the "save-for" target is never already affordable (data-honesty invariant)', () => {
  const psd = { RuneSaveData: [] };   // nothing leveled yet → every next step is a fresh level-1 cost
  for (const budget of [0, 100, 50000, 1e7, 1e9]) {
    const rp = eng.runePlan(psd, budget);
    assert.ok(rp.spent <= budget, 'spent exceeded budget at ' + budget);
    assert.strictEqual(rp.spent + rp.remaining, budget, 'spent + remaining != budget at ' + budget);
    if (rp.cheapestNext) {
      assert.ok(rp.cheapestNext.cost > rp.remaining,
        'save-for is already affordable at budget ' + budget + ': cost ' + rp.cheapestNext.cost + ' <= remaining ' + rp.remaining);
    }
  }
});

test('runePlan: step costs sum exactly to spent and never exceed the budget', () => {
  const psd = { RuneSaveData: [] };
  const rp = eng.runePlan(psd, 250000);
  const sum = rp.steps.reduce((a, s) => a + s.cost, 0);
  assert.strictEqual(sum, rp.spent, 'step cost sum != spent');
  assert.ok(rp.steps.length <= 12, 'plan exceeded the 12-step cap');
});
