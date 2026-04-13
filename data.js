// ==================================================================
// data.js — Receitas, ingredientes e constantes derivadas.
// Carregado antes do script principal via <script src="data.js">.
// ==================================================================
// Nenhuma função neste arquivo deve tocar o DOM — tudo é pura data
// ou helpers que operam apenas sobre as estruturas declaradas aqui.

// ============================================================
// STORAGE KEYS (single source of truth for localStorage names)
// ============================================================
// Qualquer chave de localStorage usada no app deve estar declarada aqui.
// SYNC_KEYS / BACKUP_KEYS são derivados pra ninguém esquecer de manter
// sincronizados: adicionar uma chave nova aqui propaga para sync e backup.
const STORAGE_KEYS = {
  // Planejamento semanal
  marmitaPlan:         'marmita_plan',
  dinnerPlan:          'dinner_plan',
  marmitaCurrentWeek:  'marmita_current_week',
  marmitaConsumed:     'marmita_consumed',
  dinnerConsumed:      'dinner_consumed',
  marmitaHistory:      'marmita_history',
  // Compras / Estoque
  homeStock:           'home_stock',
  shopChecks:          'shop_checks',
  shopSubs:            'shop_subs',         // v2.1.49: substituições ativas (chave → texto livre)
  shopSubsLog:         'shop_subs_log',     // v2.1.49: histórico append-only de substituições
  genDraft:            'gen_draft',
  // v2.1.31: snapshot do que a última geração contribuiu pro plano. Usado pra
  // re-gerar idempotentemente: subtraímos o lastApplied antes de somar a nova
  // geração, então gerar 2x com o mesmo input não duplica.
  genLastAppliedMarmita: 'gen_last_applied_marmita',
  genLastAppliedDinner:  'gen_last_applied_dinner',
  // Treino / Agenda
  workouts:            'workouts',
  cardioLog:           'cardio_log',
  calLog:              'cal_log',
  // Perfil / sessão
  userProfile:         'user_profile',
  skipLogin:           'skip_login',
  weightLog:           'weight_log',
};

// Prefixos de chaves dinâmicas (usadas com startsWith em cleanup/backup).
const STORAGE_PREFIXES = {
  meals:  'meals_',   // meals_YYYY-MM-DD — refeições marcadas por dia
  cardio: 'cardio_',  // legado: antigas entradas diárias de cardio por data
};

// Chaves que sincronizam com Firestore e aparecem em backup/export.
// Hoje SYNC_KEYS === BACKUP_KEYS, mas mantemos as duas pra deixar explícito
// que cada uso tem um propósito diferente (sync em tempo real vs. export).
const SYNC_KEYS = [
  STORAGE_KEYS.marmitaPlan,
  STORAGE_KEYS.dinnerPlan,
  STORAGE_KEYS.homeStock,
  STORAGE_KEYS.marmitaHistory,
  STORAGE_KEYS.marmitaCurrentWeek,
  STORAGE_KEYS.marmitaConsumed,
  STORAGE_KEYS.dinnerConsumed,
  STORAGE_KEYS.shopChecks,
  STORAGE_KEYS.shopSubs,
  STORAGE_KEYS.shopSubsLog,
  STORAGE_KEYS.workouts,
  STORAGE_KEYS.cardioLog,
  STORAGE_KEYS.calLog,
  STORAGE_KEYS.userProfile,
  STORAGE_KEYS.weightLog,
  STORAGE_KEYS.genLastAppliedMarmita,
  STORAGE_KEYS.genLastAppliedDinner,
];
const BACKUP_KEYS = SYNC_KEYS;

// ============================================================
// GOALS / MACRO CALCULATOR (Mifflin-St Jeor + atividade + meta)
// ============================================================
// Usado quando há um user_profile válido. Se faltar dado, o chamador
// deve cair para DEFAULT_GOALS (representa o objetivo histórico do app).
// Referência implícita: adulto 70 kg em 2.000 kcal com atividade leve.
//   fiber    = max(25, 14 × 2.000/1.000) = max(25, 28) = 28 g (IOM/USDA + WHO 2023)
//   water    = 35 × 70 = 2.450 ml (Manz & Wentz 2005 baseline)
//   perMealP = 0,4 × 70 = 28 g (Schoenfeld & Aragon 2018; Areta et al. 2013)
const DEFAULT_GOALS = { kcal: 2000, p: 190, c: 150, g: 70, fiber: 28, water_ml: 2450, perMealP: 28 };

// Multiplicadores de atividade — Harris-Benedict clássicos (v2.0.7).
// Valores alinhados com a literatura mais citada em sports nutrition:
// Helms et al. 2014 (bodybuilding prep), ISSN Position Stand on Energy
// (Kerksick et al. 2017/2023), ACSM 2016, Academy of Nutrition and
// Dietetics Evidence Analysis Library 2023, Ten Haaf & Weijs 2014.
const ACTIVITY_MULTIPLIERS = {
  sentado:  1.2,     // Sedentário: pouca ou nenhuma atividade física
  leve:     1.375,   // Levemente ativo: exercício leve 1-3x/semana
  rotina:   1.55,    // Moderadamente ativo: exercício moderado 3-5x/semana
  intenso:  1.725,   // Muito ativo: exercício intenso 6-7x/semana
  atleta:   1.9,     // Extra ativo: trabalho físico pesado + treino diário
};

// Mapa de migração de chaves legadas (v1). Com a escala H-B de v2.0.7, o
// mapeamento agora é preservativo (não é mais shift-down) — cada chave
// antiga aponta pra nova chave com mesmo multiplicador, sem mudança de valor.
const LEGACY_ACTIVITY_KEYS = {
  sedentario:      'sentado',   // v1 1.2 → v2 sentado 1.2 (preservado)
  sedentario_leve: 'leve',      // v1 1.375 → v2 leve 1.375 (preservado)
  moderado:        'rotina',    // v1 1.55 → v2 rotina 1.55 (preservado)
  alto:            'intenso',   // v1 1.725 → v2 intenso 1.725 (preservado)
};

// Resolve uma chave de atividade (seja nova ou legada) para o key canônico
// do `ACTIVITY_MULTIPLIERS`. Retorna null se não reconhecer.
function resolveActivityKey(key) {
  if (!key) return null;
  if (key in ACTIVITY_MULTIPLIERS) return key;
  if (key in LEGACY_ACTIVITY_KEYS) return LEGACY_ACTIVITY_KEYS[key];
  return null;
}

// Percentual de déficit aplicado sobre o TDEE quando o usuário está em perda.
// Se `profile.deficit_intensity` não estiver definido (perfis antigos), o
// cálculo cai no déficit fixo de 500 kcal — comportamento legado preservado.
// As chaves batem com os values do <select id="ob-deficit">.
const DEFICIT_INTENSITY_PCT = {
  suave:     0.15,   // ~0,35 kg/semana em 3.000 kcal TDEE
  moderado:  0.20,   // ~0,5  kg/semana
  agressivo: 0.30,   // ~0,85 kg/semana
  extremo:   0.40,   // ~1,0+ kg/semana — limite superior (Longland et al. 2016;
                     // Murphy & Koehler 2022). Só defensável com BF% alto + proteína
                     // alta + treino de força. Acima disso há risco de perda de massa
                     // magra mesmo com proteção proteica.
};

// Percentual de superávit aplicado sobre o TDEE em modo ganho (v2.0.4).
// Escala automaticamente com o TDEE individual — evita o viés grosseiro do
// +300 fixo que over/undersize em TDEEs extremos. Valores baseados em:
//   - Ribeiro et al. 2019 (lean gains com surplus moderado de 10-15%)
//   - Iraki et al. 2019 (Strength & Conditioning Journal, 10-20% range)
//   - Garthe et al. 2013 (500g vs 1kg/sem, 500g preservou melhor composição)
// Se `profile.surplus_intensity` não estiver definido, cai no comportamento
// legado (+300 kcal fixo) pra retrocompatibilidade.
const SURPLUS_INTENSITY_PCT = {
  lento:     0.10,   // ~0,25 kg/semana, lean bulk (Ribeiro 2019)
  moderado:  0.15,   // ~0,35 kg/semana, default (Iraki 2019)
  agressivo: 0.20,   // ~0,5  kg/semana, bulk mais rápido
};

// Ratios de macro por kg. Quando o perfil tem body_fat_pct, usamos LBM como base
// (Helms et al. 2014 pra proteína em cutting; Dorgan 1996 pra gordura mínima).
// Sem BF%, caímos em peso total com multiplicadores mais baixos — menos preciso
// mas retrocompatível com perfis v1 que não tinham o campo BF%.
const MACRO_RATIOS = {
  // Com BF% conhecido → base = LBM
  lbm: {
    protein_per_kg: 2.4,  // Morton et al. 2018, Helms et al. 2014 (range 2,3-3,1 g/kg LBM)
    fat_per_kg:     0.9,  // Dorgan et al. 1996 (mínimo pra função hormonal)
  },
  // Sem BF% → base = peso total (fallback v1)
  total: {
    protein_per_kg: 2.0,
    fat_per_kg:     0.9,
  },
};

