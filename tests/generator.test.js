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
// calculateAge
// ============================================================
h.describe('calculateAge', () => {
  const today = new Date('2026-04-13T12:00:00');

  h.test('birth string inválida → null', () => {
    assertEq(app.calculateAge(null, today), null);
    assertEq(app.calculateAge('', today), null);
    assertEq(app.calculateAge('nao-e-data', today), null);
  });

  h.test('aniversário já passou este ano', () => {
    assertEq(app.calculateAge('1990-01-10', today), 36);
  });

  h.test('aniversário ainda não chegou este ano', () => {
    assertEq(app.calculateAge('1990-06-15', today), 35);
  });

  h.test('exatamente no dia do aniversário', () => {
    assertEq(app.calculateAge('1990-04-13', today), 36);
  });

  h.test('um dia antes do aniversário', () => {
    assertEq(app.calculateAge('1990-04-14', today), 35);
  });
});

// ============================================================
// computeGoals — Mifflin-St Jeor + atividade + direção da meta
// ============================================================
h.describe('computeGoals', () => {
  const today = new Date('2026-04-13T12:00:00');

  h.test('perfil nulo → null', () => {
    assertEq(app.computeGoals(null, today), null);
    assertEq(app.computeGoals(undefined, today), null);
  });

  h.test('perfil sem peso/altura/meta → null', () => {
    assertEq(app.computeGoals({ sexo: 'M', data_nascimento: '1990-01-01' }, today), null);
    assertEq(app.computeGoals({ sexo: 'M', peso_atual: 80, data_nascimento: '1990-01-01' }, today), null);
  });

  h.test('data de nascimento inválida → null', () => {
    const p = { sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 75, data_nascimento: 'xxx' };
    assertEq(app.computeGoals(p, today), null);
  });

  h.test('homem 80kg 180cm 30a rotina, perda (meta 75kg)', () => {
    // BMR = 1780, TDEE = 2759, −500 = 2259, round ↓100 = 2200
    // p = 160 | g = 72 | c = (2200 − 640 − 648)/4 = 228
    const g = app.computeGoals({
      sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 75,
      data_nascimento: '1996-04-13', nivel_atividade: 'rotina',
    }, today);
    assertEq(g.kcal, 2200, 'kcal');
    assertEq(g.p, 160, 'p');
    assertEq(g.g, 72, 'g');
    assertEq(g.c, 228, 'c');
  });

  h.test('mulher 60kg 165cm 25a sentado, manutenção (meta 60)', () => {
    // BMR = 1345.25, TDEE = 1614.3, round ↓100 = 1600
    // p = 120 | g = 54 | c = (1600 − 480 − 486)/4 = 158.5 → 159
    const g = app.computeGoals({
      sexo: 'F', peso_atual: 60, altura_cm: 165, meta_peso: 60,
      data_nascimento: '2001-04-13', nivel_atividade: 'sentado',
    }, today);
    assertEq(g.kcal, 1600, 'kcal');
    assertEq(g.p, 120, 'p');
    assertEq(g.g, 54, 'g');
    assertEq(g.c, 159, 'c');
  });

  h.test('homem 70kg 175cm 35a intenso, ganho (meta 75)', () => {
    // BMR = 1623.75, TDEE = 2800.97, +300 = 3101, round ↓100 = 3100
    // p = 140 | g = 63 | c = (3100 − 560 − 567)/4 = 493.25 → 493
    const g = app.computeGoals({
      sexo: 'M', peso_atual: 70, altura_cm: 175, meta_peso: 75,
      data_nascimento: '1991-04-13', nivel_atividade: 'intenso',
    }, today);
    assertEq(g.kcal, 3100, 'kcal');
    assertEq(g.p, 140, 'p');
    assertEq(g.g, 63, 'g');
    assertEq(g.c, 493, 'c');
  });

  h.test('piso de 1200 kcal aplica em perda agressiva', () => {
    // Mulher 50kg 160cm 50a sentado, meta 45 → TDEE·1.2 − 500 < 1200
    // BMR = 500 + 1000 − 250 − 161 = 1089; TDEE = 1306.8; −500 = 806.8 → piso 1200
    const g = app.computeGoals({
      sexo: 'F', peso_atual: 50, altura_cm: 160, meta_peso: 45,
      data_nascimento: '1976-04-13', nivel_atividade: 'sentado',
    }, today);
    assertEq(g.kcal, 1200, 'kcal com piso');
  });

  h.test('sexo "O" usa média (constante −78)', () => {
    // BMR = 1565.75, TDEE = 1878.9, round ↓100 = 1800
    const g = app.computeGoals({
      sexo: 'O', peso_atual: 70, altura_cm: 175, meta_peso: 70,
      data_nascimento: '1996-04-13', nivel_atividade: 'sentado',
    }, today);
    assertEq(g.kcal, 1800, 'kcal');
  });

  h.test('nivel_atividade desconhecido cai em sentado (1.2)', () => {
    // Default fallback é "sentado" (1.2). Mesma aritmética do teste anterior.
    const g = app.computeGoals({
      sexo: 'O', peso_atual: 70, altura_cm: 175, meta_peso: 70,
      data_nascimento: '1996-04-13', nivel_atividade: 'tabajara',
    }, today);
    assertEq(g.kcal, 1800);
  });

  h.test('zona de manutenção ±0,5 kg', () => {
    const base = {
      sexo: 'M', peso_atual: 80, altura_cm: 180,
      data_nascimento: '1996-04-13', nivel_atividade: 'rotina',
    };
    // TDEE = 2759 → round ↓100 = 2700 (manutenção)
    const maint = app.computeGoals({ ...base, meta_peso: 79.5 }, today);
    assertEq(maint.kcal, 2700);
    // delta = −0.6 → perda (2759−500=2259 → 2200)
    const loss = app.computeGoals({ ...base, meta_peso: 79.4 }, today);
    assertEq(loss.kcal, 2200);
    // delta = +0.5 → manutenção (2700)
    const maint2 = app.computeGoals({ ...base, meta_peso: 80.5 }, today);
    assertEq(maint2.kcal, 2700);
    // delta = +0.6 → ganho (2759+300=3059 → 3000)
    const gain = app.computeGoals({ ...base, meta_peso: 80.6 }, today);
    assertEq(gain.kcal, 3000);
  });

  h.test('DEFAULT_GOALS tem o formato esperado', () => {
    assertTrue(typeof app.DEFAULT_GOALS.kcal === 'number');
    assertTrue(typeof app.DEFAULT_GOALS.p === 'number');
    assertTrue(typeof app.DEFAULT_GOALS.c === 'number');
    assertTrue(typeof app.DEFAULT_GOALS.g === 'number');
    assertTrue(typeof app.DEFAULT_GOALS.fiber === 'number');
    assertTrue(typeof app.DEFAULT_GOALS.water_ml === 'number');
  });

  // --- v2.0.3: fibra calorie-adjusted + água body-weight-adjusted ---
  h.test('fibra = max(25, 14 × kcal/1000)', () => {
    // Diego agressivo (v2.1.2): kcal 2200 → 14 × 2.2 = 30.8 → round = 31
    const diego = app.computeGoals({
      sexo: 'M', peso_atual: 118.3, altura_cm: 182, meta_peso: 90,
      data_nascimento: '1990-01-01', nivel_atividade: 'rotina',
      body_fat_pct: 33.5, deficit_intensity: 'agressivo',
    }, today);
    assertEq(diego.fiber, 31, 'Diego 2200 kcal → 31g fiber');

    // Pequeno em déficit: kcal 1200 (piso) → 14 × 1.2 = 16.8 → piso 25g
    const pequeno = app.computeGoals({
      sexo: 'F', peso_atual: 50, altura_cm: 160, meta_peso: 45,
      data_nascimento: '1976-04-13', nivel_atividade: 'sentado',
    }, today);
    assertEq(pequeno.fiber, 25, 'piso 25g quando 14×kcal/1000 < 25');

    // Muito ativo: 80 kg intenso (H-B 1.725), ganho → target 3300 (rounded) → fiber 46
    const ativo = app.computeGoals({
      sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 85,
      data_nascimento: '1996-04-13', nivel_atividade: 'intenso',
    }, today);
    // BMR=1780, TDEE=3070.5, gain=+300=3370.5 → 3371 → round ↓100 = 3300 → fiber=max(25, 46.2)=46
    assertEq(ativo.fiber, 46, 'target 3300 kcal → 46g fiber');
  });

  h.test('água = ACTIVITY_WATER_ML_PER_KG[atividade] × peso', () => {
    // Diego 118.3kg rotina → 40 ml/kg → 118.3·40 = 4732
    const diego = app.computeGoals({
      sexo: 'M', peso_atual: 118.3, altura_cm: 182, meta_peso: 90,
      data_nascimento: '1990-01-01', nivel_atividade: 'rotina',
      body_fat_pct: 33.5, deficit_intensity: 'agressivo',
    }, today);
    assertEq(diego.water_ml, 4732, 'Diego rotina → 4732 ml');

    // Mulher 60kg leve → 37 ml/kg → 60·37 = 2220
    const f60 = app.computeGoals({
      sexo: 'F', peso_atual: 60, altura_cm: 165, meta_peso: 60,
      data_nascimento: '2001-04-13', nivel_atividade: 'leve',
    }, today);
    assertEq(f60.water_ml, 2220, 'F 60kg leve → 2220 ml');

    // Atleta 80kg → 50 ml/kg → 80·50 = 4000
    const at = app.computeGoals({
      sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 80,
      data_nascimento: '1996-04-13', nivel_atividade: 'atleta',
    }, today);
    assertEq(at.water_ml, 4000, 'atleta 80kg → 4000 ml');

    // Sedentário 70kg → 35 ml/kg → 70·35 = 2450
    const sed = app.computeGoals({
      sexo: 'M', peso_atual: 70, altura_cm: 175, meta_peso: 70,
      data_nascimento: '1991-04-13', nivel_atividade: 'sentado',
    }, today);
    assertEq(sed.water_ml, 2450, 'sentado 70kg → 2450 ml');
  });

  h.test('ACTIVITY_WATER_ML_PER_KG tem todas as 5 chaves', () => {
    assertEq(app.ACTIVITY_WATER_ML_PER_KG.sentado, 35);
    assertEq(app.ACTIVITY_WATER_ML_PER_KG.leve,    37);
    assertEq(app.ACTIVITY_WATER_ML_PER_KG.rotina,  40);
    assertEq(app.ACTIVITY_WATER_ML_PER_KG.intenso, 45);
    assertEq(app.ACTIVITY_WATER_ML_PER_KG.atleta,  50);
  });

  // --- deficit_intensity: percentual de déficit configurável ---
  // Base: homem 80kg 180cm 30a rotina, perda (meta 75kg)
  // BMR = 1780 | TDEE = 2759 (rotina H-B = 1.55)
  const base = {
    sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 75,
    data_nascimento: '1996-04-13', nivel_atividade: 'rotina',
  };

  h.test('deficit_intensity=suave aplica 15% sobre TDEE', () => {
    // 2759 × 0.85 = 2345 → round ↓100 = 2300
    const g = app.computeGoals({ ...base, deficit_intensity: 'suave' }, today);
    assertEq(g.kcal, 2300);
  });

  h.test('deficit_intensity=moderado aplica 20% sobre TDEE', () => {
    // 2759 × 0.80 = 2207 → round ↓100 = 2200
    const g = app.computeGoals({ ...base, deficit_intensity: 'moderado' }, today);
    assertEq(g.kcal, 2200);
  });

  h.test('deficit_intensity=agressivo aplica 30% sobre TDEE', () => {
    // 2759 × 0.70 = 1931 → round ↓100 = 1900
    const g = app.computeGoals({ ...base, deficit_intensity: 'agressivo' }, today);
    assertEq(g.kcal, 1900);
  });

  h.test('deficit_intensity=extremo aplica 40% sobre TDEE', () => {
    // 2759 × 0.60 = 1655 → round ↓100 = 1600 (teto superior Longland 2016)
    const g = app.computeGoals({ ...base, deficit_intensity: 'extremo' }, today);
    assertEq(g.kcal, 1600);
  });

  h.test('deficit_intensity inválido cai no legado 500 kcal fixo', () => {
    // 2759 − 500 = 2259 → round ↓100 = 2200
    const g = app.computeGoals({ ...base, deficit_intensity: 'tabajara' }, today);
    assertEq(g.kcal, 2200);
  });

  h.test('deficit_intensity ausente cai no legado 500 kcal fixo', () => {
    const g = app.computeGoals(base, today);
    assertEq(g.kcal, 2200);
  });

  h.test('deficit_intensity é ignorado em manutenção', () => {
    // Meta 80 → manutenção, kcal = TDEE 2759 → 2700
    const g = app.computeGoals({ ...base, meta_peso: 80, deficit_intensity: 'agressivo' }, today);
    assertEq(g.kcal, 2700);
  });

  h.test('deficit_intensity é ignorado em ganho', () => {
    // Meta 85 → ganho, 2759+300=3059 → 3000
    const g = app.computeGoals({ ...base, meta_peso: 85, deficit_intensity: 'agressivo' }, today);
    assertEq(g.kcal, 3000);
  });

  h.test('Diego real Mifflin+rotina (118.3kg 182cm 36a, perda) — agressivo = 2300 kcal', () => {
    // Mifflin: BMR = 2145.5, TDEE = 3325.525 (rotina 1.55)
    // 30% = 2327.87 → 2328 → round ↓100 = 2300
    const g = app.computeGoals({
      sexo: 'M', peso_atual: 118.3, altura_cm: 182, meta_peso: 90,
      data_nascimento: '1990-01-01', nivel_atividade: 'rotina',
      deficit_intensity: 'agressivo',
    }, today);
    assertEq(g.kcal, 2300);
  });

  // --- v2.0.4: surplus percentual configurável (análogo ao deficit) ---
  // Base pra surplus: homem 80kg 180cm 30a intenso, ganho (meta 85)
  // BMR = 1780, TDEE = 1780·1.725 = 3070.5 (intenso H-B = muito ativo)
  const surplusBase = {
    sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 85,
    data_nascimento: '1996-04-13', nivel_atividade: 'intenso',
  };

  h.test('surplus_intensity=lento aplica 10% sobre TDEE em ganho', () => {
    // 3070.5 · 1.10 = 3377.55 → 3378 → round ↓100 = 3300
    const g = app.computeGoals({ ...surplusBase, surplus_intensity: 'lento' }, today);
    assertEq(g.kcal, 3300);
  });

  h.test('surplus_intensity=moderado aplica 15% sobre TDEE', () => {
    // 3070.5 · 1.15 = 3531 → round ↓100 = 3500
    const g = app.computeGoals({ ...surplusBase, surplus_intensity: 'moderado' }, today);
    assertEq(g.kcal, 3500);
  });

  h.test('surplus_intensity=agressivo aplica 20% sobre TDEE', () => {
    // 3070.5 · 1.20 = 3684.6 → 3685 → round ↓100 = 3600
    const g = app.computeGoals({ ...surplusBase, surplus_intensity: 'agressivo' }, today);
    assertEq(g.kcal, 3600);
  });

  h.test('surplus_intensity ausente cai no legado +300 fixo', () => {
    // 3070.5 + 300 = 3370.5 → 3371 → round ↓100 = 3300
    const g = app.computeGoals(surplusBase, today);
    assertEq(g.kcal, 3300);
  });

  h.test('surplus_intensity é ignorado em manutenção e perda', () => {
    // Manutenção: 3070.5 → 3071 → round ↓100 = 3000
    const maint = app.computeGoals({
      ...surplusBase, meta_peso: 80, surplus_intensity: 'agressivo',
    }, today);
    assertEq(maint.kcal, 3000, 'manutenção: TDEE arredondado');

    // Perda: 3070.5 − 500 = 2570.5 → 2571 → round ↓100 = 2500
    const loss = app.computeGoals({
      ...surplusBase, meta_peso: 75, surplus_intensity: 'agressivo',
    }, today);
    assertEq(loss.kcal, 2500, 'perda: (TDEE − 500) arredondado');
  });

  // --- v2.0.4: perMealP (meta de proteína por refeição) ---
  h.test('perMealP = round(0.4 × macroBase) — base LBM quando BF%', () => {
    // Diego: LBM = 78.67, 0.4 × 78.67 = 31.47 → round = 31
    const diego = app.computeGoals({
      sexo: 'M', peso_atual: 118.3, altura_cm: 182, meta_peso: 90,
      data_nascimento: '1990-01-01', nivel_atividade: 'rotina',
      body_fat_pct: 33.5, deficit_intensity: 'agressivo',
    }, today);
    assertEq(diego.perMealP, 31);
  });

  h.test('perMealP = round(0.4 × peso_total) — sem BF%', () => {
    // 80 kg sem BF% → 0.4 × 80 = 32
    const p80 = app.computeGoals({
      sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 80,
      data_nascimento: '1996-04-13', nivel_atividade: 'leve',
    }, today);
    assertEq(p80.perMealP, 32);
  });

  // --- v2.0.5: _details pra UI de transparência ---
  h.test('_details preenchido com Katch-McArdle quando BF% presente', () => {
    const g = app.computeGoals({
      sexo: 'M', peso_atual: 118.3, altura_cm: 182, meta_peso: 90,
      data_nascimento: '1990-01-01', nivel_atividade: 'rotina',
      body_fat_pct: 33.5, deficit_intensity: 'agressivo',
    }, today);
    const d = g._details;
    assertEq(d.bmrFormula, 'Katch-McArdle');
    assertEq(d.bmr, 2069);
    assertEq(d.tdee, 3207);            // H-B rotina 1.55: 2069.26 · 1.55 = 3207.35
    assertEq(d.lbm, 78.7);
    assertEq(d.bf_pct, 33.5);
    assertEq(d.macroBaseLabel, 'LBM');
    assertEq(d.macroBase, 78.7);
    assertEq(d.activityKey, 'rotina');
    assertEq(d.activityMult, 1.55);    // H-B clássico (v2.0.7)
    assertEq(d.direction, 'loss');
    assertEq(d.deficitPct, 0.30);
    assertEq(d.surplusPct, null);
    assertEq(d.waterPerKg, 40);
  });

  h.test('_details preenchido com Mifflin-St Jeor quando BF% ausente', () => {
    const g = app.computeGoals({
      sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 80,
      data_nascimento: '1996-04-13', nivel_atividade: 'leve',
    }, today);
    const d = g._details;
    assertEq(d.bmrFormula, 'Mifflin-St Jeor');
    assertEq(d.lbm, null);
    assertEq(d.bf_pct, null);
    assertEq(d.macroBaseLabel, 'peso total');
    assertEq(d.macroBase, 80);
    assertEq(d.direction, 'maintain');
    assertEq(d.deficitPct, null);
    assertEq(d.surplusPct, null);
  });

  h.test('_details.direction reflete loss/gain/maintain corretamente', () => {
    const base = {
      sexo: 'M', peso_atual: 80, altura_cm: 180,
      data_nascimento: '1996-04-13', nivel_atividade: 'leve',
    };
    assertEq(app.computeGoals({ ...base, meta_peso: 75 }, today)._details.direction, 'loss');
    assertEq(app.computeGoals({ ...base, meta_peso: 80 }, today)._details.direction, 'maintain');
    assertEq(app.computeGoals({ ...base, meta_peso: 85 }, today)._details.direction, 'gain');
  });

  h.test('_details.surplusPct preenchido só em modo ganho', () => {
    const base = {
      sexo: 'M', peso_atual: 80, altura_cm: 180,
      data_nascimento: '1996-04-13', nivel_atividade: 'atleta',
      surplus_intensity: 'moderado',
    };
    assertEq(app.computeGoals({ ...base, meta_peso: 85 }, today)._details.surplusPct, 0.15);
    assertEq(app.computeGoals({ ...base, meta_peso: 80 }, today)._details.surplusPct, null, 'manutenção ignora');
    assertEq(app.computeGoals({ ...base, meta_peso: 75 }, today)._details.surplusPct, null, 'perda ignora');
  });
});

