'use strict';
/* Committed test for the v1.0.28 empirical enchant gt->category calibration (gtGroupFromEnchants).
   Uses a synthetic game DB so it runs in CI with no real save. Proves: an applied enchant's rolled stat is
   matched to its stone's per-category fx entry, and the matching category is assigned to the gear type. */
const test = require('node:test');
const assert = require('node:assert');
const eng = require('../src/engine/saveEngine.js');

// minimal calibrated DB: one stone with the game's 3-category fx shape, plus gear of various types
eng.setDB({
  heroes: { '101': { mw: 'SWORD' } },   // SWORD is a main-weapon type -> WEAPON via the static baseline
  stats: {
    '900': { sn: 'Attack Damage', s: 'AttackDamage', m: 'ADDITIVE' },
    '901': { sn: 'Max HP', s: 'MaxHp', m: 'ADDITIVE' },
    '902': { sn: 'Physical Damage Percent', s: 'PhysicalDamagePercent', m: 'MULT' },
  },
  items: {
    '110001': { n: 'Minor Ruby', mat: true, fx: [
      { g: 'WEAPON', sn: 'Physical Damage Percent', t: 2 },
      { g: 'ARMOR', sn: 'Max HP', t: 1 },
      { g: 'ACCESSORY', sn: 'Attack Damage', t: 1 },
    ] },
    '500001': { n: 'Test Ring', g: 'LEGENDARY', gt: 'RING' },
    '500002': { n: 'Test Boots', g: 'RARE', gt: 'BOOTS' },
    '500003': { n: 'Test Sword', g: 'RARE', gt: 'SWORD' },
  },
});

test('gtGroupFromEnchants derives a RING category from an applied ACCESSORY-stat enchant', () => {
  const psd = { itemSaveDatas: [
    { ItemKey: '500001', UniqueId: 1, EnchantCount: [1, 0, 0], EnchantData: [{ StatModKey: '900', MaterialKey: '110001', StatType: 5, Value: 10, Tier: 1 }] },
  ] };
  const map = eng.gtGroupFromEnchants(psd);
  assert.strictEqual(map.RING, 'ACCESSORY', 'RING should resolve to the stone fx category whose stat matched the roll');
});

test('gtGroupFromEnchants derives BOOTS=ARMOR from a Max-HP roll and SWORD=WEAPON from a phys-dmg roll', () => {
  const psd = { itemSaveDatas: [
    { ItemKey: '500002', UniqueId: 2, EnchantCount: [1, 0, 0], EnchantData: [{ StatModKey: '901', MaterialKey: '110001' }] }, // Max HP -> ARMOR fx
    { ItemKey: '500003', UniqueId: 3, EnchantCount: [1, 0, 0], EnchantData: [{ StatModKey: '902', MaterialKey: '110001' }] }, // Phys Dmg % -> WEAPON fx
  ] };
  const map = eng.gtGroupFromEnchants(psd);
  assert.strictEqual(map.BOOTS, 'ARMOR');
  assert.strictEqual(map.SWORD, 'WEAPON');
});

test('the empirical map never contradicts the static gtGroup baseline (SWORD is WEAPON both ways)', () => {
  const psd = { itemSaveDatas: [
    { ItemKey: '500003', UniqueId: 3, EnchantCount: [1, 0, 0], EnchantData: [{ StatModKey: '902', MaterialKey: '110001' }] },
  ] };
  const map = eng.gtGroupFromEnchants(psd);
  assert.strictEqual(map.SWORD, eng.gtGroup('SWORD'), 'empirical and static disagree for a main-weapon type');
});

test('no enchants -> empty map (nothing claimed, asterisk stays — golden rule)', () => {
  assert.deepStrictEqual(eng.gtGroupFromEnchants({ itemSaveDatas: [] }), {});
  assert.deepStrictEqual(eng.gtGroupFromEnchants({}), {});
});