// Água em ml por kg de peso total, por nível de atividade. Baseline 35 ml/kg é a
// fórmula funcional de Manz & Wentz 2005 (ainda citada em literatura de 2020+
// como referência individual). Escalonamento por atividade reflete perdas de
// sudorese: ACSM 2007/2016 Position Stand recomenda +400-800 ml/h de exercício,
// que convertido pra média diária bate com esses incrementos em peso corporal.
// Também inclui (implicitamente) o ajuste pra alta ingestão proteica (>1,8 g/kg
// LBM) porque perfis ativos naturalmente têm mais proteína e mais água.
const ACTIVITY_WATER_ML_PER_KG = {
  sentado:  35,   // Manz & Wentz 2005 baseline
  leve:     37,   // +5%
  rotina:   40,   // +14% (3-5x/semana)
  intenso:  45,   // +28% (6-7x/semana)
  atleta:   50,   // +43% (2x/dia, trabalho físico)
};

// Idade em anos cheios, a partir de uma data YYYY-MM-DD. Retorna null
// se a string for inválida. O parâmetro `today` é opcional — só usado
// em testes para travar a data e evitar flakiness por passagem do tempo.
function calculateAge(birthStr, today) {
  if (!birthStr) return null;
  const birth = new Date(birthStr + 'T12:00:00');
  if (isNaN(birth.getTime())) return null;
  const ref = today || new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

// Calcula meta diária (kcal, P, C, G) a partir do user_profile.
// Retorna null se o perfil estiver incompleto — nesse caso o chamador
// deve cair para DEFAULT_GOALS.
//
// Fórmulas:
//   Katch-McArdle (usada quando profile.body_fat_pct está presente):
//     BMR = 370 + 21,6 × LBM,  onde LBM = peso × (1 − bf/100)
//     Mais precisa quando BF% é conhecido, especialmente em extremos de composição.
//   Mifflin-St Jeor (fallback sem BF%):
//     Homem:  BMR = 10·peso + 6.25·altura − 5·idade + 5
//     Mulher: BMR = 10·peso + 6.25·altura − 5·idade − 161
//     Outro:  média (usa −78 como constante de sexo)
//
// TDEE = BMR × multiplicador de atividade (escala v2.0.1, mais conservadora).
// Ajuste pela meta (zona morta ±0,5 kg):
//   perda:       TDEE − 500 kcal OU TDEE × (1 − deficit_pct) se deficit_intensity presente
//   ganho:       TDEE + 300 kcal
//   manutenção:  TDEE
//
// Macros (v2.0.2): hierarquia proteína → gordura → carbo (preenche restante).
//   Com BF%: proteína 2,4 g/kg LBM (Helms/Morton), gordura 0,9 g/kg LBM (Dorgan)
//   Sem BF%: proteína 2,0 g/kg peso total, gordura 0,9 g/kg peso total (fallback v1)
// Piso de segurança: 1200 kcal/dia.
function computeGoals(profile, today) {
  if (!profile) return null;
  const peso = Number(profile.peso_atual);
  const altura = Number(profile.altura_cm);
  const meta = Number(profile.meta_peso);
  if (!peso || !altura || !meta) return null;

  const idade = calculateAge(profile.data_nascimento, today);
  if (idade == null || idade < 5) return null;

  // BMR: Katch-McArdle se tem BF% válido, senão Mifflin-St Jeor.
  // Macros: se BF% válido, usa LBM como base; senão peso total.
  let bmr;
  let macroBase;      // peso usado pra calcular proteína/gordura
  let macroRatios;    // multiplicadores aplicados sobre macroBase
  const bf = Number(profile.body_fat_pct);
  if (bf && bf >= 3 && bf <= 60) {
    const lbm = peso * (1 - bf / 100);
    bmr = 370 + 21.6 * lbm;
    macroBase = lbm;
    macroRatios = MACRO_RATIOS.lbm;
  } else {
    const sexoConst = profile.sexo === 'M' ? 5
                    : profile.sexo === 'F' ? -161
                    : -78;
    bmr = 10 * peso + 6.25 * altura - 5 * idade + sexoConst;
    macroBase = peso;
    macroRatios = MACRO_RATIOS.total;
  }

  // Resolve atividade (suporta chaves legadas do v1 com migração preservativa).
  // Fallback: 'sentado' (1.2) é o mais conservador — coincide com o que a
  // literatura recomenda em dúvida sobre nível de atividade.
  const activityKey = resolveActivityKey(profile.nivel_atividade) || 'sentado';
  const mult = ACTIVITY_MULTIPLIERS[activityKey];
  const tdee = bmr * mult;

  const delta = meta - peso;
  let kcal;
  if (delta < -0.5) {
    // Perda: se o perfil tem deficit_intensity, aplica percentual sobre TDEE.
    // Senão, cai no comportamento legado (−500 kcal fixo) pra não quebrar
    // perfis criados antes da introdução desse campo.
    const pct = DEFICIT_INTENSITY_PCT[profile.deficit_intensity];
    kcal = pct != null ? tdee * (1 - pct) : tdee - 500;
  } else if (delta > 0.5) {
    // Ganho: análogo ao deficit. Se surplus_intensity presente, aplica
    // percentual sobre TDEE (10-20% — Iraki/Ribeiro/Garthe). Senão, +300 fixo.
    const sPct = SURPLUS_INTENSITY_PCT[profile.surplus_intensity];
    kcal = sPct != null ? tdee * (1 + sPct) : tdee + 300;
  } else {
    kcal = tdee;
  }

  kcal = Math.max(1200, Math.round(kcal));
  // v2.1.2: arredonda pra baixo ao múltiplo de 100 mais próximo, pra exibir
  // uma meta "amigável visualmente" (2.200 em vez de 2.245). O piso de 1.200
  // é aplicado ANTES do round-down, então nunca cai abaixo dele.
  kcal = Math.floor(kcal / 100) * 100;

  // Hierarquia dos macros: proteína primeiro, gordura mínima, carbo preenche.
  const p = Math.round(macroRatios.protein_per_kg * macroBase);
  const g = Math.round(macroRatios.fat_per_kg     * macroBase);
  const carbKcal = kcal - (p * 4) - (g * 9);
  const c = Math.max(0, Math.round(carbKcal / 4));

  // Fibra: calorie-adjusted (IOM/USDA: 14 g/1.000 kcal) com piso de 25 g/dia
  // (WHO 2023 Guideline on Carbohydrate Intake, Reynolds et al. 2019 Lancet).
  const fiber = Math.max(25, Math.round(14 * kcal / 1000));

  // Água: body-weight-adjusted, escalonado por atividade. Manz & Wentz 2005
  // baseline (35 ml/kg) + ajuste ACSM por sudorese.
  const waterPerKg = ACTIVITY_WATER_ML_PER_KG[activityKey] || 35;
  const water_ml = Math.round(waterPerKg * peso);

  // Meta de proteína por refeição: 0,4 g/kg de macroBase otimiza MPS (síntese
  // proteica muscular). Base científica: Schoenfeld & Aragon 2018 + Areta et al.
  // 2013 (spacing de 4-5 refeições com ~0,4 g/kg cada). Usamos a mesma base
  // do cálculo total (LBM se BF% presente, peso total senão) pra consistência.
  const perMealP = Math.round(0.4 * macroBase);

  // v2.0.5: metadados de transparência do cálculo. Usados pela UI "Detalhes
  // do cálculo" pra mostrar cada passo ao usuário. Não afetam o cálculo em si.
  const hasBf = bf && bf >= 3 && bf <= 60;
  const direction = delta < -0.5 ? 'loss' : delta > 0.5 ? 'gain' : 'maintain';
  const _details = {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    lbm: hasBf ? Math.round(peso * (1 - bf / 100) * 10) / 10 : null,
    bf_pct: hasBf ? bf : null,
    bmrFormula: hasBf ? 'Katch-McArdle' : 'Mifflin-St Jeor',
    activityKey,
    activityMult: mult,
    macroBase: Math.round(macroBase * 10) / 10,
    macroBaseLabel: hasBf ? 'LBM' : 'peso total',
    protein_per_kg: macroRatios.protein_per_kg,
    fat_per_kg:     macroRatios.fat_per_kg,
    direction,
    deficitPct: direction === 'loss'
      ? (DEFICIT_INTENSITY_PCT[profile.deficit_intensity] != null ? DEFICIT_INTENSITY_PCT[profile.deficit_intensity] : null)
      : null,
    surplusPct: direction === 'gain'
      ? (SURPLUS_INTENSITY_PCT[profile.surplus_intensity] != null ? SURPLUS_INTENSITY_PCT[profile.surplus_intensity] : null)
      : null,
    waterPerKg,
  };

  return { kcal, p, c, g, fiber, water_ml, perMealP, _details };
}

// Retorna o "objetivo" (perda/ganho/manutenção) a partir da meta,
// usado pelo header da aba Dieta para escrever o texto dinâmico.
function getGoalDirection(profile) {
  if (!profile || !profile.meta_peso || !profile.peso_atual) return null;
  const delta = Number(profile.meta_peso) - Number(profile.peso_atual);
  if (delta < -0.5) return 'loss';
  if (delta > 0.5)  return 'gain';
  return 'maintain';
}

// ============================================================
// WEIGHT LOG (evolução do peso ao longo do tempo)
// ============================================================
// Formato de uma entrada: { date: 'YYYY-MM-DD', peso: number }.
// Invariante: a lista está sempre ordenada por data crescente, sem
// duplicatas de data (a última escrita vence) e capada em WEIGHT_LOG_MAX
// entradas (janela deslizante ~1 ano se o usuário registrar semanalmente).
const WEIGHT_LOG_MAX = 52;

// Normaliza um array arbitrário: descarta entradas inválidas, deduplica
// por data (último valor para a mesma data vence) e ordena crescente.
function normalizeWeightLog(log) {
  if (!Array.isArray(log)) return [];
  const byDate = {};
  log.forEach(e => {
    if (!e || !e.date || typeof e.date !== 'string') return;
    const peso = Number(e.peso);
    if (!peso || isNaN(peso) || peso <= 0 || peso > 500) return;
    byDate[e.date] = peso;
  });
  const sorted = Object.keys(byDate).sort().map(d => ({ date: d, peso: byDate[d] }));
  // Mantém só as WEIGHT_LOG_MAX entradas mais recentes.
  return sorted.slice(-WEIGHT_LOG_MAX);
}

// Retorna uma nova lista com a entrada (date, peso) adicionada e o
// invariante restabelecido (dedupe + sort + cap).
function addWeightEntry(log, date, peso) {
  const next = Array.isArray(log) ? log.slice() : [];
  next.push({ date, peso: Number(peso) });
  return normalizeWeightLog(next);
}

// Diferença de dias entre duas datas YYYY-MM-DD. Retorna null se inválidas.
// Usado pra decidir se já é hora de registrar o peso da semana.
function daysBetweenDates(a, b) {
  if (!a || !b) return null;
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.round((db - da) / 86400000);
}

// Detecta há quantas semanas o usuário está em cutting contínuo, baseado
// no log de peso. Heurística: encontra o peso máximo do log e conta as
// semanas entre esse pico e a entrada mais recente. Se o usuário não está
// abaixo do max, retorna 0 (não em cutting ativo).
//
// Usado pra disparar o "diet break reminder" baseado em Helms et al. 2014:
// após 8-12 semanas de cutting contínuo, recomenda-se 1-2 semanas em
// manutenção para recuperação metabólica (leptina, função tireoidiana,
// performance). Peterson et al. 2017 (Obesity) também suporta intermittent
// energy restriction como estratégia de sustentabilidade.
function weeksInCut(weightLog) {
  if (!Array.isArray(weightLog) || weightLog.length < 2) return null;
  const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  // Encontra a entrada com maior peso (provável início do cut atual).
  let maxEntry = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].peso > maxEntry.peso) maxEntry = sorted[i];
  }
  // Se o peso atual não está abaixo do máximo, não está em cut ativo.
  if (latest.peso >= maxEntry.peso) return 0;
  const days = daysBetweenDates(maxEntry.date, latest.date);
  if (days == null) return null;
  return Math.floor(days / 7);
}