// ============================================================
// resolveActivityKey — migração legacy v1 → v2.0.1
// ============================================================
h.describe('resolveActivityKey', () => {
  h.test('nova chave passa direto', () => {
    assertEq(app.resolveActivityKey('sentado'), 'sentado');
    assertEq(app.resolveActivityKey('leve'), 'leve');
    assertEq(app.resolveActivityKey('rotina'), 'rotina');
    assertEq(app.resolveActivityKey('intenso'), 'intenso');
    assertEq(app.resolveActivityKey('atleta'), 'atleta');
  });

  h.test('chave legada v1 migra pra equivalente uma categoria abaixo', () => {
    assertEq(app.resolveActivityKey('sedentario'),      'sentado');
    assertEq(app.resolveActivityKey('sedentario_leve'), 'leve');
    assertEq(app.resolveActivityKey('moderado'),        'rotina');
    assertEq(app.resolveActivityKey('alto'),            'intenso');
  });

  h.test('chave desconhecida retorna null', () => {
    assertEq(app.resolveActivityKey('tabajara'), null);
    assertEq(app.resolveActivityKey(''), null);
    assertEq(app.resolveActivityKey(null), null);
  });
});

// ============================================================
// Katch-McArdle (BMR via body_fat_pct)
// ============================================================
h.describe('computeGoals com Katch-McArdle (BF%)', () => {
  const today = new Date('2026-04-13T12:00:00');

  h.test('Diego real — BF 33.5%, rotina 1.55, agressivo 30% = 2200 kcal + macros via LBM', () => {
    // LBM = 78.67 kg, BMR (Katch) = 2069, TDEE (rotina 1.55) = 3207
    // Agressivo 30% = 2245 → round ↓100 = 2200
    // Macros via LBM:
    //   P = 189 (2.4 · 78.67)
    //   G = 71  (0.9 · 78.67)
    //   C = (2200 − 756 − 639) / 4 = 805 / 4 = 201.25 → 201
    const g = app.computeGoals({
      sexo: 'M', peso_atual: 118.3, altura_cm: 182, meta_peso: 90,
      data_nascimento: '1990-01-01',
      nivel_atividade: 'rotina',
      body_fat_pct: 33.5,
      deficit_intensity: 'agressivo',
    }, today);
    assertEq(g.kcal, 2200, 'kcal');
    assertEq(g.p, 189, 'p');
    assertEq(g.g, 71,  'g');
    assertEq(g.c, 201, 'c');
  });

  h.test('Macros via LBM: diferente de peso total quando BF% alto', () => {
    // Demonstra explicitamente a diferença: mesmo perfil, com e sem BF%
    // Sem BF% (Mifflin): p=2.0·118.3=237, g=0.9·118.3=106
    // Com BF% 33.5% (Katch+LBM): p=2.4·78.67=189, g=0.9·78.67=71
    const base = {
      sexo: 'M', peso_atual: 118.3, altura_cm: 182, meta_peso: 118.3, // manutenção
      data_nascimento: '1990-01-01', nivel_atividade: 'rotina',
    };
    const semBf = app.computeGoals(base, today);
    const comBf = app.computeGoals({ ...base, body_fat_pct: 33.5 }, today);
    assertEq(semBf.p, 237, 'sem BF% → 237 P');
    assertEq(semBf.g, 106, 'sem BF% → 106 G');
    assertEq(comBf.p, 189, 'com BF% → 189 P');
    assertEq(comBf.g, 71,  'com BF% → 71 G');
  });

  h.test('Mesmo perfil sem BF% (Mifflin) dá valor diferente', () => {
    // Mifflin: BMR = 2145.5, TDEE = 3325.525 (rotina 1.55)
    // Agressivo 30% = 2328 → round ↓100 = 2300
    const g = app.computeGoals({
      sexo: 'M', peso_atual: 118.3, altura_cm: 182, meta_peso: 90,
      data_nascimento: '1990-01-01',
      nivel_atividade: 'rotina',
      // sem body_fat_pct
      deficit_intensity: 'agressivo',
    }, today);
    assertEq(g.kcal, 2300);
  });

  h.test('Diego extremo 40% — teto superior Longland 2016', () => {
    // TDEE = 3207.35 (Katch + rotina 1.55), extremo 40% = 1924 → round ↓100 = 1900
    // Macros: P 189, G 71, C = (1900 − 756 − 639) / 4 = 505/4 = 126.25 → 126
    const g = app.computeGoals({
      sexo: 'M', peso_atual: 118.3, altura_cm: 182, meta_peso: 90,
      data_nascimento: '1990-01-01',
      nivel_atividade: 'rotina',
      body_fat_pct: 33.5,
      deficit_intensity: 'extremo',
    }, today);
    assertEq(g.kcal, 1900);
    assertEq(g.p, 189);
    assertEq(g.g, 71);
    assertEq(g.c, 126);
  });

  h.test('BF% fora do range 3-60% cai em Mifflin', () => {
    const base = {
      sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 80,
      data_nascimento: '1996-04-13', nivel_atividade: 'sentado',
    };
    // Mifflin manutenção: BMR=1780, TDEE=2136 → round ↓100 = 2100
    const expected = 2100;
    assertEq(app.computeGoals({ ...base, body_fat_pct: 2 }, today).kcal, expected, 'bf=2');
    assertEq(app.computeGoals({ ...base, body_fat_pct: 70 }, today).kcal, expected, 'bf=70');
    assertEq(app.computeGoals({ ...base, body_fat_pct: 0 }, today).kcal, expected, 'bf=0');
  });

  h.test('Perfil legado v1 "moderado" migra pra "rotina" preservando valor (1.55)', () => {
    // v2.0.7: migração preservativa. v1 'moderado' (1.55) → v2 'rotina' (1.55).
    // Mifflin BMR = 1780; TDEE = 2759 → round ↓100 = 2700 (manutenção)
    const g = app.computeGoals({
      sexo: 'M', peso_atual: 80, altura_cm: 180, meta_peso: 80,
      data_nascimento: '1996-04-13',
      nivel_atividade: 'moderado',   // chave legada v1
    }, today);
    assertEq(g.kcal, 2700);
  });
});

