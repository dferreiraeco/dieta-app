// Testes unitários para o gerador de cardápio e cálculos derivados.
// Run: node tests/generator.test.js
const path = require('path');
const { loadApp, TestHarness, assertEq, assertDeepEq, assertTrue } = require('./test-runner');

const app = loadApp(path.join(__dirname, '..', 'index.html'));
const h = new TestHarness();

// ============================================================
// INGREDIENT NEEDS — derivações das receitas
// ============================================================
h.describe('computeIngredientNeeds', () => {
  h.test('plano vazio retorna objeto vazio', () => {
    const needs = app.computeIngredientNeeds({}, {});
    assertEq(Object.keys(needs).length, 0);
  });

  h.test('2× Marmita A → 430g frango + 112g arroz branco + 80g alface + 160g pepino', () => {
    const needs = app.computeIngredientNeeds({ A: 2 }, {});
    assertEq(needs.frango, 430, 'frango');
    assertEq(needs.arroz_branco, 112, 'arroz_branco');
    assertEq(needs.alface, 80, 'alface');
    assertEq(needs.pepino, 160, 'pepino');
  });

  h.test('frango acumula entre marmita A e jantares T/S/W', () => {
    const needs = app.computeIngredientNeeds({ A: 1 }, { T: 1, S: 1, W: 1 });
    // 215 (A) + 175 (T) + 134 (S) + 134 (W) = 658
    assertEq(needs.frango, 658);
  });

  h.test('ovos acumula entre Omelete e Torrada de Atum', () => {
    const needs = app.computeIngredientNeeds({}, { O: 2, A: 3 });
    // O=3 ovos/un, A=2 ovos/un → 2*3 + 3*2 = 12
    assertEq(needs.ovos, 12);
  });

  h.test('atum_lata em unidades (lata), não gramas', () => {
    const needs = app.computeIngredientNeeds({}, { A: 3 });
    assertEq(needs.atum_lata, 3);
  });

  h.test('tortilla em unidades (2 por Wrap)', () => {
    const needs = app.computeIngredientNeeds({}, { W: 4 });
    assertEq(needs.tortilla, 8);
  });

  h.test('pao_integral acumula café (baseline) + jantares (via shopping list)', () => {
    // Baseline é separado; computeIngredientNeeds só calcula das receitas
    const needs = app.computeIngredientNeeds({}, { O: 1, A: 1, S: 1 });
    // O=2, A=2, S=3 → 7 fatias
    assertEq(needs.pao_integral, 7);
  });
});

// ============================================================
// MODE: MARMITA — só gera marmitas, ignora ingredientes de jantar
// ============================================================
h.describe('computeMenuFromStock — mode=marmita', () => {
  h.test('600g frango em mode=marmita → 2 Marmita A', () => {
    const r = app.computeMenuFromStock({ frango: 600 }, 'marmita');
    assertEq(r.marmitaResult.A, 2);
    assertEq(r.dinnerResult.S, 0);
    assertEq(r.dinnerResult.T, 0);
  });

  h.test('ingredientes de jantar são ignorados em mode=marmita', () => {
    const r = app.computeMenuFromStock({ atum_lata: 5, peito_peru: 200, alcatra: 500 }, 'marmita');
    assertEq(r.dinnerResult.A, 0);
    assertEq(r.dinnerResult.O, 0);
    assertEq(r.dinnerResult.C, 0);
  });

  h.test('múltiplas proteínas de marmita → várias marmitas', () => {
    const r = app.computeMenuFromStock({ frango: 430, carne_moida: 460, tilapia: 500 }, 'marmita');
    assertEq(r.marmitaResult.A, 2, 'A (frango)');
    assertEq(r.marmitaResult.B, 2, 'B (carne moída)');
    assertEq(r.marmitaResult.C, 2, 'C (tilápia)');
  });
});