// ============================================================
// INGREDIENT CATALOG (single source of truth for metadata)
// ============================================================
// Cada ingrediente aparece aqui uma vez só. As receitas (MARMITA_DEFS / DINNER_DEFS)
// usam a chave e a quantidade (raw) — label, unidade e role vêm deste catálogo.
// role define como o ingrediente é tratado pelo gerador:
//   - 'protein'       → restrição primária, define contagem de refeição
//   - 'protein-share' → proteína compartilhada entre múltiplos pratos (ex: ovos)
//   - 'carb'          → carboidrato (estoque, não conta contagem)
//   - 'veg'           → folhas/vegetais (estoque mínimo)
//   - 'other'         → queijos, molhos, pães etc. (estoque)
//
// v2.0 — campos opcionais pra refeições fixas escaláveis:
//   - per100g: { kcal, p, c, g }  nutrição por 100g (fonte: TACO/USDA, ~5% de tolerância)
//   - grams_per_un: peso típico de 1 "unidade" (ovo, fatia, scoop, maçã, etc.)
// Só os ingredientes usados em FIXED_MEAL_RECIPES têm esses campos hoje.
// As receitas legadas (MARMITA_DEFS/DINNER_DEFS) continuam usando só label/unit/role.
const INGREDIENTS = {
  // Proteínas — marmitas
  frango:            { label: 'Peito de frango',                     unit: 'g',     role: 'protein' },
  carne_moida:       { label: 'Carne moída magra (patinho, coxão mole ou coxão duro)', unit: 'g', role: 'protein' },
  tilapia:           { label: 'Filé de tilápia',                     unit: 'g',     role: 'protein' },
  lombo:             { label: 'Lombo suíno',                         unit: 'g',     role: 'protein' },
  sobrecoxa:         { label: 'Sobrecoxa sem pele',                  unit: 'g',     role: 'protein' },
  coxao_mole:        { label: 'Coxão mole',                          unit: 'g',     role: 'protein' },
  // Proteínas — jantares
  atum_lata:         { label: 'Atum em lata',                        unit: 'lata',  role: 'protein',
                       grams_per_un: 120 }, // ~120g drenado por lata padrão
  alcatra:           { label: 'Carne bovina (bife ou pedaços; crua)', unit: 'g',    role: 'protein' },
  peito_peru:        { label: 'Peito de peru defumado',              unit: 'g',     role: 'protein' },
  ovos:              { label: 'Ovos',                                unit: 'un',    role: 'protein-share',
                       per100g: { kcal: 155, p: 13.0, c: 1.1, g: 11.0 }, grams_per_un: 50 },
  claras:            { label: 'Claras',                              unit: 'un',    role: 'protein',
                       per100g: { kcal: 48,  p: 11.0, c: 0.7, g: 0.2 },  grams_per_un: 35 },
  whey_isolado:      { label: 'Whey isolado',                        unit: 'scoop', role: 'protein',
                       per100g: { kcal: 380, p: 80.0, c: 4.0, g: 1.0 },  grams_per_un: 30 },
  // Carboidratos
  arroz_branco:      { label: 'Arroz branco (cru)',                  unit: 'g',     role: 'carb' },
  arroz_integral:    { label: 'Arroz integral (cru)',                unit: 'g',     role: 'carb' },
  batata_doce:       { label: 'Batata doce',                         unit: 'g',     role: 'carb' },
  mandioca:          { label: 'Mandioca (crua)',                     unit: 'g',     role: 'carb' },
  macarrao_integral: { label: 'Macarrão integral (cru)',             unit: 'g',     role: 'carb' },
  goma_tapioca:      { label: 'Goma de tapioca',                     unit: 'g',     role: 'carb' },
  tortilla:          { label: 'Tortilla integral',                   unit: 'un',    role: 'carb',
                       grams_per_un: 40 }, // ~40g por tortilla integral
  pao_integral:      { label: 'Pão integral',                        unit: 'fatias',role: 'carb',
                       per100g: { kcal: 253, p: 9.0,  c: 43.0, g: 3.4 }, grams_per_un: 25 },
  // Queijos e cremes
  mussarela:         { label: 'Queijo mussarela',                    unit: 'g',     role: 'other',
                       per100g: { kcal: 280, p: 22.0, c: 2.3, g: 21.0 } },
  queijo_minas:      { label: 'Queijo minas frescal',                unit: 'g',     role: 'other' },
  cottage:           { label: 'Queijo cottage',                      unit: 'g',     role: 'other',
                       per100g: { kcal: 98,  p: 11.0, c: 3.4, g: 4.3 } },
  iogurte_grego:     { label: 'Iogurte grego natural',               unit: 'g',     role: 'other',
                       per100g: { kcal: 100, p: 10.0, c: 4.0, g: 5.0 } },
  requeijao:         { label: 'Requeijão cremoso',                   unit: 'g',     role: 'other' },
  // Frutas
  banana_prata:      { label: 'Banana prata',                        unit: 'un',    role: 'other',
                       per100g: { kcal: 89,  p: 1.1,  c: 23.0, g: 0.3 }, grams_per_un: 70 },
  maca:              { label: 'Maçã',                                unit: 'un',    role: 'other',
                       per100g: { kcal: 52,  p: 0.3,  c: 14.0, g: 0.2 }, grams_per_un: 150 },
  // Salada
  alface:            { label: 'Alface + rúcula',                     unit: 'g',     role: 'veg' },
  pepino:            { label: 'Pepino',                              unit: 'g',     role: 'veg' },
};