// ============================================================
// getGoalDirection
// ============================================================
h.describe('getGoalDirection', () => {
  h.test('perfil nulo → null', () => {
    assertEq(app.getGoalDirection(null), null);
    assertEq(app.getGoalDirection({}), null);
  });

  h.test('meta abaixo do peso → loss', () => {
    assertEq(app.getGoalDirection({ peso_atual: 80, meta_peso: 75 }), 'loss');
  });

  h.test('meta acima do peso → gain', () => {
    assertEq(app.getGoalDirection({ peso_atual: 70, meta_peso: 75 }), 'gain');
  });

  h.test('meta dentro de ±0,5 kg → maintain', () => {
    assertEq(app.getGoalDirection({ peso_atual: 80, meta_peso: 80 }), 'maintain');
    assertEq(app.getGoalDirection({ peso_atual: 80, meta_peso: 79.6 }), 'maintain');
    assertEq(app.getGoalDirection({ peso_atual: 80, meta_peso: 80.4 }), 'maintain');
  });
});

// ============================================================
// weight log (normalização, dedupe, ordenação, cap)
// ============================================================
h.describe('normalizeWeightLog', () => {
  h.test('array vazio ou nulo → []', () => {
    assertDeepEq(app.normalizeWeightLog([]), []);
    assertDeepEq(app.normalizeWeightLog(null), []);
    assertDeepEq(app.normalizeWeightLog('nao-e-array'), []);
  });

  h.test('ordena por data crescente', () => {
    const log = [
      { date: '2026-03-10', peso: 80 },
      { date: '2026-02-01', peso: 82 },
      { date: '2026-04-01', peso: 79 },
    ];
    const n = app.normalizeWeightLog(log);
    assertEq(n[0].date, '2026-02-01');
    assertEq(n[1].date, '2026-03-10');
    assertEq(n[2].date, '2026-04-01');
  });

  h.test('dedupe por data — última escrita vence', () => {
    const log = [
      { date: '2026-03-10', peso: 80 },
      { date: '2026-03-10', peso: 79.5 },
      { date: '2026-03-10', peso: 79.2 },
    ];
    const n = app.normalizeWeightLog(log);
    assertEq(n.length, 1);
    assertEq(n[0].peso, 79.2);
  });

  h.test('descarta entradas inválidas', () => {
    const log = [
      { date: '2026-03-10', peso: 80 },
      { date: '2026-03-11', peso: 0 },       // peso zero
      { date: '2026-03-12', peso: -5 },      // negativo
      { date: '2026-03-13', peso: 600 },     // absurdo
      { date: '', peso: 70 },                // sem data
      { peso: 70 },                          // sem data
      null,                                  // null
      { date: '2026-03-14', peso: 'abc' },   // string
    ];
    const n = app.normalizeWeightLog(log);
    assertEq(n.length, 1);
    assertEq(n[0].date, '2026-03-10');
  });

  h.test('cap em WEIGHT_LOG_MAX (52) entradas — mantém as mais recentes', () => {
    const log = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(2025, 0, 1);
      d.setDate(d.getDate() + i * 7);
      const iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      log.push({ date: iso, peso: 80 - i * 0.1 });
    }
    const n = app.normalizeWeightLog(log);
    assertEq(n.length, app.WEIGHT_LOG_MAX);
    // A mais recente deve ser a última do array original (i=59).
    assertEq(n[n.length - 1].peso, Math.round((80 - 59 * 0.1) * 10) / 10);
  });
});