// ============================================================
// MODE: DINNER — só gera jantares
// ============================================================
h.describe('computeMenuFromStock — mode=dinner', () => {
  h.test('carne moída ignorada em mode=dinner (proteína exclusiva de marmita)', () => {
    const r = app.computeMenuFromStock({ carne_moida: 1000 }, 'dinner');
    assertEq(r.marmitaResult.B, 0);
  });

  h.test('frango vira Sanduíche (dinnerAlt) em mode=dinner sem tortilla/goma', () => {
    const r = app.computeMenuFromStock({ frango: 600 }, 'dinner');
    // 600/134 = 4 sanduíches
    assertEq(r.dinnerResult.S, 4);
    assertEq(r.marmitaResult.A, 0);
  });

  h.test('padrão 2:1:1 com frango + tortilla + goma', () => {
    // 1000g frango, 10 tortillas, 500g goma → 4S + 2W + 1T (ver simulação anterior)
    const r = app.computeMenuFromStock({ frango: 1000, tortilla: 10, goma_tapioca: 500 }, 'dinner');
    assertEq(r.dinnerResult.S, 4, 'Sanduíches');
    assertEq(r.dinnerResult.W, 2, 'Wraps');
    assertEq(r.dinnerResult.T, 1, 'Tapiocas');
  });

  h.test('só goma → S + T (sem Wraps)', () => {
    // 577g frango + 500g goma → 2S + 1T (ciclo parcial: SSWT, W pula sem tortilla)
    const r = app.computeMenuFromStock({ frango: 577, goma_tapioca: 500 }, 'dinner');
    assertEq(r.dinnerResult.W, 0);
    assertTrue(r.dinnerResult.S >= 2 && r.dinnerResult.T >= 1);
  });

  h.test('só tortilla → S + W (sem Tapiocas)', () => {
    // 402g frango + 10 tortilla → 2S + 1W
    const r = app.computeMenuFromStock({ frango: 402, tortilla: 10 }, 'dinner');
    assertEq(r.dinnerResult.S, 2);
    assertEq(r.dinnerResult.W, 1);
    assertEq(r.dinnerResult.T, 0);
  });

  h.test('atum → Torrada de Atum (dinner A)', () => {
    // 5 latas + 10 ovos (suficiente) → pattern 2O+1A... mas sem ovos o loop quebra
    // Com só atum (sem ovos), fallback gera 5 torradas extras
    const r = app.computeMenuFromStock({ atum_lata: 5 }, 'dinner');
    assertEq(r.dinnerResult.A, 5);
    assertEq(r.dinnerResult.O, 0);
  });

  h.test('peito_peru → Omelete (dinner O) — peru não é restrição', () => {
    // 200g peru + 9 ovos → 3 Omeletes (9/3)
    const r = app.computeMenuFromStock({ peito_peru: 200, ovos: 9 }, 'dinner');
    assertEq(r.dinnerResult.O, 3);
  });

  h.test('alcatra → Carne com Arroz (dinner C)', () => {
    const r = app.computeMenuFromStock({ alcatra: 525 }, 'dinner'); // 525/175 = 3
    assertEq(r.dinnerResult.C, 3);
  });
});

// ============================================================
// EGG PATTERN 2:1 — Omelete/Torrada com ovos
// ============================================================
h.describe('padrão 2:1 ovos (Omelete/Torrada)', () => {
  h.test('10 ovos + 2 atum → 2O + 2T (ciclo completo + sobra)', () => {
    const r = app.computeMenuFromStock({ ovos: 10, atum_lata: 2 }, 'dinner');
    assertEq(r.dinnerResult.O, 2);
    assertEq(r.dinnerResult.A, 2);
  });

  h.test('15 ovos + 3 atum → 4O + 3T', () => {
    const r = app.computeMenuFromStock({ ovos: 15, atum_lata: 3 }, 'dinner');
    assertEq(r.dinnerResult.O, 4);
    assertEq(r.dinnerResult.A, 3);
  });

  h.test('sem atum → só omeletes (ovos / 3)', () => {
    const r = app.computeMenuFromStock({ ovos: 12 }, 'dinner');
    assertEq(r.dinnerResult.O, 4);
    assertEq(r.dinnerResult.A, 0);
  });

  h.test('sem ovos mas com atum → só torradas (ovos vão pra compras)', () => {
    const r = app.computeMenuFromStock({ atum_lata: 4 }, 'dinner');
    assertEq(r.dinnerResult.O, 0);
    assertEq(r.dinnerResult.A, 4);
  });

  h.test('atum sobrando após ovos esgotarem → torradas extras', () => {
    // 6 ovos + 5 atum → 2O (uses 6 eggs) + then leftover atum=5 → 5T
    const r = app.computeMenuFromStock({ ovos: 6, atum_lata: 5 }, 'dinner');
    assertEq(r.dinnerResult.O, 2);
    assertEq(r.dinnerResult.A, 5);
  });
});