// ============================================================
// FIXED MEAL RECIPES — refeições fixas escaláveis (v2.0)
// ============================================================
// Estrutura declarativa em vez de macros hardcoded. Cada ingrediente tem:
//   - key:        chave no catálogo INGREDIENTS (puxa per100g)
//   - baseGrams:  peso total em gramas na porção base (target = DEFAULT_GOALS.kcal)
//   - qty:        quantidade em unidades contáveis (opcional; se presente, é "2 ovos", "1 fatia" etc.)
//   - label:      { s, p } formas singular e plural pro render de texto
//
// O fator de escala `portionScale = target / DEFAULT_GOALS.kcal` é aplicado
// aos baseGrams em tempo de render. Macros derivam de (grams/100 × per100g).
// Marmitas e jantares NÃO passam por esse pipeline (seguem hardcoded como legado
// pra não afetar shopping list / planner).
const FIXED_MEAL_RECIPES = [
  {
    id: 'cafe', time: '7h', name: 'Café da Manhã', desc: 'Ovos + Pão Integral', color: '',
    ingredients: [
      { key: 'ovos',         qty: 2, baseGrams: 100, label: { s: 'ovo inteiro mexido', p: 'ovos inteiros mexidos' } },
      { key: 'claras',       qty: 2, baseGrams: 70,  label: { s: 'clara',              p: 'claras' } },
      { key: 'pao_integral', qty: 1, baseGrams: 25,  label: { s: 'fatia pão integral', p: 'fatias pão integral' } },
      { key: 'mussarela',    qty: 1, baseGrams: 20,  label: { s: 'fatia mussarela',    p: 'fatias mussarela' } },
      { key: 'banana_prata', qty: 1, baseGrams: 70,  label: { s: 'banana prata',       p: 'bananas prata' } },
    ],
    extras: 'Café preto sem açúcar',
  },
  {
    id: 'lanche1', time: '10h', name: 'Lanche da Manhã', desc: 'Whey + Fruta', color: '',
    ingredients: [
      { key: 'whey_isolado', qty: 1, baseGrams: 30,  label: { s: 'scoop whey isolado em água', p: 'scoops whey isolado em água' } },
      { key: 'maca',         qty: 1, baseGrams: 150, label: { s: 'maçã média',                 p: 'maçãs médias' } },
    ],
  },
  {
    id: 'lanche2', time: '16h', name: 'Lanche / Pré-Treino', desc: 'Iogurte + Whey + Banana', color: '',
    ingredients: [
      { key: 'iogurte_grego', baseGrams: 130, label: 'iogurte grego natural' },
      { key: 'whey_isolado',  qty: 1, baseGrams: 15, label: { s: 'scoop whey', p: 'scoops whey' } },
      { key: 'banana_prata',  qty: 1, baseGrams: 70, label: { s: 'banana prata', p: 'bananas prata' } },
    ],
  },
  {
    id: 'presono', time: '22h', name: 'Pré-Sono', desc: 'Proteína lenta', color: '',
    ingredients: [
      { key: 'cottage', baseGrams: 200, label: 'queijo cottage' },
    ],
    altOptions: '<b>Alternativas equivalentes:</b> caseína em água • iogurte grego natural • queijo minas + peito de peru • whey em água • omelete (1 ovo + 2 claras)',
  },
];

// Escala um único ingrediente pelo factor `scale`.
// Regras de arredondamento:
//   - Contáveis (com qty): novo qty = round(baseGrams × scale / grams_per_un), mínimo 1.
//                           grams = newQty × grams_per_un.
//   - Só gramas: grams = round(baseGrams × scale / 5) × 5, mínimo 5g.
function scaleIngredient(ing, scale) {
  const targetGrams = ing.baseGrams * scale;
  if (ing.qty != null) {
    // Contável: puxa grams_per_un do catálogo (fallback: baseGrams/qty da receita).
    const meta = INGREDIENTS[ing.key] || {};
    const gPerUn = meta.grams_per_un || (ing.baseGrams / ing.qty);
    const newQty = Math.max(1, Math.round(targetGrams / gPerUn));
    return { ...ing, qty: newQty, grams: newQty * gPerUn };
  }
  // Gramas puros: arredonda ao múltiplo de 5g mais próximo.
  const rounded = Math.max(5, Math.round(targetGrams / 5) * 5);
  return { ...ing, grams: rounded };
}

// Escala todos os ingredientes de uma refeição, retornando uma cópia nova.
function scaleMealIngredients(meal, scale) {
  return { ...meal, ingredients: meal.ingredients.map(i => scaleIngredient(i, scale)) };
}

// Soma macros de uma lista de ingredientes escalados.
// Cada ingrediente precisa ter `grams` (output de scaleIngredient) e `key` apontando
// pra uma entrada em INGREDIENTS com `per100g`. Ingredientes sem per100g são ignorados
// (silenciosamente, pra tolerar receitas parciais).
function computeMealMacros(ingredients) {
  const totals = { kcal: 0, p: 0, c: 0, g: 0 };
  ingredients.forEach(ing => {
    const meta = INGREDIENTS[ing.key];
    if (!meta || !meta.per100g) return;
    const factor = ing.grams / 100;
    totals.kcal += meta.per100g.kcal * factor;
    totals.p    += meta.per100g.p    * factor;
    totals.c    += meta.per100g.c    * factor;
    totals.g    += meta.per100g.g    * factor;
  });
  return {
    kcal: Math.round(totals.kcal),
    p:    Math.round(totals.p),
    c:    Math.round(totals.c),
    g:    Math.round(totals.g),
  };
}

// Gera o texto human-readable das refeições fixas a partir dos ingredientes escalados.
// Ex: "2 ovos inteiros mexidos (~100g) | 2 claras (~70g) | 25g pão integral | ..."
function renderIngredientLine(ing) {
  if (ing.qty != null) {
    // Contável: "{qty} {label singular|plural} (~{grams}g)"
    const label = typeof ing.label === 'object'
      ? (ing.qty === 1 ? ing.label.s : ing.label.p)
      : (ing.label || ing.key);
    return `${ing.qty} ${label} (~${Math.round(ing.grams)}g)`;
  }
  // Gramas puros: "{grams}g {label}"
  const label = typeof ing.label === 'string' ? ing.label : (ing.label && ing.label.s) || ing.key;
  return `${Math.round(ing.grams)}g ${label}`;
}

function renderMealFoodsText(meal) {
  const lines = meal.ingredients.map(renderIngredientLine);
  let text = lines.join(' | ');
  if (meal.extras)    text += ' | ' + meal.extras;
  if (meal.altOptions) text += '<br>' + meal.altOptions;
  return text;
}

// v2.1.40: portion scale iterativo com fixed-point.
//
// Antes (v2.0+): scale = target / 2000. Problema: a soma real das receitas
// no scale 1.0 não bate exatamente 2000 kcal (real é ~2098), e mais grave,
// duas não-linearidades compõem mal:
//   1. Refeições fixas têm "stickiness" de inteiros (round qty pra 1, 2, 3...
//      ovos/fatias) — quando você escala 0.88×, ainda dá 2 ovos. As fixas mal
//      reduzem com targets baixos.
//   2. Marmitas/jantares têm round-down (floor pra 10g) que tira ~3-5% kcal
//      sistematicamente.
// Combinado, em targets baixos o usuário ficava +6.6% acima da meta; em
// targets altos, -5% abaixo. Sem constante única que resolvesse os dois.
//
// Solução: fixed-point iteration. Estimamos o total diário com a média de
// marmita+jantar no scale candidato, comparamos com o target, e ajustamos
// o scale proporcionalmente. Convergência em 3-5 iterações. Cacheado por
// target value (a meta do usuário muda raramente).
//
// Resultado típico (vs target):
//   target 1800: ±2-3% (vs +6.6% antes)
//   target 2330: ±2-3% (vs -5% antes)
//   target 2826: ±2-5% (vs -5% antes)
const _portionScaleCache = {};
function _estimateDailyKcal(scale) {
  let total = 0;
  FIXED_MEAL_RECIPES.forEach(r => {
    total += computeMealMacros(scaleMealIngredients(r, scale).ingredients).kcal;
  });
  // Média de marmita+jantar no mesmo scale (representa o caso médio que
  // o usuário vai consumir; seleções específicas oscilam ±3-5% ao redor).
  const meanM = MARMITA_DEFS.reduce((a, m) => a + scaleMealDef(m, scale).kcal, 0) / MARMITA_DEFS.length;
  const meanD = DINNER_DEFS.reduce((a, d) => a + scaleMealDef(d, scale).kcal, 0) / DINNER_DEFS.length;
  return total + meanM + meanD;
}
function computePortionScale(goalsKcal) {
  if (!goalsKcal || goalsKcal <= 0) return 1;
  if (_portionScaleCache[goalsKcal] != null) return _portionScaleCache[goalsKcal];
  // Initial guess: target / 2098 (soma média das receitas no scale 1.0 — mais
  // próximo da realidade do que a constante antiga 2000).
  let scale = goalsKcal / 2098;
  for (let i = 0; i < 8; i++) {
    const actual = _estimateDailyKcal(scale);
    const diff = goalsKcal - actual;
    if (Math.abs(diff) < 3) break;
    scale = scale * (goalsKcal / actual);
  }
  _portionScaleCache[goalsKcal] = scale;
  return scale;
}