h.describe('addWeightEntry', () => {
  h.test('adiciona em log vazio', () => {
    const n = app.addWeightEntry([], '2026-04-13', 80.2);
    assertEq(n.length, 1);
    assertEq(n[0].peso, 80.2);
  });

  h.test('adiciona preservando ordenação', () => {
    const log = [
      { date: '2026-03-10', peso: 82 },
      { date: '2026-04-01', peso: 80 },
    ];
    const n = app.addWeightEntry(log, '2026-03-20', 81);
    assertDeepEq(n.map(e => e.date), ['2026-03-10', '2026-03-20', '2026-04-01']);
    assertEq(n[1].peso, 81);
  });

  h.test('sobrescreve mesma data (último valor vence)', () => {
    const log = [{ date: '2026-04-13', peso: 80.2 }];
    const n = app.addWeightEntry(log, '2026-04-13', 80.0);
    assertEq(n.length, 1);
    assertEq(n[0].peso, 80.0);
  });

  h.test('não muta o array original', () => {
    const log = [{ date: '2026-03-10', peso: 80 }];
    const snap = JSON.parse(JSON.stringify(log));
    app.addWeightEntry(log, '2026-03-11', 79.5);
    assertDeepEq(log, snap);
  });
});

h.describe('daysBetweenDates', () => {
  h.test('mesma data → 0', () => {
    assertEq(app.daysBetweenDates('2026-04-13', '2026-04-13'), 0);
  });

  h.test('7 dias de diferença', () => {
    assertEq(app.daysBetweenDates('2026-04-06', '2026-04-13'), 7);
  });

  h.test('cruza meses', () => {
    assertEq(app.daysBetweenDates('2026-03-30', '2026-04-13'), 14);
  });

  h.test('datas inválidas → null', () => {
    assertEq(app.daysBetweenDates(null, '2026-04-13'), null);
    assertEq(app.daysBetweenDates('2026-04-13', null), null);
    assertEq(app.daysBetweenDates('xyz', '2026-04-13'), null);
  });
});