// ============================================================
// MODE: BOTH — sequencial alternado
// ============================================================
h.describe('computeMenuFromStock — mode=both', () => {
  h.test('600g frango em mode=both → 2 Marmita A + 1 Sanduíche', () => {
    const r = app.computeMenuFromStock({ frango: 600 }, 'both');
    assertEq(r.marmitaResult.A, 2);
    assertEq(r.dinnerResult.S, 1);
  });

  h.test('1000g frango + tortilla + goma em both → mix alternado', () => {
    const r = app.computeMenuFromStock({ frango: 1000, tortilla: 10, goma_tapioca: 500 }, 'both');
    const totalM = r.marmitaResult.A;
    const totalD = r.dinnerResult.S + r.dinnerResult.W + r.dinnerResult.T;
    assertTrue(totalM > 0 && totalD > 0, 'deve gerar ambos');
    // Consumo total de frango não deve exceder 1000g
    const gUsed = totalM * 215 + r.dinnerResult.S * 134 + r.dinnerResult.W * 134 + r.dinnerResult.T * 175;
    assertTrue(gUsed <= 1000, `consumo ${gUsed}g <= 1000g`);
  });
});

// ============================================================
// MODE=MARMITA com proteína exclusiva
// ============================================================
h.describe('proteínas marmita exclusivas', () => {
  h.test('tilápia só gera Marmita C', () => {
    const r = app.computeMenuFromStock({ tilapia: 750 }, 'marmita');
    assertEq(r.marmitaResult.C, 3); // 750/250 = 3
  });

  h.test('sobrecoxa só gera Marmita E', () => {
    const r = app.computeMenuFromStock({ sobrecoxa: 480 }, 'marmita');
    assertEq(r.marmitaResult.E, 2); // 480/240 = 2
  });

  h.test('coxao_mole só gera Marmita F', () => {
    const r = app.computeMenuFromStock({ coxao_mole: 645 }, 'marmita');
    assertEq(r.marmitaResult.F, 3); // 645/215 = 3
  });
});

// ============================================================
// FRUIT BUDGET — carb-weighted
// ============================================================
h.describe('orçamento de frutas (FRUIT_WEEKLY_CARB_NEED)', () => {
  h.test('constante bate com 42 × avg de carbs', () => {
    const avg = app.FRUIT_AVG_CARB;
    const expected = Math.round(42 * avg);
    assertEq(app.FRUIT_WEEKLY_CARB_NEED, expected);
  });

  h.test('avg carbs ≈ 16.2g', () => {
    assertTrue(Math.abs(app.FRUIT_AVG_CARB - 16.2) < 0.1);
  });
});

// ============================================================
// GEN_* DERIVATIONS
// ============================================================
h.describe('GEN_* derivações', () => {
  h.test('GEN_PROTEINS tem as 6 marmitas', () => {
    assertEq(app.GEN_PROTEINS.length, 6);
  });

  h.test('GEN_PROTEINS[frango].dinnerAlt = S (menor raw)', () => {
    const frango = app.GEN_PROTEINS.find(p => p.key === 'frango');
    assertEq(frango.dinnerAlt, 'S');
    assertEq(frango.dinnerRawPerUnit, 134);
  });

  h.test('GEN_DINNER_PROTEINS tem atum, alcatra, peru', () => {
    const keys = app.GEN_DINNER_PROTEINS.map(p => p.key).sort();
    assertDeepEq(keys, ['alcatra', 'atum_lata', 'peito_peru']);
  });

  h.test('GEN_SHARED_DINNER_PROTEINS tem ovos com hint dinâmico', () => {
    assertEq(app.GEN_SHARED_DINNER_PROTEINS.length, 1);
    const ovos = app.GEN_SHARED_DINNER_PROTEINS[0];
    assertEq(ovos.key, 'ovos');
    assertTrue(ovos.sharedHint.includes('Omelete'));
    assertTrue(ovos.sharedHint.includes('Torrada'));
  });

  h.test('GEN_DINNER_OTHERS não duplica itens de GEN_CARBS', () => {
    const carbKeys = new Set(app.GEN_CARBS.map(c => c.key));
    const dups = app.GEN_DINNER_OTHERS.filter(o => carbKeys.has(o.key));
    assertEq(dups.length, 0);
  });
});

// ============================================================
// AROMATICS
// ============================================================
h.describe('computeAromatics', () => {
  h.test('2 Marmita A (yield=2) → alho 3 dentes, cebola 0.5', () => {
    const a = app.computeAromatics({ A: 2 }, {});
    assertEq(a.alho, 3);
    assertEq(a.cebola, 0.5);
    assertEq(a.limao, 0.5);
  });

  h.test('3 Marmita A (yield=2) → 4.5 dentes alho (1.5x)', () => {
    const a = app.computeAromatics({ A: 3 }, {});
    assertEq(a.alho, 4.5);
  });

  h.test('plano vazio → zeros', () => {
    const a = app.computeAromatics({}, {});
    assertEq(a.alho, 0);
    assertEq(a.cebola, 0);
    assertEq(a.limao, 0);
  });
});

// ============================================================
// Summary
// ============================================================
process.exit(h.summary());