// v2.1.34/35: helper compartilhado que retorna uma cópia escalada de um def
// de marmita ou jantar. Aplica o portion scale (target / 2000) em:
//
//   ingredients[k]: rounding depende do unit do ingrediente em INGREDIENTS:
//     - unit === 'g' (ou ausente): FLOOR pra múltiplo de 10g, mín 10g.
//       Ex: 145g → 140g, 193g → 190g.
//     - countable (lata, un, fatias, scoop): round pra inteiro mais próximo,
//       mín 1. Ex: 2.83 fatias → 3, 1.4 latas → 1.
//
//   kcal/p/c/g: derivados via loss factor uniforme. O loss factor é a razão
//     (gramas_equivalentes_rounded / gramas_equivalentes_target) somando
//     TODOS os ingredientes (countables convertidos via grams_per_un do
//     catálogo). Esse approximation mantém consistência "macros derivados
//     do que está realmente no prato" sem precisar de per100g pra cada
//     ingrediente. lossFactor pode ser >1 (countables que arredondam pra
//     cima compensam grams que arredondam pra baixo, ex: jantar de atum).
//
//   recipe.aromatics[k]: linear, sem rounding (computeAromatics arredonda).
//   cooked string: regex \d+g → escala + floor-to-10.
//   recipe.items (texto das instruções): NÃO é escalado — fica receita-base.
function scaleMealDef(def, scale) {
  if (!def || scale === 1) return def;
  const scaled = { ...def };

  let lossFactor = 1;
  if (def.ingredients) {
    scaled.ingredients = {};
    let sumTargetG = 0, sumRoundedG = 0;
    Object.entries(def.ingredients).forEach(([k, v]) => {
      const meta = INGREDIENTS[k] || {};
      const isCountable = meta.unit && meta.unit !== 'g';
      const target = v * scale;
      let rounded, targetGrams, roundedGrams;
      if (isCountable) {
        rounded = Math.max(1, Math.round(target));
        // Pra loss factor: converte pra grams equivalentes via grams_per_un.
        // Sem grams_per_un, fallback usa 1 (tratamento neutro — não distorce).
        const gpu = meta.grams_per_un || 1;
        targetGrams  = target  * gpu;
        roundedGrams = rounded * gpu;
      } else {
        rounded = Math.max(10, Math.floor(target / 10) * 10);
        targetGrams  = target;
        roundedGrams = rounded;
      }
      scaled.ingredients[k] = rounded;
      sumTargetG  += targetGrams;
      sumRoundedG += roundedGrams;
    });
    if (sumTargetG > 0) lossFactor = sumRoundedG / sumTargetG;
  }

  scaled.kcal = Math.round(def.kcal * scale * lossFactor);
  scaled.p    = Math.round(def.p    * scale * lossFactor);
  scaled.c    = Math.round(def.c    * scale * lossFactor);
  scaled.g    = Math.round(def.g    * scale * lossFactor);

  if (def.recipe) {
    scaled.recipe = { ...def.recipe };
    if (def.recipe.aromatics) {
      scaled.recipe.aromatics = {};
      Object.entries(def.recipe.aromatics).forEach(([k, v]) => {
        scaled.recipe.aromatics[k] = v * scale;
      });
    }
  }
  if (def.cooked) {
    scaled.cooked = def.cooked.replace(/(\d+)\s*g\b/g, (m, num) => {
      const sg = Math.max(10, Math.floor((parseInt(num, 10) * scale) / 10) * 10);
      return `${sg}g`;
    });
  }
  return scaled;
}

// Helper: soma as necessidades de ingredientes a partir de um plano de marmitas + jantares
// Retorna { key: quantidadeTotal } somando todas as refeições selecionadas.
// scale (default 1) aplica o portion scale do usuário aos ingredientes via scaleMealDef.
function computeIngredientNeeds(marmitaPlan, dinnerPlan, scale = 1) {
  const needs = {};
  MARMITA_DEFS.forEach(m => {
    const qty = marmitaPlan[m.id] || 0;
    if (qty <= 0) return;
    const def = scaleMealDef(m, scale);
    Object.entries(def.ingredients).forEach(([k, raw]) => {
      needs[k] = (needs[k] || 0) + qty * raw;
    });
  });
  DINNER_DEFS.forEach(d => {
    const qty = dinnerPlan[d.id] || 0;
    if (qty <= 0) return;
    const def = scaleMealDef(d, scale);
    Object.entries(def.ingredients).forEach(([k, raw]) => {
      needs[k] = (needs[k] || 0) + qty * raw;
    });
  });
  return needs;
}