h.describe('weeksInCut', () => {
  h.test('log vazio ou curto → null', () => {
    assertEq(app.weeksInCut([]), null);
    assertEq(app.weeksInCut(null), null);
    assertEq(app.weeksInCut([{ date: '2026-01-01', peso: 80 }]), null);
  });

  h.test('cut contínuo de 10 semanas (70 dias)', () => {
    const log = [
      { date: '2026-02-01', peso: 120 },
      { date: '2026-02-15', peso: 118 },
      { date: '2026-03-01', peso: 117 },
      { date: '2026-03-15', peso: 116 },
      { date: '2026-04-12', peso: 115 },  // 70 dias após 2026-02-01
    ];
    assertEq(app.weeksInCut(log), 10);
  });

  h.test('cut recente de 2 semanas (14 dias)', () => {
    const log = [
      { date: '2026-03-30', peso: 100 },
      { date: '2026-04-13', peso: 98 },
    ];
    assertEq(app.weeksInCut(log), 2);
  });

  h.test('latest >= max → não está em cut → 0', () => {
    const log = [
      { date: '2026-02-01', peso: 80 },
      { date: '2026-03-01', peso: 79 },
      { date: '2026-04-01', peso: 80 },   // voltou pro peso inicial
    ];
    assertEq(app.weeksInCut(log), 0);
  });

  h.test('peso acima do inicial → 0', () => {
    const log = [
      { date: '2026-02-01', peso: 80 },
      { date: '2026-03-01', peso: 82 },
      { date: '2026-04-01', peso: 83 },
    ];
    assertEq(app.weeksInCut(log), 0);  // latest (83) >= max (83)
  });

  h.test('ordem do log não importa (sort interno)', () => {
    const log = [
      { date: '2026-04-01', peso: 78 },
      { date: '2026-02-01', peso: 82 },  // max
      { date: '2026-03-01', peso: 80 },
    ];
    // max = 82 em 2026-02-01, latest = 78 em 2026-04-01, diff = 59 dias = 8 semanas
    assertEq(app.weeksInCut(log), 8);
  });
});