// ============================================================
// MARMITA PLANNER
// ============================================================
const MARMITA_DEFS = [
  { id: 'A', name: 'Marmita A - Frango', desc: 'Peito de frango grelhado + arroz branco',
    image: 'marmita-frango.jpg',
    cooked: '160g frango grelhado | 140g arroz branco cozido | 40g salada (alface + rúcula) | 80g pepino | 5ml azeite',
    kcal: 540, p: 52, c: 40, g: 14,
    ingredients: { frango: 215, arroz_branco: 56, alface: 40, pepino: 80 },
    recipe: {
      title: 'Frango Grelhado com Alho e Limão + Arroz à Grega',
      yield: 2,
      aromatics: { alho: 3, cebola: 0.5, limao: 0.5 },
      items: [
        '<b>Frango grelhado:</b>',
        'Tempere o peito de frango com 2 dentes de alho amassado, suco de 1/2 limão, páprica defumada, sal, pimenta-do-reino e um fio de azeite. Deixe marinar por 15-20 minutos.',
        'Grelhe em frigideira antiaderente bem quente por 4 minutos de cada lado, até dourar bem. Finalize com salsinha picada.',
        '<b>Arroz à grega:</b>',
        'Refogue 1/2 cebola picada em azeite até dourar. Acrescente 1 dente de alho amassado e o arroz lavado. Doure por 1 minuto.',
        'Adicione água quente, sal e 1 folha de louro. Cozinhe em fogo baixo tampado até secar. Finalize com cebolinha picada.'
      ]
    }
  },
  { id: 'B', name: 'Marmita B - Carne Moída', desc: 'Patinho moído + batata doce',
    image: 'marmita-carne-moida.jpg',
    cooked: '160g carne moída refogada | 160g batata doce cozida | 60g salada (alface + rúcula) | 60g pepino | 5ml azeite',
    kcal: 580, p: 46, c: 35, g: 24,
    ingredients: { carne_moida: 230, batata_doce: 180, alface: 60, pepino: 60 },
    recipe: {
      title: 'Carne Moída Refogada com Alho e Cebola + Batata Doce Assada ao Alecrim',
      yield: 3,
      aromatics: { alho: 3, cebola: 1 },
      items: [
        '<b>Carne moída:</b>',
        'Refogue 1 cebola picada em azeite até ficar translúcida. Adicione 3 dentes de alho amassado e mexa por 30 segundos.',
        'Acrescente o patinho moído e deixe dourar bem, quebrando com uma colher. Tempere com cominho, páprica defumada, sal, pimenta-do-reino e uma pitada de orégano.',
        'Finalize com cheiro-verde picado e um fio de molho inglês (opcional).',
        '<b>Batata doce assada:</b>',
        'Corte a batata doce em cubos médios. Tempere com azeite, alho picado, alecrim fresco, sal e pimenta.',
        'Asse em forno pré-aquecido a 200°C por 25-30 minutos, virando na metade do tempo, até dourar.'
      ]
    }
  },
  { id: 'C', name: 'Marmita C - Tilápia', desc: 'Filé de tilápia + arroz integral',
    image: 'marmita-tilapia.jpg',
    cooked: '200g tilápia grelhada | 130g arroz integral cozido | 50g salada (alface + rúcula) | 80g pepino | 5ml azeite',
    kcal: 530, p: 52, c: 34, g: 15,
    ingredients: { tilapia: 250, arroz_integral: 52, alface: 50, pepino: 80 },
    recipe: {
      title: 'Tilápia ao Molho de Limão e Ervas + Arroz Integral Perfumado',
      yield: 2,
      aromatics: { alho: 3, cebola: 0.25, limao: 1 },
      items: [
        '<b>Tilápia:</b>',
        'Tempere os filés com 2 dentes de alho amassado, suco de 1 limão, sal, pimenta-do-reino, ervas finas e um fio de azeite. Deixe marinar por 10 minutos.',
        'Grelhe em frigideira antiaderente bem quente por 3-4 minutos de cada lado, com cuidado para não quebrar.',
        'Finalize com azeite, alho frito crocante e salsinha picada. Esprema mais limão na hora de servir.',
        '<b>Arroz integral perfumado:</b>',
        'Refogue em azeite 1 dente de alho e 1/4 de cebola picada. Adicione o arroz integral lavado e doure por 1 minuto.',
        'Acrescente água quente, sal e 1 folha de louro. Cozinhe em fogo baixo por ~40 minutos até secar. Finalize com cebolinha.'
      ]
    }
  },
  { id: 'D', name: 'Marmita D - Lombo Suíno', desc: 'Lombo suíno grelhado + arroz branco',
    image: 'marmita-lombo.jpg',
    cooked: '160g lombo suíno grelhado | 140g arroz branco cozido | 40g salada (alface + rúcula) | 80g pepino | 5ml azeite',
    kcal: 570, p: 50, c: 44, g: 18,
    ingredients: { lombo: 215, arroz_branco: 56, alface: 40, pepino: 80 },
    recipe: {
      title: 'Lombo Suíno com Mostarda, Mel e Ervas + Arroz ao Alho',
      yield: 3,
      aromatics: { alho: 6 },
      items: [
        '<b>Lombo suíno:</b>',
        'Misture 1 colher de mostarda dijon, 1 colher de mel, 3 dentes de alho amassado, alecrim fresco, sal, pimenta-do-reino e azeite. Pincele generosamente no lombo.',
        'Deixe marinar por 30 minutos (ou até 2 horas para mais sabor).',
        'Asse em forno pré-aquecido a 180°C por 15-20 minutos, regando com o próprio caldo. Fatie contra as fibras antes de servir.',
        '<b>Arroz ao alho:</b>',
        'Doure 3 dentes de alho picado em azeite (cuidado para não queimar). Adicione o arroz lavado e refogue por 1 minuto.',
        'Acrescente água quente e sal. Cozinhe tampado em fogo baixo até secar. Finalize com salsinha picada.'
      ]
    }
  },
  { id: 'E', name: 'Marmita E - Sobrecoxa', desc: 'Sobrecoxa sem pele + mandioca cozida',
    image: 'marmita-sobrecoxa.jpg',
    cooked: '180g sobrecoxa sem pele grelhada | 130g mandioca cozida | 40g salada (alface + rúcula) | 80g pepino | 5ml azeite',
    kcal: 600, p: 48, c: 40, g: 26,
    ingredients: { sobrecoxa: 240, mandioca: 145, alface: 40, pepino: 80 },
    recipe: {
      title: 'Sobrecoxa Desossada ao Alho e Páprica Defumada + Mandioca Dourada',
      yield: 2,
      aromatics: { alho: 5, limao: 0.5 },
      items: [
        '<b>Sobrecoxa:</b>',
        'Tempere a sobrecoxa desossada com 3 dentes de alho amassado, páprica defumada, cominho, suco de 1/2 limão, sal, pimenta-do-reino e azeite. Marine por 30 minutos.',
        'Grelhe em frigideira antiaderente bem quente, 5-6 minutos de cada lado, até dourar e cozinhar por completo.',
        'Finalize com folhas de coentro ou salsinha.',
        '<b>Mandioca dourada:</b>',
        'Cozinhe a mandioca em água com sal até ficar macia (cerca de 20 minutos). Escorra.',
        'Em uma frigideira, aqueça azeite e refogue 2 dentes de alho picado até dourar. Adicione a mandioca cozida e salteie até pegar cor dourada. Finalize com cebolinha picada.'
      ]
    }
  },
  { id: 'F', name: 'Marmita F - Macarrão com Coxão Mole', desc: 'Coxão mole grelhado + macarrão integral',
    image: 'marmita-macarrao-coxao.jpg',
    cooked: '160g coxão mole grelhado | 130g macarrão integral cozido | 40g salada (alface + rúcula) | 80g pepino | 5ml azeite',
    kcal: 580, p: 50, c: 39, g: 25,
    ingredients: { coxao_mole: 215, macarrao_integral: 52, alface: 40, pepino: 80 },
    recipe: {
      title: 'Coxão Mole Grelhado ao Molho de Tomate + Macarrão ao Alho e Óleo',
      yield: 4,
      aromatics: { alho: 8, cebola: 0.5, polpa_tomate: 200 },
      items: [
        '<b>Coxão mole grelhado:</b>',
        'Fatie o coxão mole em bifes finos (~1cm). Tempere com 2 dentes de alho amassado, sal, pimenta-do-reino e um toque de shoyu light. Deixe pegar tempero por 15 minutos.',
        'Grelhe em frigideira bem quente por 1-2 minutos de cada lado, até selar e ficar suculento.',
        '<b>Molho de tomate caseiro:</b>',
        'Refogue 1/2 cebola picada no azeite até dourar. Acrescente 2 dentes de alho amassado.',
        'Adicione tomates maduros picados (ou 200g de polpa de tomate), manjericão fresco, orégano, sal e pimenta. Cozinhe em fogo baixo por 15 minutos mexendo ocasionalmente.',
        '<b>Macarrão ao alho e óleo:</b>',
        'Cozinhe o macarrão integral em água fervente com sal até ficar al dente. Reserve 1/2 xícara da água do cozimento.',
        'Em uma frigideira, aqueça azeite e doure 4 dentes de alho laminado em fogo baixo (cuidado para não queimar). Adicione pimenta calabresa a gosto.',
        'Acrescente o macarrão escorrido, um pouco da água do cozimento e mexa bem. Finalize com salsinha picada e cubra com o molho de tomate e o coxão mole fatiado.'
      ]
    }
  },
];

const DEFAULT_PLAN = {"A":0,"B":0,"C":0,"D":0,"E":0,"F":0};