// ============================================================
// v2.0 — refeições fixas escaláveis
// ============================================================
h.describe('computePortionScale', () => {
  h.test('scale = 1 para target igual à base (2000 kcal)', () => {
    assertEq(app.computePortionScale(2000), 1);
  });

  h.test('scale = 1.413 para target 2826', () => {
    const s = app.computePortionScale(2826);
    assertTrue(Math.abs(s - 1.413) < 0.001, 'esperado ~1.413, got ' + s);
  });

  h.test('scale = 1.164 para target 2328 (agressivo Diego)', () => {
    const s = app.computePortionScale(2328);
    assertTrue(Math.abs(s - 1.164) < 0.001, 'esperado ~1.164, got ' + s);
  });

  h.test('target inválido → scale = 1', () => {
    assertEq(app.computePortionScale(0), 1);
    assertEq(app.computePortionScale(null), 1);
    assertEq(app.computePortionScale(-500), 1);
  });
});

h.describe('scaleIngredient', () => {
  h.test('contável scale=1.0 mantém qty e grams', () => {
    const ing = { key: 'ovos', qty: 2, baseGrams: 100, label: {s:'ovo',p:'ovos'} };
    const s = app.scaleIngredient(ing, 1);
    assertEq(s.qty, 2);
    assertEq(s.grams, 100);
  });

  h.test('contável scale=1.5 escala ovos de 2 pra 3', () => {
    // 2 ovos × 50g = 100g base. Target 150g. 150/50 = 3 ovos.
    const ing = { key: 'ovos', qty: 2, baseGrams: 100 };
    const s = app.scaleIngredient(ing, 1.5);
    assertEq(s.qty, 3);
    assertEq(s.grams, 150);
  });

  h.test('contável scale=1.4 arredonda ovos pra 3 (140g → 3×50=150g)', () => {
    // 100g × 1.4 = 140g. 140/50 = 2.8, round = 3. 3×50 = 150g.
    const ing = { key: 'ovos', qty: 2, baseGrams: 100 };
    const s = app.scaleIngredient(ing, 1.4);
    assertEq(s.qty, 3);
    assertEq(s.grams, 150);
  });

  h.test('contável scale=0.5 respeita mínimo qty=1', () => {
    const ing = { key: 'ovos', qty: 2, baseGrams: 100 };
    const s = app.scaleIngredient(ing, 0.5);
    assertEq(s.qty, 1);
    assertEq(s.grams, 50);
  });

  h.test('gramas puras arredonda ao múltiplo de 5 mais próximo', () => {
    const ing = { key: 'cottage', baseGrams: 200, label: 'queijo cottage' };
    const s1 = app.scaleIngredient(ing, 1.0);
    assertEq(s1.grams, 200);
    const s2 = app.scaleIngredient(ing, 1.4);
    assertEq(s2.grams, 280);  // 200×1.4=280, já múltiplo de 5
    const s3 = app.scaleIngredient(ing, 1.163);
    assertEq(s3.grams, 235);  // 232.6 → 235
  });

  h.test('gramas puras respeita mínimo 5g', () => {
    const ing = { key: 'cottage', baseGrams: 20, label: 'x' };
    const s = app.scaleIngredient(ing, 0.1);
    assertEq(s.grams, 5);
  });
});

h.describe('computeMealMacros', () => {
  h.test('café na base (scale=1) bate com os macros hardcoded originais', () => {
    // Café original: 360 kcal, 29P, 26C, 16G
    // Derivado dos nossos per100g: ~370 kcal, 28P, 29C, 16G (tolerância ~5%)
    const cafe = app.FIXED_MEAL_RECIPES.find(r => r.id === 'cafe');
    const scaled = app.scaleMealIngredients(cafe, 1);
    const m = app.computeMealMacros(scaled.ingredients);
    assertTrue(Math.abs(m.kcal - 360) < 25, 'kcal ~360, got ' + m.kcal);
    assertTrue(Math.abs(m.p - 29) < 4,      'p ~29, got ' + m.p);
    assertTrue(Math.abs(m.c - 26) < 5,      'c ~26, got ' + m.c);
    assertTrue(Math.abs(m.g - 16) < 3,      'g ~16, got ' + m.g);
  });

  h.test('lanche1 na base (scale=1) ≈ 200 kcal 24P 23C 2G', () => {
    const l1 = app.FIXED_MEAL_RECIPES.find(r => r.id === 'lanche1');
    const scaled = app.scaleMealIngredients(l1, 1);
    const m = app.computeMealMacros(scaled.ingredients);
    assertTrue(Math.abs(m.kcal - 200) < 15, 'kcal ~200, got ' + m.kcal);
    assertTrue(Math.abs(m.p - 24) < 3,      'p ~24, got ' + m.p);
  });

  h.test('scale=2 dobra todos os macros (proporcional)', () => {
    const cafe = app.FIXED_MEAL_RECIPES.find(r => r.id === 'cafe');
    const s1 = app.computeMealMacros(app.scaleMealIngredients(cafe, 1).ingredients);
    const s2 = app.computeMealMacros(app.scaleMealIngredients(cafe, 2).ingredients);
    // Scale=2 deve dobrar aproximadamente (margem de arredondamento discreto)
    assertTrue(s2.kcal > s1.kcal * 1.85, 's2.kcal > 1.85× s1.kcal');
    assertTrue(s2.kcal < s1.kcal * 2.15, 's2.kcal < 2.15× s1.kcal');
  });

  h.test('ingrediente sem per100g é ignorado sem quebrar', () => {
    const m = app.computeMealMacros([
      { key: 'ovos',           grams: 100 },
      { key: 'nao_existe_xyz', grams: 50 },   // sem per100g, silenciosamente pulado
    ]);
    assertTrue(m.kcal > 0, 'kcal > 0 (ovos computaram)');
    assertEq(m.kcal, 155);  // só os ovos contam
  });
});