// Dinner options
const DINNER_DEFS = [
  { id: 'O', name: 'Omelete Reforçada',
    desc: 'Omelete de peru ao queijo e ervas + torrada',
    image: 'jantar-omelete.jpg',
    kcal: 470, p: 37, c: 28, g: 23,
    ingredients: { ovos: 3, peito_peru: 50, mussarela: 20, pao_integral: 2, alface: 40, pepino: 60 },
    cooked: '3 ovos inteiros (~150g) | 50g peito de peru | 1 fatia mussarela (20g) | 2 fatias pão integral (~50g) | 5ml azeite',
    recipe: {
      title: 'Omelete de Peru ao Queijo e Ervas + Torrada com Alho',
      yield: 1,
      aromatics: { alho: 2 },
      items: [
        '<b>Omelete:</b>',
        'Corte 50g de peito de peru defumado em tirinhas. Refogue brevemente em frigideira antiaderente com 1 dente de alho picado, até perfumar.',
        'Bata 3 ovos inteiros com sal, pimenta-do-reino, salsinha picada e uma pitada de orégano.',
        'Despeje os ovos sobre o peru, abaixe o fogo e deixe firmar (~2 min).',
        'Adicione 1 fatia de mussarela (20g), tampe por 30 segundos até derreter. Dobre ao meio e sirva.',
        '<b>Torrada com alho:</b>',
        'Toste 2 fatias de pão integral. Esfregue com 1 dente de alho e pincele 2-3ml de azeite. Salpique orégano.',
        '<b>Acompanhamento:</b> Salada de folhas (alface + rúcula) com pepino fatiado, azeite e limão.'
      ]
    }
  },
  { id: 'T', name: 'Tapioca de Frango',
    desc: 'Tapioca recheada com frango cremoso',
    image: 'jantar-tapioca.jpg',
    kcal: 460, p: 42, c: 39, g: 11,
    ingredients: { goma_tapioca: 50, frango: 175, cottage: 30, alface: 40, pepino: 60 },
    cooked: '50g goma de tapioca | 130g frango desfiado cozido | 30g queijo cottage | Salada de folhas + pepino',
    recipe: {
      title: 'Tapioca Cremosa de Frango com Alho e Ervas',
      yield: 2,
      aromatics: { alho: 2, cebola: 0.25, tomate: 1 },
      items: [
        '<b>Frango cremoso:</b>',
        'Cozinhe 175g de peito de frango (cru) em água com sal, 1 dente de alho e 1 folha de louro. Desfie.',
        'Em frigideira antiaderente, refogue 1/4 de cebola picada e 1 dente de alho amassado com um fio de azeite (~3ml).',
        'Adicione o frango desfiado, 1 tomate picado sem sementes, páprica defumada, sal, pimenta-do-reino e cheiro-verde. Cozinhe por 5 minutos.',
        'Misture 30g de queijo cottage para dar cremosidade e desligue o fogo.',
        '<b>Tapioca:</b>',
        'Em frigideira antiaderente quente, espalhe 50g de goma de tapioca hidratada. Aguarde firmar por 1 minuto.',
        'Vire com cuidado e recheie com o frango cremoso. Dobre ao meio.',
        '<b>Acompanhamento:</b> Folhas de alface + rúcula + pepino fatiado ao lado.'
      ]
    }
  },
  { id: 'C', name: 'Carne com Arroz',
    desc: 'Alcatra grelhada ao alho + arroz perfumado',
    image: 'jantar-carne.jpg',
    kcal: 480, p: 36, c: 30, g: 20,
    ingredients: { alcatra: 175, arroz_branco: 40, alface: 40, pepino: 60 },
    cooked: '130g alcatra grelhada | 100g arroz branco cozido | Salada de folhas + pepino | 5ml azeite',
    recipe: {
      title: 'Alcatra Grelhada ao Alho com Arroz Perfumado',
      yield: 1,
      aromatics: { alho: 3, cebola: 0.25 },
      items: [
        '<b>Alcatra grelhada:</b>',
        'Tempere 175g de alcatra (cru) com 2 dentes de alho amassado, sal, pimenta-do-reino, 1 colher de chá de molho inglês e uma pitada de ervas finas. Deixe 10 minutos.',
        'Aqueça uma frigideira antiaderente em fogo alto. Grelhe a carne por 2-3 minutos de cada lado, sem mexer, até selar e ficar suculenta.',
        'Finalize com flor de sal e um toque de azeite.',
        '<b>Arroz perfumado:</b>',
        'Refogue 1 dente de alho picado e 1/4 de cebola em 3ml de azeite. Adicione 40g de arroz branco lavado e doure por 1 minuto.',
        'Acrescente água quente, sal e 1 folha de louro. Cozinhe tampado em fogo baixo até secar. Finalize com salsinha.',
        '<b>Salada:</b> Mix de folhas + pepino fatiado, temperado com limão e 2ml de azeite.'
      ]
    }
  },
  { id: 'A', name: 'Torrada de Atum com Ovos',
    desc: 'Atum com ovos cozidos + torrada',
    image: 'jantar-atum.jpg',
    kcal: 470, p: 51, c: 23, g: 17,
    ingredients: { atum_lata: 1, ovos: 2, pao_integral: 2, requeijao: 15, alface: 40, pepino: 60 },
    cooked: '120g atum em água drenado (1 lata) | 2 ovos cozidos (~100g) | 2 fatias pão integral (~50g) | 15g requeijão cremoso | Folhas + pepino',
    recipe: {
      title: 'Atum com Ovos Cozidos e Torradas (prático e rápido)',
      yield: 1,
      aromatics: { limao: 0.25 },
      items: [
        '<b>Atum com ovos:</b>',
        'Cozinhe 2 ovos por 8-9 minutos em água fervente. Resfrie em água gelada, descasque e fatie ou corte em quartos.',
        'Escorra bem 1 lata de atum em água. Coloque em um prato e tempere com gotas de limão, sal, pimenta-do-reino e cebolinha picada.',
        'Misture o atum com os ovos fatiados. Opcional: adicionar 1 colher de iogurte natural sem açúcar para cremosidade.',
        '<b>Torradas:</b>',
        'Toste 2 fatias de pão integral na torradeira ou frigideira antiaderente.',
        'Passe 15g de requeijão cremoso em cada fatia (~7g por fatia).',
        '<b>Acompanhamento:</b>',
        'Salada de folhas (alface + rúcula) e pepino fatiado ao lado, temperado com limão e uma pitada de sal.'
      ]
    }
  },
  { id: 'S', name: 'Sanduíche Natural de Frango',
    desc: 'Pão integral + frango desfiado + queijo',
    image: 'jantar-sanduiche.jpg',
    kcal: 450, p: 45, c: 33, g: 13,
    saladEmbedded: true,
    ingredients: { frango: 134, pao_integral: 3, queijo_minas: 20, requeijao: 15, alface: 40, pepino: 60 },
    cooked: '100g frango desfiado cozido | 3 fatias pão integral (~75g) | 20g queijo minas frescal | 15g requeijão cremoso | Folhas + pepino',
    recipe: {
      title: 'Sanduíche Natural Cremoso de Frango',
      yield: 1,
      aromatics: { alho: 1 },
      items: [
        '<b>Frango desfiado:</b>',
        'Cozinhe 134g de peito de frango (cru) em água com sal, 1 dente de alho e 1 folha de louro por ~15 minutos.',
        'Desfie e tempere com sal, pimenta-do-reino, cebolinha picada e 1 colher de iogurte natural ou 10g de requeijão para cremosidade.',
        '<b>Montagem:</b>',
        'Toste levemente 3 fatias de pão integral (forma ou artesanal).',
        'Passe os 15g restantes de requeijão cremoso em uma das fatias.',
        'Monte: pão + frango desfiado + 20g de queijo minas fatiado + folhas de alface + pepino em rodelas finas + outra fatia.',
        'Pode ser feito em sanduíche duplo (2 andares) com a 3ª fatia no meio para mais saciedade.',
        'Finalize com um fio de azeite e pimenta-do-reino.'
      ]
    }
  },
  { id: 'W', name: 'Wrap de Frango',
    desc: 'Tortilla integral + frango cremoso + queijo',
    image: 'jantar-wrap.jpg',
    kcal: 475, p: 44, c: 38, g: 12,
    saladEmbedded: true,
    ingredients: { frango: 134, tortilla: 2, cottage: 30, queijo_minas: 20, alface: 40, pepino: 60 },
    cooked: '2 tortillas integrais (~80g) | 100g frango desfiado cozido | 30g queijo cottage | 20g queijo minas frescal | Folhas + pepino',
    recipe: {
      title: 'Wrap Cremoso de Frango ao Limão',
      yield: 1,
      aromatics: { alho: 2, cebola: 0.25, limao: 0.5 },
      items: [
        '<b>Frango cremoso:</b>',
        'Cozinhe 134g de peito de frango (cru) em água com sal, alho e 1 folha de louro. Desfie.',
        'Em frigideira antiaderente, refogue 1 dente de alho picado e 1/4 de cebola em 3ml de azeite.',
        'Adicione o frango desfiado, páprica defumada, sal, pimenta-do-reino e suco de 1/2 limão. Cozinhe por 5 minutos.',
        'Desligue o fogo e misture 30g de cottage para dar cremosidade. Finalize com cheiro-verde picado.',
        '<b>Montagem:</b>',
        'Aqueça 2 tortillas integrais levemente em frigideira antiaderente seca (30 segundos de cada lado), para ficarem maleáveis.',
        'Recheie cada uma com metade do frango cremoso, 10g de queijo minas frescal ralado ou em cubinhos, folhas de alface e pepino em palitos finos.',
        'Enrole firmemente, dobrando as laterais para dentro primeiro. Corte ao meio na diagonal para servir.'
      ]
    }
  },
];

const DEFAULT_DINNER_PLAN = {"O":0,"T":0,"C":0,"A":0,"S":0,"W":0};

// Scale recipe aromatics by user's plan and aggregate. Aromatics are defined per-batch
// (see `yield` and `aromatics` in each recipe). Returns totals in the unit each field uses
// (alho in dentes, cebola/limao/tomate in unidades, polpa_tomate in gramas).
// portionScale (default 1) escala os aromáticos junto com os ingredientes,
// pra manter consistência com o portion scale do usuário (v2.1.34).
function computeAromatics(marmitaPlan, dinnerPlan, portionScale = 1) {
  const totals = { alho: 0, cebola: 0, limao: 0, tomate: 0, polpa_tomate: 0 };
  const accumulate = (defs, plan) => {
    defs.forEach(item => {
      const qty = plan[item.id] || 0;
      const def = scaleMealDef(item, portionScale);
      const r = def.recipe;
      if (qty <= 0 || !r || !r.yield || !r.aromatics) return;
      const yieldScale = qty / r.yield;
      Object.keys(totals).forEach(k => {
        if (r.aromatics[k]) totals[k] += r.aromatics[k] * yieldScale;
      });
    });
  };
  accumulate(MARMITA_DEFS, marmitaPlan);
  accumulate(DINNER_DEFS, dinnerPlan);
  return totals;
}

function getMarmitaPlan() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.marmitaPlan) || JSON.stringify(DEFAULT_PLAN));
}

function getDinnerPlan() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.dinnerPlan) || JSON.stringify(DEFAULT_DINNER_PLAN));
}