h.describe('renderIngredientLine', () => {
  h.test('contável singular usa label.s', () => {
    const ing = { key: 'ovos', qty: 1, grams: 50, label: { s: 'ovo inteiro', p: 'ovos inteiros' } };
    assertEq(app.renderIngredientLine(ing), '1 ovo inteiro (~50g)');
  });

  h.test('contável plural usa label.p', () => {
    const ing = { key: 'ovos', qty: 3, grams: 150, label: { s: 'ovo inteiro', p: 'ovos inteiros' } };
    assertEq(app.renderIngredientLine(ing), '3 ovos inteiros (~150g)');
  });

  h.test('gramas puras render como "{grams}g {label}"', () => {
    const ing = { key: 'cottage', grams: 200, label: 'queijo cottage' };
    assertEq(app.renderIngredientLine(ing), '200g queijo cottage');
  });
});

h.describe('renderMealFoodsText', () => {
  h.test('café escalado 1.4× produz texto coerente', () => {
    const cafe = app.FIXED_MEAL_RECIPES.find(r => r.id === 'cafe');
    const scaled = app.scaleMealIngredients(cafe, 1.4);
    const text = app.renderMealFoodsText(scaled);
    // 2 ovos × 1.4 = 2.8 → 3 ovos
    assertTrue(text.includes('3 ovos'), 'esperado "3 ovos", got: ' + text);
    // 2 claras × 1.4 = 2.8 → 3 claras
    assertTrue(text.includes('3 claras'), 'esperado "3 claras", got: ' + text);
    // extras do café
    assertTrue(text.includes('Café preto'), 'esperado "Café preto"');
  });

  h.test('presono inclui altOptions no texto', () => {
    const p = app.FIXED_MEAL_RECIPES.find(r => r.id === 'presono');
    const text = app.renderMealFoodsText(p);
    assertTrue(text.includes('Alternativas'), 'esperado "Alternativas"');
  });
});

// ============================================================
// Summary
// ============================================================
process.exit(h.summary());