// ============================================================
// MENU GENERATOR (from home stock)
// ============================================================
// GEN_* constants são DERIVADAS das receitas (MARMITA_DEFS / DINNER_DEFS) + INGREDIENTS.
// Cada entrada reflete exatamente o que está registrado nas receitas — se você mudar o
// frango da Marmita A de 215g para 220g, o gerador ajusta automaticamente.

// GEN_PROTEINS: para cada marmita, a proteína principal. Se a mesma proteína também é
// usada por algum jantar (ex.: frango em Marmita A + Sanduíche/Wrap/Tapioca), a entrada
// ganha dinnerAlt/dinnerRawPerUnit (menor raw) para a geração compartilhada.
function deriveGenProteins() {
  return MARMITA_DEFS.map(m => {
    const entry = Object.entries(m.ingredients).find(([k]) => INGREDIENTS[k]?.role === 'protein');
    if (!entry) return null;
    const [key, rawPerUnit] = entry;
    const meta = INGREDIENTS[key];
    const result = { key, label: meta.label, marmita: m.id, rawPerUnit };
    // Dinner compartilhado com essa proteína — usa o que consome MENOS (mais flexível)
    const dinnersUsing = DINNER_DEFS.filter(d => d.ingredients[key] !== undefined);
    if (dinnersUsing.length > 0) {
      const best = dinnersUsing.reduce((min, d) =>
        (d.ingredients[key] < min.ingredients[key]) ? d : min
      );
      result.dinnerAlt = best.id;
      result.dinnerRawPerUnit = best.ingredients[key];
    }
    return result;
  }).filter(Boolean);
}
const GEN_PROTEINS = deriveGenProteins();

// Return the marmita name prefixed with "Marmita de", e.g. "Marmita A - Frango" -> "Marmita de Frango"
function getMarmitaTypeName(id) {
  const m = MARMITA_DEFS.find(x => x.id === id);
  if (!m) return 'Marmita ' + id;
  const parts = m.name.split(' - ');
  const type = parts.length > 1 ? parts[1] : m.name;
  return 'Marmita de ' + type;
}

function getDinnerTypeName(id) {
  const d = DINNER_DEFS.find(x => x.id === id);
  return d ? 'Jantar de ' + d.name : 'Jantar ' + id;
}

// GEN_CARBS: carboidratos únicos usados pelas marmitas (rastreados como estoque).
function deriveGenCarbs() {
  const seen = new Set();
  const result = [];
  MARMITA_DEFS.forEach(m => {
    Object.keys(m.ingredients).forEach(k => {
      if (INGREDIENTS[k]?.role === 'carb' && !seen.has(k)) {
        seen.add(k);
        result.push({ key: k, label: INGREDIENTS[k].label });
      }
    });
  });
  return result;
}
const GEN_CARBS = deriveGenCarbs();

// GEN_DINNER_PROTEINS: para cada jantar, a proteína exclusiva (não compartilhada com
// marmitas nem com outros jantares). Ex.: atum_lata só no Jantar A; alcatra só no C;
// peito_peru só no O. Frango (compartilhado) e ovos (proteína-share) ficam fora.
function deriveGenDinnerProteins() {
  // Quais proteínas são usadas por marmitas (para excluir)
  const marmitaProteins = new Set();
  MARMITA_DEFS.forEach(m => {
    Object.keys(m.ingredients).forEach(k => {
      if (INGREDIENTS[k]?.role === 'protein') marmitaProteins.add(k);
    });
  });
  // Quantos jantares usam cada proteína (para excluir as compartilhadas entre dinners)
  const proteinDinnerCount = {};
  DINNER_DEFS.forEach(d => {
    Object.keys(d.ingredients).forEach(k => {
      if (INGREDIENTS[k]?.role === 'protein') {
        proteinDinnerCount[k] = (proteinDinnerCount[k] || 0) + 1;
      }
    });
  });
  const result = [];
  DINNER_DEFS.forEach(d => {
    const primary = Object.entries(d.ingredients).find(([k]) => {
      const role = INGREDIENTS[k]?.role;
      if (role !== 'protein') return false;
      if (marmitaProteins.has(k)) return false;
      if (proteinDinnerCount[k] > 1) return false;
      return true;
    });
    if (primary) {
      const [key, rawPerUnit] = primary;
      const meta = INGREDIENTS[key];
      result.push({ key, label: meta.label, dinner: d.id, rawPerUnit, unit: meta.unit });
    }
  });
  return result;
}
const GEN_DINNER_PROTEINS = deriveGenDinnerProteins();

// GEN_SHARED_DINNER_PROTEINS: proteínas com role 'protein-share' usadas em 2+ jantares.
// Ex.: ovos (Omelete O: 3 un + Torrada de Atum A: 2 un). Hint monta dinamicamente.
function deriveGenSharedDinnerProteins() {
  const result = [];
  Object.entries(INGREDIENTS).forEach(([k, meta]) => {
    if (meta.role !== 'protein-share') return;
    const dinnersUsing = DINNER_DEFS.filter(d => d.ingredients[k] !== undefined);
    if (dinnersUsing.length === 0) return;
    const hint = dinnersUsing
      .map(d => `${d.name}: ${d.ingredients[k]} ${meta.unit}/jantar`)
      .join(' • ');
    result.push({ key: k, label: meta.label, unit: meta.unit, sharedHint: hint });
  });
  return result;
}
const GEN_SHARED_DINNER_PROTEINS = deriveGenSharedDinnerProteins();

// GEN_DINNER_OTHERS: ingredientes não-proteína e não-salada usados por jantares, e que
// ainda não estão em GEN_CARBS (evita duplicar arroz_branco etc. no formulário).
function deriveGenDinnerOthers() {
  const carbsSeen = new Set(GEN_CARBS.map(c => c.key));
  const seen = new Set();
  const result = [];
  DINNER_DEFS.forEach(d => {
    Object.keys(d.ingredients).forEach(k => {
      const role = INGREDIENTS[k]?.role;
      if (!role) return;
      if (role === 'protein' || role === 'protein-share' || role === 'veg') return;
      if (carbsSeen.has(k)) return;
      if (seen.has(k)) return;
      seen.add(k);
      result.push({ key: k, label: INGREDIENTS[k].label, unit: INGREDIENTS[k].unit });
    });
  });
  return result;
}
const GEN_DINNER_OTHERS = deriveGenDinnerOthers();

// Breakfast/snack ingredients: stock only
const GEN_SNACKS = [
  { key: 'iogurte_grego',  label: 'Iogurte grego natural', unit: 'g' },
  { key: 'aveia',          label: 'Aveia em flocos',     unit: 'g' },
];

// Fruits: perfectly substitutable across meals (breakfast + morning snack + afternoon snack)
// User inputs stock in GRAMS. System converts internally:
//   porções = grams / gPerPorcao    (1 porção = 1 serving from the Marmitas tab table)
//   carbs   = grams * (c / gPerPorcao)
// c = carbs (g) per porção (used to budget the weekly carb target from fruits).
const GEN_FRUITS = [
  { key: 'banana',   label: 'Banana prata',  unit: 'g', c: 16, gPerPorcao: 70  },
  { key: 'maca',     label: 'Maçã',          unit: 'g', c: 20, gPerPorcao: 150 },
  { key: 'mamao',    label: 'Mamão papaya',  unit: 'g', c: 13, gPerPorcao: 120 },
  { key: 'uva',      label: 'Uva',           unit: 'g', c: 18, gPerPorcao: 100 },
  { key: 'morango',  label: 'Morango',       unit: 'g', c: 12, gPerPorcao: 150 },
  { key: 'abacaxi',  label: 'Abacaxi',       unit: 'g', c: 13, gPerPorcao: 100 },
  { key: 'melancia', label: 'Melancia',      unit: 'g', c: 15, gPerPorcao: 200 },
  { key: 'laranja',  label: 'Laranja',       unit: 'g', c: 17, gPerPorcao: 150 },
  { key: 'pera',     label: 'Pera',          unit: 'g', c: 23, gPerPorcao: 150 },
  { key: 'kiwi',     label: 'Kiwi',          unit: 'g', c: 15, gPerPorcao: 100 },
];
const FRUIT_KEYS = GEN_FRUITS.map(f => f.key);
// Carb budget: 42 porções × avg carbs per porção. Targets grams of fruit-carbs per week.
const FRUIT_AVG_CARB = GEN_FRUITS.reduce((s, f) => s + f.c, 0) / GEN_FRUITS.length; // ~16.2g
const FRUIT_WEEKLY_CARB_NEED = Math.round(42 * FRUIT_AVG_CARB); // ~680g C/week

// Rotated weekly sets to bring variety to shopping suggestions. Each set favors low/mid
// tier fruits (cutting diet) and spans tiers for variety.
const FRUIT_SUGGESTION_SETS = [
  ['banana',  'mamao',    'morango'],
  ['banana',  'melancia', 'abacaxi'],
  ['laranja', 'mamao',    'kiwi'   ],
  ['banana',  'uva',      'morango'],
];
