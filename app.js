// ==================================================================
// app.js — Lógica da aplicação (render, auth, geração, UI).
// Carregado depois de data.js via <script src="app.js">.
// ==================================================================

// ============================================================
// CUSTOM CONFIRM (v2.1.24) — substitui window.confirm() por modal
// async. Retorna Promise<boolean>. Suporta título, texto multi-linha
// (\n preservado via white-space:pre-wrap), e variante perigosa
// (botão OK em vermelho via classe .danger no .confirm-dialog).
// ============================================================
function customConfirm(message, opts = {}) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-modal');
    const dialog  = overlay.querySelector('.confirm-dialog');
    const titleEl = document.getElementById('confirm-title');
    const msgEl   = document.getElementById('confirm-message');
    const okBtn   = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    titleEl.textContent = opts.title || 'Confirmar';
    msgEl.textContent = message;
    okBtn.textContent = opts.okLabel || 'Confirmar';
    cancelBtn.textContent = opts.cancelLabel || 'Cancelar';
    dialog.classList.toggle('danger', !!opts.danger);

    overlay.classList.add('open');

    const cleanup = (result) => {
      overlay.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onOk     = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onOverlayClick = (e) => { if (e.target === overlay) cleanup(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') cleanup(false);
      else if (e.key === 'Enter') cleanup(true);
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKey);
  });
}

// ============================================================
// TAB NAVIGATION
// ============================================================
const TABS = ['marmitas','compras','dieta','treino','calendário'];

// v2.1.0: tab bar mapeada pra glyphs Lucide (via glyph() em glyphs.js).
// Cada entry: { key: TABS[i], label: string, icon: glyph name }.
const TAB_META = [
  { key: 'marmitas',   label: 'Marmitas', icon: 'utensils' },
  { key: 'compras',    label: 'Compras',  icon: 'shopping-cart' },
  { key: 'dieta',      label: 'Dieta',    icon: 'apple' },
  { key: 'treino',     label: 'Treino',   icon: 'dumbbell' },
  { key: 'calendário', label: 'Agenda',   icon: 'calendar' },
];

function renderTabBar() {
  const nav = document.getElementById('tab-bar');
  if (!nav) return;
  const activeTab = document.querySelector('.page.active');
  const activeKey = activeTab ? activeTab.id.replace('page-', '') : 'marmitas';
  nav.innerHTML = TAB_META.map(t => {
    const isActive = t.key === activeKey;
    return `<button class="tab-btn${isActive ? ' active' : ''}" onclick="switchTab('${t.key}')" aria-label="${t.label}">
      <span class="icon">${glyph(t.icon, 22)}</span>
      <span class="label">${t.label}</span>
    </button>`;
  }).join('');
}

function switchTab(tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  const idx = TABS.indexOf(tab);
  const btns = document.querySelectorAll('.tab-btn');
  if (btns[idx]) btns[idx].classList.add('active');
  if (tab === 'calendário') { renderCalendar(); showDayDetail(localDateStr()); }
  window.scrollTo(0, 0);
}

// ============================================================
// MARMITA TABS
// ============================================================
function showMarmita(idx) {
  document.querySelectorAll('.marmita-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  document.querySelectorAll('.marmita-content').forEach((c, i) => c.classList.toggle('active', i === idx));
}

// ============================================================
// DAILY MEAL TRACKER
// ============================================================
// v2.0: refeições fixas vivem em FIXED_MEAL_RECIPES (data.js) como ingredientes
// estruturados escalados pelo target. Aqui só ficam os metadados de ordem/layout
// e as refeições dinâmicas (almoço/jantar) que saem do planner de marmitas.

// Retorna o fator de escala aplicado aos baseGrams das refeições fixas.
// scale = meta_kcal / DEFAULT_GOALS.kcal (2000). Se não houver perfil/goals,
// devolve 1 (sem escala, equivalente à base de 2000 kcal).
function getPortionScale() {
  try { return computePortionScale(getGoals().kcal); }
  catch (e) { return 1; }
}

// Constrói a refeição fixa escalada para a meta atual do usuário.
// Retorna o mesmo shape que o resto do app consome: {id, time, name, desc, foods, kcal, p, c, g, color}.
function buildFixedMeal(recipeId) {
  const recipe = FIXED_MEAL_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return null;
  const scale = getPortionScale();
  const scaled = scaleMealIngredients(recipe, scale);
  const macros = computeMealMacros(scaled.ingredients);
  return {
    id: recipe.id,
    time: recipe.time,
    name: recipe.name,
    desc: recipe.desc,
    color: recipe.color,
    foods: renderMealFoodsText(scaled),
    ...macros,
  };
}

function getMeals() {
  // Monta o texto da salada. Para refeições com saladEmbedded (ex: sanduíche, wrap),
  // mostra nota de que folhas/pepino já estão inclusos. Para as demais, calcula a média
  // de alface/pepino a partir de ingredients.
  function buildSaladText(defs, selections, defaults) {
    if (selections.length === 0) {
      return `<br><b>+ Salada:</b> ~${defaults.alface}g folhas (alface + rúcula) + ~${defaults.pepino}g pepino fatiado + ${defaults.azeite}ml azeite de oliva`;
    }
    const sideSel = [];
    const embeddedDefs = [];
    selections.forEach(type => {
      const def = defs.find(x => x.id === type);
      if (!def) return;
      if (def.saladEmbedded) {
        if (!embeddedDefs.find(d => d.id === def.id)) embeddedDefs.push(def);
      } else {
        sideSel.push(def);
      }
    });

    let html = '';
    if (sideSel.length > 0) {
      let totalAlface = 0, totalPepino = 0;
      sideSel.forEach(def => {
        totalAlface += (def.ingredients && def.ingredients.alface) || defaults.alface;
        totalPepino += (def.ingredients && def.ingredients.pepino) || defaults.pepino;
      });
      const n = sideSel.length;
      html += `<br><b>+ Salada:</b> ~${Math.round(totalAlface/n)}g folhas (alface + rúcula) + ~${Math.round(totalPepino/n)}g pepino fatiado + ${defaults.azeite}ml azeite de oliva`;
    }
    if (embeddedDefs.length > 0) {
      const names = embeddedDefs.map(d => d.name).join(' / ');
      html += `<br><i style="color:var(--gray-mid);font-size:11px">Folhas e pepino já inclusos no ${names}</i>`;
    }
    return html;
  }

  // Build lunch (marmita)
  const selections = getTodaySelections();
  const lunchSalad = buildSaladText(MARMITA_DEFS, selections, { alface: 50, pepino: 80, azeite: 5 });
  let lunch;
  if (selections.length === 0) {
    lunch = { id: 'almoco', time: '13h', name: 'Almoço (Marmita)',
        desc: 'Selecione acima', foods: 'Escolha a marmita do dia no card acima' + lunchSalad,
        kcal: 0, p: 0, c: 0, g: 0, color: 'var(--green)' };
  } else {
    let kcal = 0, p = 0, c = 0, g = 0;
    const names = [];
    const grouped = {};
    selections.forEach(t => { grouped[t] = (grouped[t] || 0) + 1; });
    Object.entries(grouped).forEach(([type, count]) => {
      const def = MARMITA_DEFS.find(x => x.id === type);
      if (!def) return;
      kcal += def.kcal * count; p += def.p * count; c += def.c * count; g += def.g * count;
      names.push(count > 1 ? `${count}x ${def.name.split(' - ')[1]}` : def.name.split(' - ')[1]);
    });
    const n = selections.length;
    lunch = { id: 'almoco', time: '13h', name: 'Almoço (' + names.join(' + ') + ')',
        desc: 'Média por pessoa', foods: names.join(' + ') + lunchSalad,
        kcal: Math.round(kcal/n), p: Math.round(p/n), c: Math.round(c/n), g: Math.round(g/n),
        color: 'var(--green)' };
  }

  // Build dinner
  const dSel = getTodayDinnerSelections();
  const dinnerSalad = buildSaladText(DINNER_DEFS, dSel, { alface: 40, pepino: 60, azeite: 5 });
  let dinner;
  if (dSel.length === 0) {
    dinner = { id: 'jantar', time: '20h', name: 'Jantar',
        desc: 'Selecione acima', foods: 'Escolha o jantar do dia no card acima' + dinnerSalad,
        kcal: 0, p: 0, c: 0, g: 0, color: 'var(--purple)' };
  } else {
    let kcal = 0, p = 0, c = 0, g = 0;
    const names = [];
    const grouped = {};
    dSel.forEach(t => { grouped[t] = (grouped[t] || 0) + 1; });
    Object.entries(grouped).forEach(([type, count]) => {
      const def = DINNER_DEFS.find(x => x.id === type);
      if (!def) return;
      kcal += def.kcal * count; p += def.p * count; c += def.c * count; g += def.g * count;
      names.push(count > 1 ? `${count}x ${def.name}` : def.name);
    });
    const n = dSel.length;
    dinner = { id: 'jantar', time: '20h', name: 'Jantar (' + names.join(' + ') + ')',
        desc: 'Média por pessoa', foods: names.join(' + ') + dinnerSalad,
        kcal: Math.round(kcal/n), p: Math.round(p/n), c: Math.round(c/n), g: Math.round(g/n),
        color: 'var(--purple)' };
  }

  // Ordem final do dia: café → lanche1 → almoço → lanche2 → jantar → pré-sono
  // Refeições fixas (café/lanche1/lanche2/pré-sono) vêm escaladas pelo target atual.
  return [
    buildFixedMeal('cafe'),
    buildFixedMeal('lanche1'),
    lunch,
    buildFixedMeal('lanche2'),
    dinner,
    buildFixedMeal('presono'),
  ];
}
// Metas diárias derivadas do user_profile (Mifflin-St Jeor + atividade + meta).
// Se o perfil estiver incompleto ou faltando, caímos para DEFAULT_GOALS (definido
// em data.js). A função é chamada dinamicamente porque o perfil pode mudar
// em runtime (via onboarding, futura edição de perfil, ou sync do Firestore).
function getGoals() {
  return computeGoals(getUserProfile()) || DEFAULT_GOALS;
}

// Helper: local date string YYYY-MM-DD (avoids UTC timezone issues)
function localDateStr(date) {
  const d = date || new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getTodayKey() {
  const d = new Date();
  return `meals_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getTodayDateStr() {
  const d = new Date();
  const dias = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
  return `${dias[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getSavedMeals() {
  return JSON.parse(localStorage.getItem(getTodayKey()) || '{}');
}

function renderMeals() {
  const saved = getSavedMeals();
  const container = document.getElementById('meals-container');
  let html = '';

  const goals = getGoals();
  const perMealP = goals.perMealP || 0;
  // v2.1.0: mapeia id → glyph. Refeições compartilham keys estáveis.
  const MEAL_GLYPHS = {
    cafe: 'coffee', lanche1: 'sun', almoco: 'salad',
    lanche2: 'cookie', jantar: 'soup', presono: 'moon',
  };
  getMeals().forEach(m => {
    const eaten = saved[m.id] || false;
    // v2.0.4: classificação de proteína por refeição (Schoenfeld & Aragon 2018)
    let pClass = 'p-mid';
    if (perMealP > 0 && m.p > 0) {
      const ratio = m.p / perMealP;
      if (ratio >= 1.0)      pClass = 'p-ok';
      else if (ratio >= 0.6) pClass = 'p-mid';
      else                   pClass = 'p-low';
    }
    const glyphName = MEAL_GLYPHS[m.id] || 'salad';
    // v2.1.20: almoço verde (default), jantar roxo, demais (snacks) amarelo
    let mealClass = 'meal';
    if (m.id === 'jantar') mealClass += ' dinner';
    else if (m.id !== 'almoco') mealClass += ' snack';
    html += `<div class="${mealClass} ${eaten ? 'eaten' : ''}" onclick="toggleMeal('${m.id}')">
      <div class="meal-head">
        <div class="meal-glyph">${glyph(glyphName, 20)}</div>
        <div class="meal-title-wrap">
          <div class="time">${m.time} · ${m.name}</div>
          <div class="title">${m.desc}</div>
        </div>
        <div class="meal-check">${glyph('check', 14, '#fff', 3)}</div>
      </div>
      <div class="foods">${m.foods}</div>
      <div class="macros-sm">
        <span class="macro-pill kcal">${m.kcal} kcal</span>
        <span class="macro-pill ${pClass}">${m.p}g P</span>
        <span class="macro-pill">${m.c}g C</span>
        <span class="macro-pill">${m.g}g G</span>
      </div>
    </div>`;
  });

  container.innerHTML = html;
  updateDailyProgress();
}

function toggleMeal(id) {
  const saved = getSavedMeals();
  saved[id] = !saved[id];
  localStorage.setItem(getTodayKey(), JSON.stringify(saved));
  renderMeals();
}

function updateDailyProgress() {
  const saved = getSavedMeals();
  const meals = getMeals();

  // consumido = soma das refeições marcadas como comidas
  let consumedKcal = 0, consumedP = 0, consumedC = 0, consumedG = 0, count = 0;
  meals.forEach(m => {
    if (saved[m.id]) {
      consumedKcal += m.kcal; consumedP += m.p; consumedC += m.c; consumedG += m.g; count++;
    }
  });

  const dateEl = document.getElementById('diet-date');
  if (dateEl) dateEl.textContent = getTodayDateStr();
  const mcEl = document.getElementById('meals-count');
  if (mcEl) mcEl.textContent = `${count} de ${meals.length} refeições realizadas`;

  const goals = getGoals();

  // v2.1.0: donut SVG pra kcal + linhas textuais pra macros
  renderKcalDonut(consumedKcal, goals.kcal);
  renderMacroLines({
    p: consumedP, c: consumedC, g: consumedG,
  }, goals);

  renderDietHeader(goals);
}

// v2.1.0: donut SVG pra kcal. Círculo externo verde, fundo cinza claro,
// número + unidade no centro. Tamanho 120x120 pra ser compacto no mobile.
function renderKcalDonut(consumed, goal) {
  const el = document.getElementById('donut-kcal');
  if (!el) return;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 48;
  const stroke = 12;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(1, goal > 0 ? consumed / goal : 0);
  const dashOffset = circ * (1 - pct);
  const pctLabel = Math.round(pct * 100);
  const consumedFmt = consumed.toLocaleString('pt-BR');
  const goalFmt = goal.toLocaleString('pt-BR');

  el.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="kcal-donut">
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
              stroke="var(--gray-light)" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
              stroke="var(--green-primary)" stroke-width="${stroke}"
              stroke-linecap="round"
              stroke-dasharray="${circ.toFixed(2)}"
              stroke-dashoffset="${dashOffset.toFixed(2)}"
              transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy - 6}" text-anchor="middle"
            font-size="22" font-weight="700" fill="var(--ink-strong)">${pctLabel}%</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle"
            font-size="10" font-weight="500" fill="var(--ink-medium)">${consumedFmt} / ${goalFmt}</text>
      <text x="${cx}" y="${cy + 26}" text-anchor="middle"
            font-size="9" font-weight="500" fill="var(--ink-soft)">kcal</text>
    </svg>
  `;
}

// v2.1.0: 3 linhas textuais pra macros P/C/G com dot colorido e barra inline.
function renderMacroLines(consumed, goals) {
  const el = document.getElementById('macro-lines');
  if (!el) return;
  const rows = [
    { key: 'p', label: 'Proteína', color: 'var(--green-primary)', val: consumed.p, max: goals.p, unit: 'g' },
    { key: 'c', label: 'Carbo',    color: 'var(--accent-warm)',   val: consumed.c, max: goals.c, unit: 'g' },
    { key: 'g', label: 'Gordura',  color: 'var(--purple-soft)',   val: consumed.g, max: goals.g, unit: 'g' },
  ];
  el.innerHTML = rows.map(r => {
    const pct = Math.min(100, r.max > 0 ? Math.round(r.val / r.max * 100) : 0);
    return `
      <div class="macro-line">
        <div class="macro-line-head">
          <span class="macro-dot" style="background:${r.color}"></span>
          <span class="macro-label">${r.label}</span>
          <span class="macro-values">${r.val}/${r.max}${r.unit} <b>${pct}%</b></span>
        </div>
        <div class="macro-line-bar">
          <div class="macro-line-fill" style="width:${pct}%;background:${r.color}"></div>
        </div>
      </div>
    `;
  }).join('');
}

// v2.1.3: renderDietBalance removido completamente. A linha de "Plano do dia
// vs meta" confundia o usuário, e os elementos auxiliares (meta de P por
// refeição, diet break hint) também foram considerados ruído. A informação
// de perMealP e o diet break hint ficam disponíveis via modal de detalhes do
// cálculo se necessário — não poluem o daily tracker.

// Atualiza o subtítulo da aba Dieta com a meta dinâmica derivada do perfil.
function renderDietHeader(goals) {
  const el = document.getElementById('diet-goal-text');
  if (!el) return;
  const g = goals || getGoals();
  const dir = getGoalDirection(getUserProfile());
  const objetivo = dir === 'loss'     ? 'Perda de Gordura'
                 : dir === 'gain'     ? 'Ganho de Massa'
                 : dir === 'maintain' ? 'Manutenção'
                 : 'Perda de Gordura e Ganho de Massa';
  const kcalTxt = g.kcal.toLocaleString('pt-BR');
  // Fibra + água: duas novas metas derivadas de literatura (v2.0.3).
  // Renderizadas em linha separada com fonte menor pra não poluir o header.
  const fiberTxt = g.fiber != null ? `${g.fiber}g` : '≥25g';
  const waterLiters = g.water_ml != null ? (g.water_ml / 1000).toFixed(1).replace('.', ',') : '2,5';
  // v2.0.5: link "ⓘ" abre o modal com breakdown completo do cálculo
  const infoLink = getUserProfile()
    ? ` <a href="#" onclick="openCalcDetails();return false" class="calc-details-link" aria-label="Ver detalhes do cálculo">ⓘ Detalhes</a>`
    : '';
  el.innerHTML =
    `Meta: ~${kcalTxt} kcal/dia | Objetivo: ${objetivo}${infoLink}` +
    `<br><span style="font-size:11px;opacity:0.85">Fibra: ${fiberTxt}/dia • Água: ${waterLiters} L/dia</span>`;
}

// v2.0.5: modal de transparência do cálculo. Mostra cada passo da derivação
// de kcal/macros/fibra/água + referências científicas pra cada critério.
function openCalcDetails() {
  const profile = getUserProfile();
  if (!profile) return;
  const goals = getGoals();
  const d = goals._details || {};
  const fmt = n => n != null ? n.toLocaleString('pt-BR') : '';

  const compSection = d.lbm != null
    ? `<li>Peso total: <b>${profile.peso_atual} kg</b></li>
       <li>Gordura corporal: <b>${d.bf_pct}%</b></li>
       <li>Massa magra (LBM): <b>${d.lbm.toString().replace('.',',')} kg</b> <span class="calc-formula">= ${profile.peso_atual} × (1 − ${d.bf_pct}/100)</span></li>`
    : `<li>Peso total: <b>${profile.peso_atual} kg</b></li>
       <li><i>BF% não preenchido — usando Mifflin com peso total</i></li>`;

  const bmrFormulaText = d.bmrFormula === 'Katch-McArdle'
    ? `<span class="calc-formula">= 370 + 21,6 × ${d.lbm.toString().replace('.',',')}</span>`
    : `<span class="calc-formula">= Mifflin-St Jeor (sem BF%)</span>`;

  let metaSection;
  if (d.direction === 'loss') {
    const deficitTxt = d.deficitPct != null
      ? `${(d.deficitPct * 100).toFixed(0)}% do TDEE = −${Math.round(d.tdee * d.deficitPct)} kcal`
      : `−500 kcal (fixo, fallback legado)`;
    metaSection = `
      <li>Direção: <b>Perda</b> (meta < peso)</li>
      <li>Déficit: ${deficitTxt}</li>
      <li>Alvo: <b>${fmt(goals.kcal)} kcal/dia</b></li>`;
  } else if (d.direction === 'gain') {
    const surplusTxt = d.surplusPct != null
      ? `${(d.surplusPct * 100).toFixed(0)}% do TDEE = +${Math.round(d.tdee * d.surplusPct)} kcal`
      : `+300 kcal (fixo, fallback legado)`;
    metaSection = `
      <li>Direção: <b>Ganho</b> (meta > peso)</li>
      <li>Superávit: ${surplusTxt}</li>
      <li>Alvo: <b>${fmt(goals.kcal)} kcal/dia</b></li>`;
  } else {
    metaSection = `
      <li>Direção: <b>Manutenção</b> (meta ≈ peso)</li>
      <li>Alvo: <b>${fmt(goals.kcal)} kcal/dia</b> (= TDEE)</li>`;
  }

  const base = d.macroBase != null ? d.macroBase.toString().replace('.', ',') : '—';

  document.getElementById('calc-details-content').innerHTML = `
    <div class="calc-section">
      <h3>1. Composição corporal</h3>
      <ul>${compSection}</ul>
    </div>

    <div class="calc-section">
      <h3>2. Gasto energético</h3>
      <ul>
        <li>Fórmula: <b>${d.bmrFormula}</b> ${bmrFormulaText}</li>
        <li>BMR: <b>${fmt(d.bmr)} kcal/dia</b></li>
        <li>Atividade: <b>${d.activityKey}</b> (× ${d.activityMult.toString().replace('.',',')})</li>
        <li>TDEE: <b>${fmt(d.tdee)} kcal/dia</b> <span class="calc-formula">= ${fmt(d.bmr)} × ${d.activityMult.toString().replace('.',',')}</span></li>
      </ul>
    </div>

    <div class="calc-section">
      <h3>3. Meta calórica</h3>
      <ul>${metaSection}</ul>
    </div>

    <div class="calc-section">
      <h3>4. Macronutrientes</h3>
      <p class="calc-note">Hierarquia: proteína primeiro (protege massa magra), gordura mínima (função hormonal), carbo preenche o restante.</p>
      <ul>
        <li>Proteína: <b>${goals.p}g</b> <span class="calc-formula">= ${d.protein_per_kg.toString().replace('.',',')} × ${base} kg ${d.macroBaseLabel}</span></li>
        <li>Gordura: <b>${goals.g}g</b> <span class="calc-formula">= ${d.fat_per_kg.toString().replace('.',',')} × ${base} kg ${d.macroBaseLabel}</span></li>
        <li>Carbo: <b>${goals.c}g</b> <span class="calc-formula">= (${fmt(goals.kcal)} − ${goals.p * 4} − ${goals.g * 9}) / 4</span></li>
        <li>Proteína por refeição: <b>~${goals.perMealP}g</b> <span class="calc-formula">= 0,4 × ${base} kg ${d.macroBaseLabel}</span></li>
      </ul>
    </div>

    <div class="calc-section">
      <h3>5. Recomendações adicionais</h3>
      <ul>
        <li>Fibra: <b>${goals.fiber}g/dia</b> <span class="calc-formula">= max(25, 14 × ${fmt(goals.kcal)} / 1000)</span></li>
        <li>Água: <b>${(goals.water_ml / 1000).toFixed(1).replace('.', ',')} L/dia</b> <span class="calc-formula">= ${d.waterPerKg} ml/kg × ${profile.peso_atual} kg</span></li>
      </ul>
    </div>

    <div class="calc-section calc-refs">
      <h3>Referências científicas</h3>
      <ul>
        <li><b>BMR:</b> Mifflin-St Jeor 1990 (padrão adulto); Katch-McArdle 1996 (quando BF% conhecido); Pavlidou et al. 2023 (meta-análise confirma ambos)</li>
        <li><b>Atividade:</b> escala v2.0.1 deslocada uma categoria pra baixo (conservadora); Pontzer et al. 2021 (compensação metabólica)</li>
        <li><b>Déficit/Superávit:</b> Helms et al. 2014; Iraki et al. 2019; Longland et al. 2016; Murphy & Koehler 2022</li>
        <li><b>Proteína:</b> Morton et al. 2018 (meta-análise); Helms et al. 2014 (2,3-3,1 g/kg LBM em cutting); ISSN 2017</li>
        <li><b>Gordura:</b> Dorgan et al. 1996 (mínimo 0,9 g/kg LBM)</li>
        <li><b>Carbo:</b> Slater & Phillips 2011 (restante calórico)</li>
        <li><b>Fibra:</b> Reynolds et al. 2019 (Lancet); WHO 2023 Guideline on Carbohydrate Intake; IOM/USDA DRI 14 g/1000 kcal</li>
        <li><b>Água:</b> Manz & Wentz 2005; Popkin et al. 2010; ACSM Position Stand 2007/2016</li>
        <li><b>Timing de proteína:</b> Schoenfeld & Aragon 2018; Areta et al. 2013 (MPS otimizado por 0,4 g/kg × 4-5 refeições)</li>
        <li><b>Diet break:</b> Helms et al. 2014; Peterson et al. 2017 (intermittent energy restriction)</li>
      </ul>
    </div>
  `;
  document.getElementById('calc-details-modal').classList.add('open');
}

function closeCalcDetails() {
  document.getElementById('calc-details-modal').classList.remove('open');
}

async function resetDailyMeals() {
  if (!await customConfirm('Desmarcar todas as refeições de hoje?')) return;
  localStorage.removeItem(getTodayKey());
  renderMeals();
}


function getCurrentWeekLabel() {
  const wk = localStorage.getItem(STORAGE_KEYS.marmitaCurrentWeek) || getWeekId();
  return wk;
}

function updateWeekLabel() {
  const el = document.getElementById('current-week-label');
  if (el) el.textContent = 'Semana atual: ' + getCurrentWeekLabel();
}

// v2.1.5: mapeamento de emoji placeholder por marmita/dinner. Quando houver
// imagens reais (PNG), basta adicionar o campo `image: 'filename.png'` no
// MARMITA_DEFS/DINNER_DEFS e o helper renderMealImageHtml() prefere o PNG.
const MARMITA_EMOJIS = {
  A: '🍗', // Frango
  B: '🥩', // Carne moída
  C: '🐟', // Tilápia
  D: '🍖', // Lombo suíno
  E: '🍗', // Sobrecoxa
  F: '🥩', // Coxão mole
};
const DINNER_EMOJIS = {
  O: '🍳', // Omelete
  T: '🫓', // Tapioca de Frango
  C: '🥩', // Carne com Arroz
  A: '🥫', // Torrada de Atum
  S: '🥪', // Sanduíche Natural
  W: '🌯', // Wrap
};

// Retorna o HTML do conteúdo do círculo: <img> se houver meal.image, senão
// emoji como fallback. Habilita evolução gradual pra fotos reais.
function renderMealImageHtml(meal, emojiMap) {
  if (meal && meal.image) {
    return `<img src="images/${meal.image}" alt="${meal.name}" loading="lazy">`;
  }
  const emoji = (meal && meal.emoji) || (emojiMap && emojiMap[meal.id]) || '🍽';
  return `<span class="pc-emoji">${emoji}</span>`;
}

function renderMarmitaPlanner() {
  const container = document.getElementById('planner-cards');
  if (!container) return;
  const plan = getMarmitaPlan();
  let html = '';

  const addedMarmitas = MARMITA_DEFS.filter(m => (plan[m.id] || 0) > 0);

  if (addedMarmitas.length === 0) {
    html += `<div style="background:var(--gray-bg);padding:18px;border-radius:var(--radius-lg);text-align:center;color:var(--ink-soft);font-size:13px;margin-bottom:8px">
      Nenhuma marmita adicionada. Toque em <b style="color:var(--green-primary)">+ Adicionar Novo Sabor</b> abaixo para começar.
    </div>`;
  } else {
    html += '<div class="planner-cards-grid">';
    addedMarmitas.forEach(m => {
      const qty = plan[m.id];
      const nameClean = m.name.replace(/^Marmita [A-F] - /, '');
      const imgClass = m.image ? 'pc-image has-image' : 'pc-image';
      html += `<div class="pl-card" onclick="showMarmitaRecipe('${m.id}')">
        <div class="${imgClass}">${renderMealImageHtml(m, MARMITA_EMOJIS)}</div>
        <div class="pc-name">${nameClean}</div>
        <div class="pc-desc">${m.desc}</div>
        <div class="pc-macros">
          <div class="pc-macro"><span class="pc-macro-val">${m.kcal}</span><span class="pc-macro-label">kcal</span></div>
          <div class="pc-macro"><span class="pc-macro-val">${m.p}g</span><span class="pc-macro-label">prot</span></div>
          <div class="pc-macro"><span class="pc-macro-val">${m.c}g</span><span class="pc-macro-label">carb</span></div>
          <div class="pc-macro"><span class="pc-macro-val">${m.g}g</span><span class="pc-macro-label">gord</span></div>
        </div>
        <div class="pc-stepper" onclick="event.stopPropagation()">
          <button onclick="stepMarmita('${m.id}',-1)" aria-label="Remover uma">${glyph('minus', 14)}</button>
          <span class="pc-qty" id="mq_${m.id}">${qty}</span>
          <button onclick="stepMarmita('${m.id}',1)" aria-label="Adicionar mais uma">${glyph('plus', 14)}</button>
        </div>
      </div>`;
    });
    html += '</div>';
  }

  html += `<button class="history-btn" style="margin-top:14px" onclick="openMarmitaPicker()">+ Adicionar Novo Sabor de Marmita</button>`;

  container.innerHTML = html;
  updatePlannerSummary();
}

function openMarmitaPicker() {
  const plan = getMarmitaPlan();
  const modal = document.getElementById('history-modal');
  const content = document.getElementById('history-content');
  document.getElementById('history-title').textContent = 'Adicionar Novo Sabor de Marmita';

  let html = '<div style="font-size:12px;color:var(--gray-mid);margin-bottom:12px">Escolha o sabor de marmita para adicionar ao planejamento. Se já estiver adicionado, o toque aumenta a quantidade em 1.</div>';
  MARMITA_DEFS.forEach(m => {
    const typeName = getMarmitaTypeName(m.id);
    const current = plan[m.id] || 0;
    const added = current > 0;
    html += `<button onclick="addMarmitaToPlan('${m.id}')"
      style="display:block;width:100%;padding:12px 14px;margin-bottom:8px;text-align:left;background:${added ? 'var(--green-bg)' : '#fff'};border:1.5px solid ${added ? 'var(--green)' : 'var(--gray-light)'};border-radius:10px;cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:14px;font-weight:700;color:var(--blue)">${typeName}</div>
        ${added ? `<span style="background:var(--green);color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px">${current} no plano</span>` : ''}
      </div>
      <div style="font-size:11px;color:var(--gray-mid);margin-top:3px">${m.desc}</div>
      <div style="font-size:11px;color:var(--orange);margin-top:4px;font-weight:600">${m.kcal} kcal | ${m.p}g P | ${m.c}g C | ${m.g}g G</div>
    </button>`;
  });

  content.innerHTML = html;
  modal.classList.add('open');
}

function addMarmitaToPlan(id) {
  const plan = getMarmitaPlan();
  plan[id] = (plan[id] || 0) + 1;
  localStorage.setItem(STORAGE_KEYS.marmitaPlan, JSON.stringify(plan));
  closeHistory();
  renderMarmitaPlanner();
  onPlanChange();
}

function showMarmitaRecipe(id) {
  const m = MARMITA_DEFS.find(x => x.id === id);
  if (!m || !m.recipe) return;
  const modal = document.getElementById('history-modal');
  const content = document.getElementById('history-content');
  document.getElementById('history-title').textContent = 'Receita - ' + getMarmitaTypeName(id);

  let html = `<div style="font-size:15px;font-weight:700;color:var(--green);margin-bottom:6px">${m.recipe.title}</div>`;
  if (m.recipe.yield) {
    html += `<div style="display:inline-block;background:var(--green-bg);color:var(--green);padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:12px">Rendimento: ${m.recipe.yield} marmita${m.recipe.yield > 1 ? 's' : ''}</div>`;
  }
  html += '<div style="font-size:13px;line-height:1.7;color:var(--gray)">';
  m.recipe.items.forEach(item => {
    if (item.startsWith('<b>')) {
      html += `<div style="margin-top:10px">${item}</div>`;
    } else {
      html += `<div style="padding:4px 0 4px 14px;position:relative"><span style="position:absolute;left:0;color:var(--green)">&bull;</span>${item}</div>`;
    }
  });
  html += '</div>';
  html += `<div style="margin-top:16px;padding:10px;background:var(--gray-bg);border-radius:8px;font-size:12px;color:var(--gray-mid)">
    <b>Composição final (cozido, por marmita):</b><br>${m.cooked.replace(/ \| /g, '<br>&bull; ').replace(/^/, '&bull; ')}
  </div>`;
  html += `<div style="margin-top:10px;padding:10px;background:var(--green-bg);border-radius:8px;font-size:12px;color:var(--green);font-weight:600">
    ${m.kcal} kcal | ${m.p}g Proteína | ${m.c}g Carboidrato | ${m.g}g Gordura
  </div>`;

  content.innerHTML = html;
  modal.classList.add('open');
}

function stepMarmita(id, delta) {
  const plan = getMarmitaPlan();
  const newQty = Math.max(0, (plan[id] || 0) + delta);
  plan[id] = newQty;
  localStorage.setItem(STORAGE_KEYS.marmitaPlan, JSON.stringify(plan));
  if (newQty === 0) {
    // Re-render to remove the card from the list
    renderMarmitaPlanner();
  } else {
    const el = document.getElementById('mq_' + id);
    if (el) el.textContent = newQty;
    updatePlannerSummary();
  }
  onPlanChange();
}

function renderDinnerPlanner() {
  const plan = getDinnerPlan();
  const container = document.getElementById('dinner-cards');
  if (!container) return;
  let html = '';

  const addedDinners = DINNER_DEFS.filter(m => (plan[m.id] || 0) > 0);

  if (addedDinners.length === 0) {
    html += `<div style="background:var(--gray-bg);padding:18px;border-radius:var(--radius-lg);text-align:center;color:var(--ink-soft);font-size:13px;margin-bottom:8px">
      Nenhum jantar adicionado. Toque em <b style="color:var(--purple-soft)">+ Adicionar Novo Sabor</b> abaixo para começar.
    </div>`;
  } else {
    html += '<div class="planner-cards-grid">';
    addedDinners.forEach(m => {
      const qty = plan[m.id];
      const imgClass = m.image ? 'pc-image has-image' : 'pc-image';
      html += `<div class="pl-card dinner" onclick="showDinnerRecipe('${m.id}')">
        <div class="${imgClass}">${renderMealImageHtml(m, DINNER_EMOJIS)}</div>
        <div class="pc-name">${m.name}</div>
        <div class="pc-desc">${m.desc}</div>
        <div class="pc-macros">
          <div class="pc-macro"><span class="pc-macro-val">${m.kcal}</span><span class="pc-macro-label">kcal</span></div>
          <div class="pc-macro"><span class="pc-macro-val">${m.p}g</span><span class="pc-macro-label">prot</span></div>
          <div class="pc-macro"><span class="pc-macro-val">${m.c}g</span><span class="pc-macro-label">carb</span></div>
          <div class="pc-macro"><span class="pc-macro-val">${m.g}g</span><span class="pc-macro-label">gord</span></div>
        </div>
        <div class="pc-stepper" onclick="event.stopPropagation()">
          <button onclick="stepDinner('${m.id}',-1)" aria-label="Remover um">${glyph('minus', 14)}</button>
          <span class="pc-qty" id="dq_${m.id}">${qty}</span>
          <button onclick="stepDinner('${m.id}',1)" aria-label="Adicionar mais um">${glyph('plus', 14)}</button>
        </div>
      </div>`;
    });
    html += '</div>';
  }

  html += `<button class="history-btn is-dinner" style="margin-top:14px" onclick="openDinnerPicker()">+ Adicionar Novo Sabor de Jantar</button>`;

  container.innerHTML = html;
  updateDinnerSummary();
}

function openDinnerPicker() {
  const plan = getDinnerPlan();
  const modal = document.getElementById('history-modal');
  const content = document.getElementById('history-content');
  document.getElementById('history-title').textContent = 'Adicionar Novo Sabor de Jantar';

  let html = '<div style="font-size:12px;color:var(--gray-mid);margin-bottom:12px">Escolha o sabor de jantar para adicionar ao planejamento. Se já estiver adicionado, o toque aumenta a quantidade em 1.</div>';
  DINNER_DEFS.forEach(m => {
    const current = plan[m.id] || 0;
    const added = current > 0;
    html += `<button onclick="addDinnerToPlan('${m.id}')"
      style="display:block;width:100%;padding:12px 14px;margin-bottom:8px;text-align:left;background:${added ? 'var(--purple-light)' : '#fff'};border:1.5px solid ${added ? 'var(--purple)' : 'var(--gray-light)'};border-radius:10px;cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:14px;font-weight:700;color:var(--blue)">${m.name}</div>
        ${added ? `<span style="background:var(--purple);color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px">${current} no plano</span>` : ''}
      </div>
      <div style="font-size:11px;color:var(--gray-mid);margin-top:3px">${m.desc}</div>
      <div style="font-size:11px;color:var(--orange);margin-top:4px;font-weight:600">${m.kcal} kcal | ${m.p}g P | ${m.c}g C | ${m.g}g G</div>
    </button>`;
  });

  content.innerHTML = html;
  modal.classList.add('open');
}

function addDinnerToPlan(id) {
  const plan = getDinnerPlan();
  plan[id] = (plan[id] || 0) + 1;
  localStorage.setItem(STORAGE_KEYS.dinnerPlan, JSON.stringify(plan));
  closeHistory();
  renderDinnerPlanner();
  onPlanChange();
}

function showDinnerRecipe(id) {
  const m = DINNER_DEFS.find(x => x.id === id);
  if (!m || !m.recipe) return;
  const modal = document.getElementById('history-modal');
  const content = document.getElementById('history-content');
  document.getElementById('history-title').textContent = 'Receita - ' + getDinnerTypeName(id);

  let html = `<div style="font-size:15px;font-weight:700;color:var(--purple);margin-bottom:6px">${m.recipe.title}</div>`;
  if (m.recipe.yield) {
    html += `<div style="display:inline-block;background:var(--purple-light);color:var(--purple);padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:12px">Rendimento: ${m.recipe.yield} jantar${m.recipe.yield > 1 ? 'es' : ''}</div>`;
  }
  html += '<div style="font-size:13px;line-height:1.7;color:var(--gray)">';
  m.recipe.items.forEach(item => {
    if (item.startsWith('<b>')) {
      html += `<div style="margin-top:10px">${item}</div>`;
    } else {
      html += `<div style="padding:4px 0 4px 14px;position:relative"><span style="position:absolute;left:0;color:var(--purple)">&bull;</span>${item}</div>`;
    }
  });
  html += '</div>';
  html += `<div style="margin-top:16px;padding:10px;background:var(--gray-bg);border-radius:8px;font-size:12px;color:var(--gray-mid)">
    <b>Composição final (por jantar):</b><br>${m.cooked.replace(/ \| /g, '<br>&bull; ').replace(/^/, '&bull; ')}
  </div>`;
  html += `<div style="margin-top:10px;padding:10px;background:var(--purple-light);border-radius:8px;font-size:12px;color:var(--purple);font-weight:600">
    ${m.kcal} kcal | ${m.p}g Proteína | ${m.c}g Carboidrato | ${m.g}g Gordura
  </div>`;

  content.innerHTML = html;
  modal.classList.add('open');
}

function stepDinner(id, delta) {
  const plan = getDinnerPlan();
  const newQty = Math.max(0, (plan[id] || 0) + delta);
  plan[id] = newQty;
  localStorage.setItem(STORAGE_KEYS.dinnerPlan, JSON.stringify(plan));
  if (newQty === 0) {
    renderDinnerPlanner();
  } else {
    const el = document.getElementById('dq_' + id);
    if (el) el.textContent = newQty;
    updateDinnerSummary();
  }
  onPlanChange();
}

// tier: 'low' (<60 kcal, <15g C), 'mid' (60-75 kcal, 15-18g C), 'high' (>75 kcal, >18g C)
const FRUIT_SUGGESTIONS = [
  { name: 'Morango',      qty: '1 xícara (~150g)',    kcal: 48, c: 12, tier: 'low'  },
  { name: 'Abacaxi',      qty: '1 fatia (~100g)',    kcal: 50, c: 13, tier: 'low'  },
  { name: 'Mamão papaya', qty: '1 fatia (~120g)',    kcal: 51, c: 13, tier: 'low'  },
  { name: 'Melancia',     qty: '1 fatia (~200g)',    kcal: 60, c: 15, tier: 'mid'  },
  { name: 'Kiwi',         qty: '2 un. (~100g)',      kcal: 61, c: 15, tier: 'mid'  },
  { name: 'Banana prata', qty: '1 un. (~70g)',       kcal: 62, c: 16, tier: 'mid'  },
  { name: 'Laranja',      qty: '1 un. (~150g)',      kcal: 68, c: 17, tier: 'mid'  },
  { name: 'Uva',          qty: '1 cacho peq. (~100g)',kcal: 69, c: 18, tier: 'mid'  },
  { name: 'Maçã',         qty: '1 un. média (~150g)', kcal: 78, c: 20, tier: 'high' },
  { name: 'Pera',         qty: '1 un. (~150g)',      kcal: 87, c: 23, tier: 'high' },
];

const FRUIT_TIER_META = {
  low:  { label: 'Leve',     bg: '#c6f6d5', fg: '#276749', desc: '<60 kcal, <15g C' },
  mid:  { label: 'Moderada', bg: '#feebc8', fg: '#9c4221', desc: '60-75 kcal, 15-18g C' },
  high: { label: 'Densa',    bg: '#fed7d7', fg: '#9b2c2c', desc: '>75 kcal, >18g C' },
};

function renderFruitSuggestions() {
  const container = document.getElementById('fruit-suggestions');
  if (!container) return;
  let html = '';
  // Legend
  html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;font-size:10px">`;
  Object.entries(FRUIT_TIER_META).forEach(([k, m]) => {
    html += `<span style="background:${m.bg};color:${m.fg};padding:3px 8px;border-radius:10px;font-weight:700">${m.label}</span>
      <span style="color:var(--gray-mid);align-self:center;margin-right:4px">${m.desc}</span>`;
  });
  html += `</div>`;

  FRUIT_SUGGESTIONS.forEach(f => {
    const meta = FRUIT_TIER_META[f.tier] || FRUIT_TIER_META.mid;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-light);font-size:13px">
      <div style="display:flex;align-items:center;gap:8px;flex:1">
        <span style="background:${meta.bg};color:${meta.fg};font-size:9px;font-weight:700;padding:3px 6px;border-radius:8px;white-space:nowrap">${meta.label}</span>
        <div>
          <div style="font-weight:600;color:var(--blue)">${f.name}</div>
          <div style="font-size:11px;color:var(--gray-mid)">${f.qty}</div>
        </div>
      </div>
      <div style="text-align:right;font-size:11px;color:var(--orange);font-weight:600">
        ${f.kcal} kcal<br><span style="color:var(--gray-mid)">${f.c}g C</span>
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

function updateDinnerSummary() {
  const plan = getDinnerPlan();
  let total = 0;
  DINNER_DEFS.forEach(m => { total += plan[m.id] || 0; });
  const el = document.getElementById('dinner-status');
  if (el) {
    el.innerHTML = `<div class="planner-ok is-dinner">${total} jantar${total === 1 ? '' : 'es'} planejado${total === 1 ? '' : 's'}</div>`;
  }
  // Dinner totals feed into the unified weekly summary
  if (document.getElementById('planner-summary')) updatePlannerSummary();
}

// ---- STOCK MANAGEMENT ----
function getConsumed() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.marmitaConsumed) || '{}');
  // Migrate any UTC-format keys to local format (one-time fix)
  let migrated = false;
  Object.keys(data).forEach(k => {
    // Check if key contains T (ISO format) or if it's already YYYY-MM-DD
    if (k.length === 10 && k.match(/^\d{4}-\d{2}-\d{2}$/)) return; // already correct
    // Try to parse and convert
    const d = new Date(k);
    if (!isNaN(d)) {
      const localKey = localDateStr(d);
      if (localKey !== k && !data[localKey]) {
        data[localKey] = data[k];
        delete data[k];
        migrated = true;
      }
    }
  });
  if (migrated) localStorage.setItem(STORAGE_KEYS.marmitaConsumed, JSON.stringify(data));
  return data;
}

function getStock() {
  const plan = getMarmitaPlan();
  const consumed = getConsumed();
  const stock = {};
  MARMITA_DEFS.forEach(m => { stock[m.id] = plan[m.id] || 0; });
  // Only count current week's consumption
  const currentWeekId = getCurrentWeekLabel();
  Object.entries(consumed).forEach(([date, arr]) => {
    const d = new Date(date + 'T12:00:00');
    if (getWeekId(d) !== currentWeekId) return;
    if (Array.isArray(arr)) arr.forEach(type => { if (stock[type] !== undefined) stock[type]--; });
    else if (typeof arr === 'string' && stock[arr] !== undefined) stock[arr] -= 2;
  });
  return stock;
}

function getTodaySelections() {
  const consumed = getConsumed();
  const today = localDateStr();
  const val = consumed[today];
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val, val]; // legacy: single string = 2 of that type
}

function selectTodayMarmita(type) {
  const consumed = getConsumed();
  const today = localDateStr();
  let selections = getTodaySelections();

  // Check stock before adding
  const stock = getStock();
  const currentCount = selections.filter(t => t === type).length;
  // When adding, check if stock allows it (stock already accounts for today's selections)
  // stock[type] is already reduced by today's selections, so if > 0 we can add more
  if (stock[type] > 0) {
    selections.push(type);
  } else if (currentCount > 0) {
    // Remove last occurrence of this type (toggle off)
    const idx = selections.lastIndexOf(type);
    if (idx !== -1) selections.splice(idx, 1);
  }

  if (selections.length === 0) {
    delete consumed[today];
  } else {
    consumed[today] = selections;
  }
  localStorage.setItem(STORAGE_KEYS.marmitaConsumed, JSON.stringify(consumed));
  renderMarmitaSelector();
  renderDinnerSelector();
  renderMeals();
  renderStockCard();
}

function removeTodayMarmita(type) {
  const consumed = getConsumed();
  const today = localDateStr();
  let selections = getTodaySelections();
  const idx = selections.lastIndexOf(type);
  if (idx !== -1) selections.splice(idx, 1);
  if (selections.length === 0) delete consumed[today];
  else consumed[today] = selections;
  localStorage.setItem(STORAGE_KEYS.marmitaConsumed, JSON.stringify(consumed));
  renderMarmitaSelector();
  renderDinnerSelector();
  renderMeals();
  renderStockCard();
}

function renderMarmitaSelector() {
  const container = document.getElementById('marmita-selector');
  if (!container) return;
  const stock = getStock();
  const selections = getTodaySelections();

  // Count per type today
  const todayCounts = {};
  selections.forEach(t => { todayCounts[t] = (todayCounts[t] || 0) + 1; });

  let html = '';

  // Show current selections
  if (selections.length > 0) {
    html += '<div style="margin-bottom:10px">';
    html += '<div style="font-size:12px;color:var(--green);font-weight:600;margin-bottom:6px">Selecionadas hoje:</div>';
    // Group by type
    const grouped = {};
    selections.forEach(t => { grouped[t] = (grouped[t] || 0) + 1; });
    Object.entries(grouped).forEach(([type, count]) => {
      const m = MARMITA_DEFS.find(x => x.id === type);
      if (!m) return;
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--green-bg);border-radius:8px;margin-bottom:4px">
        <span style="font-size:13px;font-weight:600;color:var(--green)">${count}x ${getMarmitaTypeName(m.id)} (${m.kcal} kcal | ${m.p}g P)</span>
        <button onclick="removeTodayMarmita('${type}')" aria-label="Remover marmita selecionada" style="border:none;background:var(--red-light);color:var(--red);border-radius:50%;width:24px;height:24px;font-size:14px;cursor:pointer">-</button>
      </div>`;
    });
    html += '</div>';
  }

  // Only show marmitas that were planned
  const planned = getMarmitaPlan();
  const hasPlanned = Object.values(planned).some(v => v > 0);
  if (!hasPlanned) {
    html += '<div style="text-align:center;font-size:12px;color:var(--gray-mid);padding:10px 0">Nenhuma marmita programada na semana</div>';
    container.innerHTML = html;
    return;
  }

  // Show options to add
  html += '<div style="font-size:12px;color:var(--gray-mid);margin-bottom:6px">Toque para adicionar:</div>';
  MARMITA_DEFS.forEach(m => {
    if ((planned[m.id] || 0) === 0) return; // só mostrar marmitas programadas
    const remaining = stock[m.id] || 0;
    const disabled = remaining <= 0;
    const iconHtml = m.image
      ? `<div class="msel-icon has-image"><img src="images/${m.image}" alt="${getMarmitaTypeName(m.id)}"></div>`
      : `<div class="msel-icon">${m.id}</div>`;
    html += `<div class="msel-option ${disabled ? 'disabled' : ''}"
      onclick="selectTodayMarmita('${m.id}')">
      ${iconHtml}
      <div class="msel-info">
        <div class="msel-name">${getMarmitaTypeName(m.id)}</div>
        <div class="msel-macros">${m.kcal} kcal | ${m.p}g P | ${m.c}g C | ${m.g}g G</div>
      </div>
      <div class="msel-stock">${disabled ? 'Esgotada' : remaining + ' rest.'}</div>
    </div>`;
  });
  container.innerHTML = html;
}

// ---- DINNER TODAY SELECTOR ----
function getDinnerConsumed() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.dinnerConsumed) || '{}');
}

function getDinnerStock() {
  const plan = getDinnerPlan();
  const consumed = getDinnerConsumed();
  const stock = {};
  DINNER_DEFS.forEach(m => { stock[m.id] = plan[m.id] || 0; });
  const currentWeekId = getCurrentWeekLabel();
  Object.entries(consumed).forEach(([date, arr]) => {
    const d = new Date(date + 'T12:00:00');
    if (getWeekId(d) !== currentWeekId) return;
    if (Array.isArray(arr)) arr.forEach(type => { if (stock[type] !== undefined) stock[type]--; });
  });
  return stock;
}

function getTodayDinnerSelections() {
  const consumed = getDinnerConsumed();
  const today = localDateStr();
  const val = consumed[today];
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function selectTodayDinner(type) {
  const consumed = getDinnerConsumed();
  const today = localDateStr();
  let selections = getTodayDinnerSelections();

  const stock = getDinnerStock();
  if (stock[type] > 0) {
    selections.push(type);
  } else {
    const idx = selections.lastIndexOf(type);
    if (idx !== -1) selections.splice(idx, 1);
  }

  if (selections.length === 0) delete consumed[today];
  else consumed[today] = selections;
  localStorage.setItem(STORAGE_KEYS.dinnerConsumed, JSON.stringify(consumed));
  renderDinnerSelector();
  renderMeals();
}

function removeTodayDinner(type) {
  const consumed = getDinnerConsumed();
  const today = localDateStr();
  let selections = getTodayDinnerSelections();
  const idx = selections.lastIndexOf(type);
  if (idx !== -1) selections.splice(idx, 1);
  if (selections.length === 0) delete consumed[today];
  else consumed[today] = selections;
  localStorage.setItem(STORAGE_KEYS.dinnerConsumed, JSON.stringify(consumed));
  renderDinnerSelector();
  renderMeals();
}

function renderDinnerSelector() {
  const stock = getDinnerStock();
  const selections = getTodayDinnerSelections();
  const container = document.getElementById('dinner-selector');
  if (!container) return;

  let html = '';

  // Current selections
  if (selections.length > 0) {
    html += '<div style="margin-bottom:10px">';
    html += '<div style="font-size:12px;color:var(--purple);font-weight:600;margin-bottom:6px">Selecionados hoje:</div>';
    const grouped = {};
    selections.forEach(t => { grouped[t] = (grouped[t] || 0) + 1; });
    Object.entries(grouped).forEach(([type, count]) => {
      const m = DINNER_DEFS.find(x => x.id === type);
      if (!m) return;
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--purple-light);border-radius:8px;margin-bottom:4px">
        <span style="font-size:13px;font-weight:600;color:var(--purple)">${count}x ${m.name} (${m.kcal} kcal | ${m.p}g P)</span>
        <button onclick="removeTodayDinner('${type}')" aria-label="Remover jantar selecionado" style="border:none;background:var(--red-light);color:var(--red);border-radius:50%;width:24px;height:24px;font-size:14px;cursor:pointer">-</button>
      </div>`;
    });
    html += '</div>';
  }

  // Available options
  const planned = getDinnerPlan();
  const hasPlanned = Object.values(planned).some(v => v > 0);
  if (!hasPlanned) {
    html += '<div style="text-align:center;font-size:12px;color:var(--gray-mid);padding:10px 0">Nenhum jantar programado na semana</div>';
    container.innerHTML = html;
    return;
  }

  html += '<div style="font-size:12px;color:var(--gray-mid);margin-bottom:6px">Toque para adicionar:</div>';
  DINNER_DEFS.forEach(m => {
    if ((planned[m.id] || 0) === 0) return; // só mostrar jantares programados
    const remaining = stock[m.id] || 0;
    const disabled = remaining <= 0;
    const iconHtml = m.image
      ? `<div class="msel-icon has-image"><img src="images/${m.image}" alt="${m.name}"></div>`
      : `<div class="msel-icon" style="background:var(--purple-light);color:var(--purple)">${m.id}</div>`;
    html += `<div class="msel-option ${disabled ? 'disabled' : ''}"
      onclick="selectTodayDinner('${m.id}')">
      ${iconHtml}
      <div class="msel-info">
        <div class="msel-name">${m.name}</div>
        <div class="msel-macros">${m.kcal} kcal | ${m.p}g P | ${m.c}g C | ${m.g}g G</div>
      </div>
      <div class="msel-stock">${disabled ? 'Esgotado' : remaining + ' rest.'}</div>
    </div>`;
  });
  container.innerHTML = html;
}

function renderStockCard() {
  const card = document.getElementById('stock-card');
  if (!card) return;
  const mStock = getStock();
  const dStock = getDinnerStock();
  const mPlan = getMarmitaPlan();
  const dPlan = getDinnerPlan();

  let mRemaining = 0, dRemaining = 0;
  MARMITA_DEFS.forEach(m => { mRemaining += Math.max(0, mStock[m.id] || 0); });
  DINNER_DEFS.forEach(d => { dRemaining += Math.max(0, dStock[d.id] || 0); });

  const hasAnyPlan = MARMITA_DEFS.some(m => (mPlan[m.id] || 0) > 0)
                  || DINNER_DEFS.some(d => (dPlan[d.id] || 0) > 0);

  if (!hasAnyPlan && mRemaining <= 0 && dRemaining <= 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  let html = `<h3 style="font-size:14px;color:var(--orange);margin-bottom:8px">Estoque de Refeições (${mRemaining + dRemaining} restantes)</h3>`;

  // Marmitas
  const marmitasShown = MARMITA_DEFS.filter(m => (mStock[m.id] || 0) > 0 || (mPlan[m.id] || 0) > 0);
  if (marmitasShown.length > 0) {
    html += `<div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;margin:6px 0 4px">Marmitas (${mRemaining})</div>`;
    marmitasShown.forEach(m => {
      const rem = Math.max(0, mStock[m.id] || 0);
      const typeName = getMarmitaTypeName(m.id);
      html += `<div class="stock-item">
        <span>${typeName}</span>
        <span class="stock-badge ${rem > 0 ? 'has' : 'empty'}">${rem > 0 ? rem + ' un.' : 'Esgotada'}</span>
      </div>`;
    });
  }

  // Jantares
  const dinnersShown = DINNER_DEFS.filter(d => (dStock[d.id] || 0) > 0 || (dPlan[d.id] || 0) > 0);
  if (dinnersShown.length > 0) {
    html += `<div style="font-size:11px;font-weight:700;color:var(--purple);text-transform:uppercase;margin:10px 0 4px">Jantares (${dRemaining})</div>`;
    dinnersShown.forEach(d => {
      const rem = Math.max(0, dStock[d.id] || 0);
      html += `<div class="stock-item">
        <span>${d.name}</span>
        <span class="stock-badge ${rem > 0 ? 'has is-dinner' : 'empty'}">${rem > 0 ? rem + ' un.' : 'Esgotado'}</span>
      </div>`;
    });
  }

  card.innerHTML = html;
}

function updatePlannerSummary() {
  const plan = getMarmitaPlan();
  let mTotal = 0, mKcal = 0, mP = 0, mC = 0, mG = 0;
  MARMITA_DEFS.forEach(m => {
    const qty = plan[m.id] || 0;
    mTotal += qty;
    mKcal += m.kcal * qty; mP += m.p * qty; mC += m.c * qty; mG += m.g * qty;
  });

  const dinnerPlan = getDinnerPlan();
  let dTotal = 0, dKcal = 0, dP = 0, dC = 0, dG = 0;
  DINNER_DEFS.forEach(d => {
    const qty = dinnerPlan[d.id] || 0;
    dTotal += qty;
    dKcal += d.kcal * qty; dP += d.p * qty; dC += d.c * qty; dG += d.g * qty;
  });

  const statusEl = document.getElementById('planner-status');
  if (statusEl) statusEl.innerHTML = `<div class="planner-ok">${mTotal} marmita${mTotal === 1 ? '' : 's'} planejada${mTotal === 1 ? '' : 's'}</div>`;

  const summaryEl = document.getElementById('planner-summary');
  if (!summaryEl) { renderStockCard(); return; }
  summaryEl.innerHTML = `
    <h3 style="font-size:14px;color:var(--blue);margin-bottom:8px">Resumo da Semana</h3>
    <div style="font-size:12px;font-weight:700;color:var(--green);text-transform:uppercase;margin:8px 0 4px">Marmitas</div>
    <div class="sum-row"><span>Total de marmitas</span><span class="sum-val">${mTotal}</span></div>
    <div class="sum-row"><span>Kcal/almoço (média)</span><span class="sum-val">${mTotal ? Math.round(mKcal / mTotal) : 0}</span></div>
    <div class="sum-row"><span>Proteína/almoço (média)</span><span class="sum-val">${mTotal ? Math.round(mP / mTotal) : 0}g</span></div>
    <div class="sum-row"><span>Carboidrato/almoço (média)</span><span class="sum-val">${mTotal ? Math.round(mC / mTotal) : 0}g</span></div>
    <div class="sum-row"><span>Gordura/almoço (média)</span><span class="sum-val">${mTotal ? Math.round(mG / mTotal) : 0}g</span></div>
    <div style="font-size:12px;font-weight:700;color:var(--purple);text-transform:uppercase;margin:14px 0 4px">Jantares</div>
    <div class="sum-row"><span>Total de jantares</span><span class="sum-val">${dTotal}</span></div>
    <div class="sum-row"><span>Kcal/jantar (média)</span><span class="sum-val">${dTotal ? Math.round(dKcal / dTotal) : 0}</span></div>
    <div class="sum-row"><span>Proteína/jantar (média)</span><span class="sum-val">${dTotal ? Math.round(dP / dTotal) : 0}g</span></div>
    <div class="sum-row"><span>Carboidrato/jantar (média)</span><span class="sum-val">${dTotal ? Math.round(dC / dTotal) : 0}g</span></div>
    <div class="sum-row"><span>Gordura/jantar (média)</span><span class="sum-val">${dTotal ? Math.round(dG / dTotal) : 0}g</span></div>
    <button class="history-btn" onclick="openMarmitaHistory()" style="margin-top:14px">Histórico de Semanas</button>
  `;
  renderStockCard();
}

function getWeekId(date) {
  // Week runs Sunday to Saturday
  const d = date || new Date();
  // Find the Sunday that starts this week
  const day = d.getDay(); // 0=Sunday
  const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  const jan1 = new Date(sunday.getFullYear(), 0, 1);
  const days = Math.floor((sunday - jan1) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return sunday.getFullYear() + '-S' + String(weekNum).padStart(2, '0');
}

// Chamado automaticamente sempre que o usuário adiciona ou remove uma marmita/jantar
// do planejamento. Persiste em localStorage, atualiza histórico da semana e re-renderiza
// todas as views dependentes (lista de compras, refeições do dia, estoque, etc.).
function onPlanChange() {
  const plan = getMarmitaPlan();
  const dinnerPlan = getDinnerPlan();

  // Defensive re-save to ensure sync layer picks it up
  localStorage.setItem(STORAGE_KEYS.marmitaPlan, JSON.stringify(plan));
  localStorage.setItem(STORAGE_KEYS.dinnerPlan, JSON.stringify(dinnerPlan));

  // Snapshot da semana atual no histórico
  const weekId = getCurrentWeekLabel();
  localStorage.setItem(STORAGE_KEYS.marmitaCurrentWeek, weekId);
  const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.marmitaHistory) || '{}');
  history[weekId] = { ...plan, dinners: dinnerPlan, _saved: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEYS.marmitaHistory, JSON.stringify(history));

  // Re-render de tudo que depende do plano
  renderShoppingList();
  renderStockCard();
  renderMarmitaSelector();
  renderDinnerSelector();
  if (typeof renderMeals === 'function') renderMeals();
  updateWeekLabel();
}

async function startNewWeek() {
  const currentWeek = getCurrentWeekLabel();
  const thisWeek = getWeekId();
  const today = new Date();
  const isSunday = today.getDay() === 0;

  // Check if there's already a saved plan for this week
  const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.marmitaHistory) || '{}');
  const hasCurrentWeekPlan = !!history[thisWeek];

  // If not Sunday and there's already a plan for this week, block
  if (!isSunday && hasCurrentWeekPlan) {
    alert(`Já existe um planejamento vigente para esta semana (${thisWeek}).\n\nAjuste as marmitas e jantares diretamente nos cards — as alterações são salvas automaticamente e a lista de compras é atualizada.\n\nUm novo planejamento só pode ser iniciado no domingo ou quando não houver planejamento salvo para a semana.`);
    return;
  }

  const ok = await customConfirm(
    'O planejamento anterior será arquivado no histórico.\nA lista de compras e o consumo de marmitas serão zerados.\n\nQualquer estoque em casa cadastrado também será zerado.',
    { title: 'Limpar planejamento semanal?', okLabel: 'Limpar', danger: true }
  );
  if (!ok) return;

  // Archive current plan if it exists and is different from new week
  if (currentWeek !== thisWeek) {
    const plan = getMarmitaPlan();
    const totalPlan = Object.values(plan).reduce((a,b) => a+b, 0);
    if (totalPlan > 0) {
      history[currentWeek] = { ...plan, _saved: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.marmitaHistory, JSON.stringify(history));
    }
  }

  // Reset everything
  localStorage.setItem(STORAGE_KEYS.marmitaPlan, JSON.stringify(DEFAULT_PLAN));
  localStorage.setItem(STORAGE_KEYS.dinnerPlan, JSON.stringify(DEFAULT_DINNER_PLAN));
  localStorage.removeItem(STORAGE_KEYS.shopChecks);
  localStorage.removeItem(STORAGE_KEYS.marmitaConsumed);
  localStorage.removeItem(STORAGE_KEYS.dinnerConsumed);
  localStorage.removeItem(STORAGE_KEYS.homeStock);
  localStorage.removeItem(STORAGE_KEYS.genDraft);
  localStorage.setItem(STORAGE_KEYS.marmitaCurrentWeek, thisWeek);

  renderMarmitaPlanner();
  renderDinnerPlanner();
  renderShoppingList();
  renderStockCard();
  renderMarmitaSelector();
  renderDinnerSelector();
  updateWeekLabel();

  const btn = document.querySelectorAll('#page-marmitas .save-btn')[1];
  btn.textContent = 'Novo planejamento iniciado!';
  btn.style.background = '#276749';
  setTimeout(() => { btn.textContent = 'Novo Planejamento Semanal'; btn.style.background = 'var(--orange)'; }, 2000);
}

function checkSundayPrompt() {
  const today = new Date();
  if (today.getDay() !== 0) return; // not Sunday
  const lastPrompt = localStorage.getItem(STORAGE_KEYS.sundayPromptDate);
  const todayStr = localDateStr(today);
  if (lastPrompt === todayStr) return; // already prompted today
  localStorage.setItem(STORAGE_KEYS.sundayPromptDate, todayStr);
  setTimeout(async () => {
    if (await customConfirm('Hoje é domingo! Deseja iniciar um novo planejamento de marmitas para a semana?', { okLabel: 'Iniciar' })) {
      startNewWeek();
      switchTab('marmitas');
    }
  }, 500);
}

function openMarmitaHistory() {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.marmitaHistory) || '{}');
  const modal = document.getElementById('history-modal');
  const content = document.getElementById('history-content');
  document.getElementById('history-title').textContent = 'Histórico de Marmitas';

  const weeks = Object.keys(history).sort().reverse();

  if (weeks.length === 0) {
    content.innerHTML = '<div class="empty-state">Nenhum histórico ainda.<br>Salve seu primeiro planejamento para começar o registro.</div>';
    modal.classList.add('open');
    return;
  }

  // Build header
  const ids = MARMITA_DEFS.map(m => m.id);
  let html = '<table class="history-table"><tr><th>Semana</th>';
  ids.forEach(id => { html += `<th>${id}</th>`; });
  html += '<th>Total</th></tr>';

  weeks.forEach(wk => {
    const p = history[wk];
    let total = 0;
    html += `<tr><td><b>${wk}</b></td>`;
    ids.forEach(id => {
      const q = p[id] || 0;
      total += q;
      html += `<td>${q || '-'}</td>`;
    });
    html += `<td><b>${total}</b></td></tr>`;
  });
  html += '</table>';

  // Summary chart: total marmitas per type across all weeks
  html += '<div style="margin-top:16px"><b style="font-size:13px;color:var(--blue)">Acumulado (todas as semanas)</b></div>';
  const totals = {};
  ids.forEach(id => { totals[id] = 0; });
  let grandTotal = 0;
  weeks.forEach(wk => {
    ids.forEach(id => { totals[id] += (history[wk][id] || 0); grandTotal += (history[wk][id] || 0); });
  });
  html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">';
  MARMITA_DEFS.forEach(m => {
    const pct = grandTotal ? Math.round(totals[m.id] / grandTotal * 100) : 0;
    html += `<div style="flex:1;min-width:70px;text-align:center;background:var(--green-bg);border-radius:8px;padding:8px 4px">
      <div style="font-size:18px;font-weight:700;color:var(--green)">${totals[m.id]}</div>
      <div style="font-size:10px;color:var(--gray-mid)">${m.name.split(' - ')[1]} (${pct}%)</div>
    </div>`;
  });
  html += '</div>';

  content.innerHTML = html;
  modal.classList.add('open');
}

// ============================================================
// SHOPPING LIST (dynamic based on marmita plan)
// ============================================================

// Demanda fixa do café da manhã + lanche da tarde (para 2 pessoas × 7 dias = 14 refeições
// cada), não dependente do plano de marmitas/jantares.
const BREAKFAST_BASELINE = {
  ovos:          56,         // 4 ovos × 14 cafés
  pao_integral:  14,         // 1 fatia × 14 cafés
  mussarela:     14 * 20,    // 20g × 14 cafés
  iogurte_grego: 14 * 130,   // 130g × 14 lanches tarde
};

function buildShoppingList() {
  const plan = getMarmitaPlan();
  const dinnerPlan = getDinnerPlan();

  // Home stock (to subtract from needed quantities)
  const stock = getHomeStock();
  const have = (k) => stock[k] || 0;

  // Necessidade total = ingredientes das receitas selecionadas + baseline fixo do café
  const needs = computeIngredientNeeds(plan, dinnerPlan);
  Object.entries(BREAKFAST_BASELINE).forEach(([k, v]) => {
    needs[k] = (needs[k] || 0) + v;
  });

  // Quantidade a comprar = necessidade - estoque (não-negativo)
  const toBuy = (k) => Math.max(0, (needs[k] || 0) - have(k));

  // Proteínas (já incluem todos os pratos via needs[])
  const frangoG    = toBuy('frango');
  const carneG     = toBuy('carne_moida');
  const tilapiaG   = toBuy('tilapia');
  const lomboG     = toBuy('lombo');
  const sobrecoxaG = toBuy('sobrecoxa');
  const coxaoG     = toBuy('coxao_mole');
  const alcatraG   = toBuy('alcatra');
  const peruG      = toBuy('peito_peru');
  const atumLatas  = toBuy('atum_lata');
  const ovosTotal  = toBuy('ovos');
  const ovosDuzias = Math.ceil(ovosTotal / 12);

  // Arroz: branco e integral são perfeitamente substituíveis no estoque.
  // Cada tipo cobre sua própria necessidade primeiro; o excedente cobre a necessidade do outro.
  const arrozBrancoNeed   = needs.arroz_branco || 0;
  const arrozIntegralNeed = needs.arroz_integral || 0;
  const arrozBrancoStock   = have('arroz_branco');
  const arrozIntegralStock = have('arroz_integral');
  let _wGap = Math.max(0, arrozBrancoNeed - arrozBrancoStock);
  let _iGap = Math.max(0, arrozIntegralNeed - arrozIntegralStock);
  const _wSurplus = Math.max(0, arrozBrancoStock - arrozBrancoNeed);
  const _iSurplus = Math.max(0, arrozIntegralStock - arrozIntegralNeed);
  _wGap -= Math.min(_iSurplus, _wGap);
  _iGap -= Math.min(_wSurplus, _iGap);
  const arrozBrancoG   = _wGap;
  const arrozIntegralG = _iGap;

  // Outros carboidratos
  const batataDoceG  = toBuy('batata_doce');
  const mandiocaG    = toBuy('mandioca');
  const macarraoG    = toBuy('macarrao_integral');
  const gomaTapiocaG = toBuy('goma_tapioca');
  const tortillasUn  = toBuy('tortilla');
  const paoFatias    = toBuy('pao_integral');

  // Laticínios e cremes
  const mussarelaG = toBuy('mussarela');
  const minasG     = toBuy('queijo_minas');
  const requeijaoG = toBuy('requeijao');
  const cottageG   = toBuy('cottage');
  const cottagePotes = cottageG > 0 ? Math.ceil(cottageG / 400) : 0;
  const iogurteG   = toBuy('iogurte_grego');

  // Frutas: todas perfeitamente substituíveis, mas ponderadas pelos carboidratos reais.
  // Estoque é informado em GRAMAS. Converte para carbo: carbs = grams × (c / gPerPorcao).
  // Orçamento semanal = FRUIT_WEEKLY_CARB_NEED (g). O shortfall é convertido de volta
  // para porções médias apenas para exibição na lista de compras.
  const fruitCarbStock = GEN_FRUITS.reduce((sum, f) => sum + have(f.key) * (f.c / f.gPerPorcao), 0);
  const fruitCarbShortfall = Math.max(0, FRUIT_WEEKLY_CARB_NEED - fruitCarbStock);
  const fruitShortfall = fruitCarbShortfall > 0 ? Math.ceil(fruitCarbShortfall / FRUIT_AVG_CARB) : 0;
  const fruitBuySuggestions = buildFruitBuySuggestions(fruitCarbShortfall);

  // Contagens totais (ainda usadas por labels que dependem do número de refeições)
  const qF = plan.F || 0;
  const qD = plan.D || 0;
  const totalMarmitas = Object.values(plan).reduce((a, b) => a + (b || 0), 0);
  const totalDinners  = Object.values(dinnerPlan).reduce((a, b) => a + (b || 0), 0);

  // Pepino: derivado direto dos ingredientes das receitas. 1 pepino ≈ 150g.
  const pepinoG  = needs.pepino || 0;
  const pepinos  = pepinoG > 0 ? Math.ceil(pepinoG / 150) : 0;

  // Alface/rúcula: o campo `alface` nas receitas representa o mix de folhas.
  // Aproximação: ~60% alface (alface em unidades, 1 pé ≈ 200g) e ~40% rúcula
  // (1 maço ≈ 100g). Somamos +1 para margem de segurança.
  const folhasG   = needs.alface || 0;
  const alfaceUn  = folhasG > 0 ? Math.ceil((folhasG * 0.6) / 200) + 1 : 0;
  const rucuaMacos = folhasG > 0 ? Math.ceil((folhasG * 0.4) / 100) + 1 : 0;

  const fmt = (g) => g >= 1000 ? `~${(g/1000).toFixed(1)} kg` : `~${Math.round(g/10)*10} g`;

  // Aromatics dinâmicos (alho, cebola, limão, tomate, polpa de tomate) escalonados
  // com base no rendimento de cada receita e nas quantidades planejadas.
  const aromaticsRaw = computeAromatics(plan, dinnerPlan);
  const alhoDentes   = Math.ceil(aromaticsRaw.alho);
  const alhoCabecas  = alhoDentes > 0 ? Math.ceil(alhoDentes / 10) : 0; // 1 cabeça = 10 dentes
  const cebolaUn     = Math.ceil(aromaticsRaw.cebola);
  const limaoUn      = Math.ceil(aromaticsRaw.limao);
  const tomateUn     = Math.ceil(aromaticsRaw.tomate);
  const polpaSaches  = aromaticsRaw.polpa_tomate > 0 ? Math.ceil(aromaticsRaw.polpa_tomate / 200) : 0;

  return [
    { section: 'Proteínas (marmitas + refeições)', items: [
      ...(frangoG > 0 ? [{ name: 'Peito de frango (cru)', qty: fmt(frangoG) }] : []),
      ...(sobrecoxaG > 0 ? [{ name: 'Sobrecoxa sem pele (crua)', qty: fmt(sobrecoxaG) }] : []),
      ...(carneG > 0 ? [{ name: 'Carne moída magra (patinho, coxão mole ou coxão duro)', qty: fmt(carneG) }] : []),
      ...(coxaoG > 0 ? [{ name: 'Coxão mole (cru)', qty: fmt(coxaoG) }] : []),
      ...(tilapiaG > 0 ? [{ name: 'Filé de tilápia (cru)', qty: fmt(tilapiaG) }] : []),
      ...(lomboG > 0 ? [{ name: 'Lombo suíno (cru)', qty: fmt(lomboG) }] : []),
      ...(alcatraG > 0 ? [{ name: 'Alcatra (crua)', qty: fmt(alcatraG) }] : []),
      ...(ovosTotal > 0 ? [{ name: 'Ovos', qty: `${ovosDuzias} dúzia${ovosDuzias > 1 ? 's' : ''} (${ovosTotal} un)` }] : []),
      ...(atumLatas > 0 ? [{ name: 'Atum em água (lata)', qty: `${atumLatas} lata${atumLatas > 1 ? 's' : ''} (~120g drenado/lata)` }] : []),
      ...(peruG > 0 ? [{ name: 'Peito de peru defumado', qty: fmt(peruG) }] : []),
      ...(mussarelaG > 0 ? [{ name: 'Queijo mussarela fatiado', qty: fmt(mussarelaG) }] : []),
      ...(minasG > 0 ? [{ name: 'Queijo minas frescal', qty: fmt(minasG) }] : []),
      ...(cottagePotes > 0 ? [{ name: 'Queijo cottage', qty: `${cottagePotes} pote${cottagePotes > 1 ? 's' : ''} (400g cada)` }] : []),
      ...(requeijaoG > 0 ? [{ name: 'Requeijão cremoso', qty: fmt(requeijaoG) }] : []),
      ...(iogurteG > 0 ? [{ name: 'Iogurte grego natural', qty: fmt(iogurteG) }] : []),
    ]},
    { section: 'Carboidratos', items: [
      ...(arrozBrancoG > 0 ? [{ name: 'Arroz branco (cru)', qty: fmt(arrozBrancoG) }] : []),
      ...(arrozIntegralG > 0 ? [{ name: 'Arroz integral (cru)', qty: fmt(arrozIntegralG) }] : []),
      ...(batataDoceG > 0 ? [{ name: 'Batata doce', qty: fmt(batataDoceG) }] : []),
      ...(mandiocaG > 0 ? [{ name: 'Mandioca (crua)', qty: fmt(mandiocaG) }] : []),
      ...(macarraoG > 0 ? [{ name: 'Macarrão integral (cru)', qty: fmt(macarraoG) }] : []),
      ...(paoFatias > 0 ? [{ name: 'Pão integral', qty: `${Math.ceil(paoFatias / 14)} pacote${Math.ceil(paoFatias / 14) > 1 ? 's' : ''} (${paoFatias} fatias)` }] : []),
      ...(gomaTapiocaG > 0 ? [{ name: 'Goma de tapioca', qty: fmt(gomaTapiocaG) }] : []),
      ...(tortillasUn > 0 ? [{ name: 'Tortilla integral', qty: `${tortillasUn} unidades (~40g cada)` }] : []),
    ]},
    { section: 'Frutas', items: [
      ...(fruitShortfall > 0 ? [{
        name: 'Maçã',
        qty: `${fruitShortfall} porções`,
        fruitWarning: true,
        fruitBuySuggestions: fruitBuySuggestions,
      }] : []),
    ]},
    { section: 'Folhas e Vegetais', items: [
      ...(alfaceUn > 0 ? [{ name: 'Alface', qty: `${alfaceUn} unidade${alfaceUn > 1 ? 's' : ''}` }] : []),
      ...(rucuaMacos > 0 ? [{ name: 'Rúcula', qty: `${rucuaMacos} maço${rucuaMacos > 1 ? 's' : ''}` }] : []),
      ...(pepinos > 0 ? [{ name: 'Pepino', qty: `${pepinos} unidade${pepinos > 1 ? 's' : ''}` }] : []),
    ]},
    { section: 'Temperos e Outros', items: [
      { name: 'Azeite de oliva extra virgem', qty: '1 garrafa (500ml)' },
      ...(alhoCabecas > 0 ? [{ name: 'Alho fresco', qty: `${alhoCabecas} cabeça${alhoCabecas > 1 ? 's' : ''} (${alhoDentes} dentes)` }] : []),
      ...(cebolaUn > 0 ? [{ name: 'Cebola', qty: `${cebolaUn} unidade${cebolaUn > 1 ? 's' : ''}` }] : []),
      ...(limaoUn > 0 ? [{ name: 'Limão', qty: `${limaoUn} unidade${limaoUn > 1 ? 's' : ''}` }] : []),
      ...(tomateUn > 0 ? [{ name: 'Tomate fresco', qty: `${tomateUn} unidade${tomateUn > 1 ? 's' : ''}` }] : []),
      ...(polpaSaches > 0 ? [{ name: 'Polpa de tomate', qty: `${polpaSaches} sachê${polpaSaches > 1 ? 's' : ''} (~200g cada)` }] : []),
      ...(qF > 0 ? [{ name: 'Manjericão fresco', qty: '1 maço' }] : []),
      ...(qD > 0 ? [{ name: 'Mostarda dijon', qty: '1 frasco' }] : []),
      ...(qD > 0 ? [{ name: 'Mel', qty: '1 frasco' }] : []),
      { name: 'Páprica doce/defumada', qty: '1 pote' },
      { name: 'Ervas finas', qty: '1 pote' },
      { name: 'Pimenta do reino', qty: '1 pote' },
      { name: 'Orégano', qty: '1 pote' },
      { name: 'Café em pó', qty: '2 pacotes' },
    ]},
    { section: 'Suplementos (mensal)', items: [
      { name: 'Whey protein isolado', qty: '2 potes (900g)' },
      { name: 'Creatina monoidratada', qty: '2 potes (300g)' },
      { name: 'Caseina (opcional)', qty: '2 potes (900g)' },
      { name: 'Psyllium (opcional)', qty: '1 pote (400g)' },
    ]},
  ];
}

function renderShoppingList() {
  const container = document.getElementById('shopping-list');
  if (!container) return;
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.shopChecks) || '{}');
  const shopItems = buildShoppingList();
  let html = '', total = 0, checked = 0;
  shopItems.forEach(sec => {
    if (!sec.items || sec.items.length === 0) return; // skip empty sections
    html += `<div class="check-section">${sec.section}</div>`;
    sec.items.forEach(item => {
      const key = sec.section.slice(0,10) + '_' + item.name;
      const isChecked = saved[key] || false;
      total++;
      if (isChecked) checked++;
      html += `<div class="check-item ${isChecked ? 'checked' : ''}" onclick="toggleShopRow('${key.replace(/'/g,"\\'")}', this)" style="cursor:pointer">
        <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation()" onchange="toggleShop('${key.replace(/'/g,"\\'")}', this)">
        <label class="check-label"><span class="qty">${item.qty}</span> ${item.name}</label>
      </div>`;
      if (item.fruitWarning) {
        html += `<div style="background:#fff5f5;border-left:3px solid var(--red);color:var(--red);padding:8px 12px;margin:4px 0 6px;font-size:12px;border-radius:6px">
          Você pode comprar outras frutas no lugar da maçã. Consulte a tabela de frutas na aba <b>Marmitas</b> para ver as equivalências de porção.
        </div>`;
      }
      if (item.fruitBuySuggestions && item.fruitBuySuggestions.length > 0) {
        const bullets = item.fruitBuySuggestions
          .map(s => `<li style="margin:2px 0"><b>${s.porcoes} porções</b> — ${s.name}</li>`)
          .join('');
        html += `<div style="background:#f0fff4;border-left:3px solid var(--green);padding:8px 12px;margin:2px 0 8px;font-size:12px;border-radius:6px">
          <b style="color:var(--green)">Sugestão de compra (3 frutas variadas):</b>
          <ul style="margin:4px 0 0 18px;padding:0;color:var(--gray)">${bullets}</ul>
        </div>`;
      }
    });
  });
  container.innerHTML = html;
  updateProgress('shop', checked, total);
}

function toggleShop(key, el) {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.shopChecks) || '{}');
  saved[key] = el.checked;
  localStorage.setItem(STORAGE_KEYS.shopChecks, JSON.stringify(saved));
  el.closest('.check-item').classList.toggle('checked', el.checked);
  const total = document.querySelectorAll('#shopping-list input[type="checkbox"]').length;
  const checked = document.querySelectorAll('#shopping-list input[type="checkbox"]:checked').length;
  updateProgress('shop', checked, total);
}

function toggleShopRow(key, row) {
  const cb = row.querySelector('input[type="checkbox"]');
  cb.checked = !cb.checked;
  toggleShop(key, cb);
}

function exportShoppingPDF() {
  const shopItems = buildShoppingList();
  const date = localDateStr().split('-').reverse().join('/');
  const fileName = `lista-compras-${date.replace(/\//g, '-')}.pdf`;

  // Wait for jsPDF to load if not ready
  if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
    // Try to load dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => exportShoppingPDF();
    script.onerror = () => alert('Não foi possível carregar a biblioteca de PDF. Verifique sua conexão.');
    document.head.appendChild(script);
    return;
  }

  const jsPDFLib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!jsPDFLib) {
    alert('Biblioteca de PDF não disponível.');
    return;
  }
  const jsPDF = jsPDFLib;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Header
  doc.setFillColor(26, 54, 93);
  doc.rect(0, 0, pageW, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Lista de Compras', margin, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${date}  |  Plano de Recomposicao (2 pessoas)`, margin, 19);

  y = 35;
  doc.setTextColor(45, 55, 72);

  shopItems.forEach(sec => {
    if (y > pageH - 25) {
      doc.addPage();
      y = margin;
    }
    // Section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(39, 103, 73);
    doc.text(sec.section, margin, y);
    doc.setDrawColor(198, 246, 213);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 72);

    sec.items.forEach(item => {
      if (y > pageH - 15) {
        doc.addPage();
        y = margin;
      }
      // Checkbox
      doc.setDrawColor(160, 174, 192);
      doc.setLineWidth(0.3);
      doc.rect(margin, y - 3, 3, 3);
      // Qty (bold blue)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 54, 93);
      doc.text(item.qty, margin + 6, y);
      // Name
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(45, 55, 72);
      doc.text(item.name, margin + 42, y);
      y += 6;
      // Fruit warning (below maçã item)
      if (item.fruitWarning) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(229, 62, 62);
        const warn = 'Voce pode comprar outras frutas no lugar da maca. Ver tabela de frutas na aba Marmitas.';
        const lines = doc.splitTextToSize(warn, pageW - margin * 2 - 6);
        doc.text(lines, margin + 6, y);
        y += lines.length * 4 + 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(45, 55, 72);
      }
      // Fruit buy suggestions (up to 3 varied fruits)
      if (item.fruitBuySuggestions && item.fruitBuySuggestions.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(39, 103, 73);
        doc.text('Sugestao de compra:', margin + 6, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(74, 85, 104);
        item.fruitBuySuggestions.forEach(s => {
          if (y > pageH - 15) { doc.addPage(); y = margin; }
          const nameNoAccent = s.name.replace(/ã/g,'a').replace(/á/g,'a').replace(/â/g,'a')
            .replace(/é/g,'e').replace(/ê/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ô/g,'o')
            .replace(/ú/g,'u').replace(/ç/g,'c');
          doc.text(`- ${s.porcoes} porcoes: ${nameNoAccent}`, margin + 10, y);
          y += 4;
        });
        y += 2;
        doc.setFontSize(10);
        doc.setTextColor(45, 55, 72);
      }
    });
    y += 4;
  });

  // Footer on last page
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(160, 174, 192);
  doc.text(`Gerado em PeitudasNOW - ${date}`, pageW / 2, pageH - 8, { align: 'center' });

  // Generate blob
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  // Try native share first (iOS supports PDF share to WhatsApp, email, etc.)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      files: [file],
      title: 'Lista de Compras',
      text: `Lista de Compras - ${date}`
    }).catch(err => {
      if (err.name !== 'AbortError') {
        downloadPDF(blob, fileName);
      }
    });
  } else {
    downloadPDF(blob, fileName);
  }
}

function downloadPDF(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateProgress(type, checked, total) {
  const bar = document.getElementById(type + '-progress');
  const txt = document.getElementById(type + '-progress-text');
  if (!bar || !txt) return;
  const pct = total ? Math.round(checked / total * 100) : 0;
  bar.style.width = pct + '%';
  txt.textContent = `${checked} de ${total} itens (${pct}%)`;
}

async function resetChecklist(type) {
  if (!await customConfirm('Limpar todos os itens marcados?', { okLabel: 'Limpar', danger: true })) return;
  localStorage.removeItem(type + '_checks');
  if (type === 'shop') renderShoppingList();
}

// ============================================================
// WORKOUT TRACKER
// ============================================================
const WORKOUTS = {
  A: [
    { name: 'Agachamento livre / Leg press', sets: 4, reps: '8-10', muscles: 'Quadriceps, glúteos, core' },
    { name: 'Supino reto (halteres)', sets: 4, reps: '8-10', muscles: 'Peitoral, triceps, ombros' },
    { name: 'Remada curvada (halteres)', sets: 3, reps: '10-12', muscles: 'Costas, biceps, trapezio' },
    { name: 'Elevação lateral', sets: 3, reps: '12-15', muscles: 'Deltóides laterais' },
    { name: 'Rosca direta', sets: 2, reps: '10-12', muscles: 'Biceps' },
    { name: 'Prancha abdominal', sets: 3, reps: '30-45s', muscles: 'Core' },
  ],
  B: [
    { name: 'Lev. terra romeno (halteres)', sets: 4, reps: '8-10', muscles: 'Posteriores, glúteos, lombar' },
    { name: 'Press militar sentado', sets: 4, reps: '8-10', muscles: 'Ombros, triceps' },
    { name: 'Puxada frontal', sets: 3, reps: '8-12', muscles: 'Costas, biceps' },
    { name: 'Afundo bulgaro', sets: 3, reps: '10-12/perna', muscles: 'Quadriceps, glúteos' },
    { name: 'Triceps testa', sets: 2, reps: '10-12', muscles: 'Triceps' },
    { name: 'Elevação de pernas', sets: 3, reps: '12-15', muscles: 'Abdômen inferior' },
  ]
};
const CARDIO_TYPES = ['Caminhada','Bicicleta','Corrida','HIIT','Outro'];
const CARDIO_HAS_DISTANCE = ['Caminhada','Bicicleta','Corrida'];

let currentWorkout = 'A';
let currentWeek = 1;
let cardioEntries = [];

function switchWorkout(type) {
  currentWorkout = type;
  document.querySelectorAll('.workout-toggle button').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && type === 'A') || (i === 1 && type === 'B') || (i === 2 && type === 'F'))
  );
  // Hide/show exercise-specific elements
  document.getElementById('exercises-container').style.display = type === 'F' ? 'none' : 'block';
  document.querySelector('.week-nav').style.display = type === 'F' ? 'none' : 'flex';
  if (type !== 'F') renderExercises();
}

function changeWeek(delta) {
  currentWeek = Math.max(1, currentWeek + delta);
  document.getElementById('week-label').textContent = 'Semana ' + currentWeek;
  renderExercises();
}

function stepVal(inputId, delta) {
  const el = document.getElementById(inputId);
  const cur = parseFloat(el.value) || 0;
  const next = Math.max(0, cur + delta);
  el.value = next % 1 === 0 ? next : next.toFixed(1);
}

// Track which exercises are checked as done
let exerciseChecks = {};

function getLastWorkoutData(type, currentWk) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.workouts) || '{}');
  // First try current week
  const current = all[type + '_w' + currentWk];
  if (current && Object.keys(current).length > 0) return current;
  // Otherwise find most recent previous week
  let bestWeek = 0, bestData = null;
  Object.keys(all).forEach(k => {
    if (k.startsWith(type + '_w') && k !== '_meta') {
      const wk = parseInt(k.split('_w')[1]);
      if (wk < currentWk && wk > bestWeek) { bestWeek = wk; bestData = all[k]; }
    }
  });
  return bestData || {};
}

function renderExercises() {
  const exercises = WORKOUTS[currentWorkout];
  const saved = getLastWorkoutData(currentWorkout, currentWeek);
  const container = document.getElementById('exercises-container');
  // Initialize checks for this render
  if (!exerciseChecks[currentWorkout]) exerciseChecks[currentWorkout] = {};
  let html = '';
  exercises.forEach((ex, ei) => {
    const isPlank = ex.reps.includes('s');
    const kgStep = 1;
    const repStep = 1;
    const isChecked = exerciseChecks[currentWorkout][ei] || false;
    html += `<div class="exercise-card ${isChecked ? 'done' : ''}" id="excard_${ei}">
      <div class="ex-header">
        <div class="ex-header-info">
          <div class="ex-name">${ex.name}</div>
          <div class="ex-target">Meta: ${ex.sets} x ${ex.reps} | ${ex.muscles}</div>
        </div>
        <div class="ex-check ${isChecked ? 'checked' : ''}" onclick="toggleExCheck(${ei})">&#10003;</div>
      </div>
      <div class="sets-grid">
        <div class="hdr"></div><div class="hdr">Peso (kg)</div><div class="hdr">${isPlank ? 'Seg' : 'Reps'}</div>`;
    for (let s = 0; s < ex.sets; s++) {
      const sv = saved[ei] && saved[ei][s] ? saved[ei][s] : { kg: '', reps: '' };
      const kgId = `w_${ei}_${s}_kg`;
      const repId = `w_${ei}_${s}_reps`;
      html += `<div class="set-label">S${s+1}</div>
        <div class="input-stepper">
          <button class="step-btn minus" onclick="stepVal('${kgId}',-${kgStep})" aria-label="Diminuir peso">-</button>
          <input type="number" inputmode="decimal" placeholder="kg" id="${kgId}" value="${sv.kg}">
          <button class="step-btn plus" onclick="stepVal('${kgId}',${kgStep})" aria-label="Aumentar peso">+</button>
        </div>
        <div class="input-stepper">
          <button class="step-btn minus" onclick="stepVal('${repId}',-${repStep})" aria-label="Diminuir repetições">-</button>
          <input type="number" inputmode="numeric" placeholder="${isPlank ? 'seg' : 'reps'}" id="${repId}" value="${sv.reps}">
          <button class="step-btn plus" onclick="stepVal('${repId}',${repStep})" aria-label="Aumentar repetições">+</button>
        </div>`;
    }
    html += '</div></div>';
  });
  container.innerHTML = html;
}

function toggleExCheck(ei) {
  if (!exerciseChecks[currentWorkout]) exerciseChecks[currentWorkout] = {};
  exerciseChecks[currentWorkout][ei] = !exerciseChecks[currentWorkout][ei];
  const card = document.getElementById('excard_' + ei);
  const check = card.querySelector('.ex-check');
  const isChecked = exerciseChecks[currentWorkout][ei];
  card.classList.toggle('done', isChecked);
  check.classList.toggle('checked', isChecked);
}

function getSavedWorkout(type, week) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.workouts) || '{}');
  return all[type + '_w' + week] || {};
}

// ---- CARDIO (daily) ----
function getTodayCardioKey() {
  return 'cardio_' + localDateStr();
}

function loadTodayCardio() {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.cardioLog) || '{}');
  cardioEntries = all[getTodayCardioKey()] || [];
  renderCardioEntries();
  // Update title with today's date
  const d = new Date();
  document.getElementById('cardio-title').textContent = `Cardio de Hoje (${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')})`;
}

function renderCardioEntries() {
  const container = document.getElementById('cardio-entries');
  if (cardioEntries.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--gray-mid);font-size:13px;padding:10px 0">Nenhum cardio hoje</div>';
    return;
  }
  let html = '';
  cardioEntries.forEach((e, i) => {
    const showDist = CARDIO_HAS_DISTANCE.includes(e.type);
    const showDesc = e.type === 'Outro';
    html += `<div style="background:var(--gray-bg);border-radius:10px;padding:10px;margin-bottom:8px">
      <div class="cardio-entry" style="margin-bottom:0">
        <select onchange="updateCardio(${i},'type',this.value)">
          ${CARDIO_TYPES.map(t => `<option ${t===e.type?'selected':''}>${t}</option>`).join('')}
        </select>
        <input type="number" inputmode="numeric" value="${e.min}" placeholder="min"
          onchange="updateCardio(${i},'min',this.value)" style="max-width:55px">
        <span style="font-size:11px;color:var(--gray-mid)">min</span>
        <button class="cardio-rm" onclick="removeCardio(${i})" aria-label="Remover cardio">&#10005;</button>
      </div>
      ${showDist ? `<div style="display:flex;align-items:center;gap:6px;margin-top:6px;padding-left:4px">
        <input type="number" inputmode="decimal" value="${e.km || ''}" placeholder="km"
          onchange="updateCardio(${i},'km',this.value)"
          style="width:70px;padding:6px 4px;border:1.5px solid var(--gray-light);border-radius:8px;font-size:13px;text-align:center;background:#fff">
        <span style="font-size:12px;color:var(--gray-mid)">km percorridos</span>
      </div>` : ''}
      ${showDesc ? `<div style="margin-top:6px">
        <input type="text" value="${e.desc || ''}" placeholder="Descreva a atividade..."
          onchange="updateCardio(${i},'desc',this.value)"
          style="width:100%;padding:8px;border:1.5px solid var(--gray-light);border-radius:8px;font-size:13px;background:#fff;box-sizing:border-box">
      </div>` : ''}
    </div>`;
  });
  container.innerHTML = html;
}

function addCardioEntry() {
  cardioEntries.push({ type: 'Caminhada', min: 30, km: '', desc: '' });
  renderCardioEntries();
}

function updateCardio(i, field, val) {
  if (field === 'min') cardioEntries[i][field] = parseInt(val) || 0;
  else if (field === 'km') cardioEntries[i][field] = parseFloat(val) || '';
  else cardioEntries[i][field] = val;
  // Re-render if type changed (to show/hide distance/description fields)
  if (field === 'type') renderCardioEntries();
}

function removeCardio(i) {
  cardioEntries.splice(i, 1);
  renderCardioEntries();
}

function saveTodayCardio() {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.cardioLog) || '{}');
  if (cardioEntries.length > 0) {
    all[getTodayCardioKey()] = cardioEntries;
  } else {
    delete all[getTodayCardioKey()];
  }
  localStorage.setItem(STORAGE_KEYS.cardioLog, JSON.stringify(all));
}

// ---- SAVE ----
async function saveWorkout() {
  if (currentWorkout !== 'F') {
    const exercises = WORKOUTS[currentWorkout];
    const checks = exerciseChecks[currentWorkout] || {};

    // Count checked vs total
    const totalEx = exercises.length;
    const checkedEx = Object.values(checks).filter(Boolean).length;

    if (checkedEx === 0) {
      if (!await customConfirm('Nenhum exercício foi marcado como realizado.\n\nDeseja salvar apenas o cardio?', { okLabel: 'Salvar' })) return;
    } else if (checkedEx < totalEx) {
      const missing = totalEx - checkedEx;
      if (!await customConfirm(`${missing} exercício(s) não foi(ram) marcado(s) como realizado(s).\n\nDeseja salvar o treino assim mesmo?`, { okLabel: 'Salvar' })) return;
    }

    // Save only checked exercises
    const data = {};
    exercises.forEach((ex, ei) => {
      if (checks[ei]) {
        data[ei] = {};
        for (let s = 0; s < ex.sets; s++) {
          const kg = document.getElementById(`w_${ei}_${s}_kg`).value;
          const reps = document.getElementById(`w_${ei}_${s}_reps`).value;
          data[ei][s] = { kg, reps };
        }
      }
    });
    const allW = JSON.parse(localStorage.getItem(STORAGE_KEYS.workouts) || '{}');
    allW[currentWorkout + '_w' + currentWeek] = data;
    if (!allW._meta) allW._meta = {};
    allW._meta[currentWorkout + '_w' + currentWeek] = { type: currentWorkout, week: currentWeek, date: localDateStr() };
    localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(allW));
  }

  // Save today's cardio
  saveTodayCardio();

  // Save to calendar log (date-based)
  saveToCalendar();

  const btn = document.querySelector('#page-treino .save-btn');
  const label = currentWorkout === 'F' ? 'Funcional' : 'Treino ' + currentWorkout;
  btn.textContent = 'Salvo! ' + label + ' registrado na Agenda';
  btn.style.background = '#276749';
  setTimeout(() => { btn.textContent = 'Salvar Treino'; btn.style.background = ''; }, 2000);
}

function saveToCalendar() {
  const cal = JSON.parse(localStorage.getItem(STORAGE_KEYS.calLog) || '{}');
  const today = localDateStr();
  if (!cal[today]) cal[today] = {};

  if (currentWorkout === 'F') {
    cal[today].forca = 'F';
  } else {
    // Only register if at least one exercise is checked
    const checks = exerciseChecks[currentWorkout] || {};
    const hasChecked = Object.values(checks).some(Boolean);
    if (hasChecked) cal[today].forca = currentWorkout;
  }

  if (cardioEntries && cardioEntries.length > 0) {
    // Save full cardio details for agenda display
    cal[today].cardio_detail = cardioEntries.map(e => ({...e}));
    cal[today].cardio = cardioEntries.map(e => {
      let s = `${e.type} ${e.min}min`;
      if (e.km) s += ` ${e.km}km`;
      if (e.type === 'Outro' && e.desc) s += ` (${e.desc})`;
      return s;
    }).join(', ');
  }
  localStorage.setItem(STORAGE_KEYS.calLog, JSON.stringify(cal));
}

// ============================================================
// HISTORY WITH CHARTS
// ============================================================
function openHistory() {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.workouts) || '{}');
  const exercises = WORKOUTS[currentWorkout];
  const modal = document.getElementById('history-modal');
  const content = document.getElementById('history-content');
  document.getElementById('history-title').textContent = 'Histórico - Treino ' + currentWorkout;

  const weeks = [];
  Object.keys(all).forEach(k => {
    if (k.startsWith(currentWorkout + '_w')) weeks.push(parseInt(k.split('_w')[1]));
  });
  weeks.sort((a, b) => a - b);

  if (weeks.length === 0) {
    content.innerHTML = '<div class="empty-state">Nenhum treino registrado ainda.<br>Registre seu primeiro treino!</div>';
    modal.classList.add('open');
    return;
  }

  let html = '';
  exercises.forEach((ex, ei) => {
    // Chart
    html += `<div class="chart-container">
      <div class="chart-title">${ex.name}</div>
      <canvas class="chart-canvas" id="chart_${ei}"></canvas>
    </div>`;
    // Table
    html += '<table class="history-table"><tr><th>Sem</th>';
    for (let s = 0; s < ex.sets; s++) html += `<th>S${s+1} kg</th><th>S${s+1} reps</th>`;
    html += '</tr>';
    weeks.forEach(wk => {
      const d = all[currentWorkout + '_w' + wk];
      html += `<tr><td><b>${wk}</b></td>`;
      for (let s = 0; s < ex.sets; s++) {
        const sv = d[ei] && d[ei][s] ? d[ei][s] : { kg: '-', reps: '-' };
        html += `<td>${sv.kg || '-'}</td><td>${sv.reps || '-'}</td>`;
      }
      html += '</tr>';
    });
    html += '</table>';
  });

  content.innerHTML = html;
  modal.classList.add('open');

  // Draw charts after DOM update
  requestAnimationFrame(() => {
    exercises.forEach((ex, ei) => drawChart(ei, ex, weeks, all));
  });
}

function drawChart(ei, ex, weeks, allData) {
  const canvas = document.getElementById('chart_' + ei);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  const pad = { top: 20, right: 16, bottom: 30, left: 40 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Get max weight across all sets for this exercise
  const setColors = ['#2b6cb0','#276749','#dd6b20','#6b46c1'];
  let allVals = [];
  for (let s = 0; s < ex.sets; s++) {
    weeks.forEach(wk => {
      const d = allData[currentWorkout + '_w' + wk];
      const v = d[ei] && d[ei][s] ? parseFloat(d[ei][s].kg) : NaN;
      if (!isNaN(v)) allVals.push(v);
    });
  }
  if (allVals.length === 0) { ctx.fillStyle = '#4a5568'; ctx.font = '12px sans-serif'; ctx.fillText('Sem dados', W/2 - 25, H/2); return; }

  const minV = Math.max(0, Math.min(...allVals) - 5);
  const maxV = Math.max(...allVals) + 5;
  const range = maxV - minV || 1;

  // Grid
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + plotH - (plotH * i / 4);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    ctx.fillStyle = '#4a5568'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(minV + range * i / 4) + '', pad.left - 4, y + 3);
  }
  // X labels
  ctx.textAlign = 'center'; ctx.fillStyle = '#4a5568';
  weeks.forEach((wk, i) => {
    const x = pad.left + (weeks.length === 1 ? plotW / 2 : plotW * i / (weeks.length - 1));
    ctx.fillText('S' + wk, x, H - 6);
  });

  // Draw lines per set
  for (let s = 0; s < Math.min(ex.sets, 4); s++) {
    ctx.strokeStyle = setColors[s]; ctx.lineWidth = 2; ctx.beginPath();
    let started = false;
    weeks.forEach((wk, i) => {
      const d = allData[currentWorkout + '_w' + wk];
      const v = d[ei] && d[ei][s] ? parseFloat(d[ei][s].kg) : NaN;
      if (isNaN(v)) return;
      const x = pad.left + (weeks.length === 1 ? plotW / 2 : plotW * i / (weeks.length - 1));
      const y = pad.top + plotH - plotH * (v - minV) / range;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Dots
    ctx.fillStyle = setColors[s];
    weeks.forEach((wk, i) => {
      const d = allData[currentWorkout + '_w' + wk];
      const v = d[ei] && d[ei][s] ? parseFloat(d[ei][s].kg) : NaN;
      if (isNaN(v)) return;
      const x = pad.left + (weeks.length === 1 ? plotW / 2 : plotW * i / (weeks.length - 1));
      const y = pad.top + plotH - plotH * (v - minV) / range;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    });
  }
  // Legend
  ctx.font = '9px sans-serif';
  for (let s = 0; s < Math.min(ex.sets, 4); s++) {
    const lx = pad.left + s * 50;
    ctx.fillStyle = setColors[s];
    ctx.fillRect(lx, 4, 10, 8);
    ctx.fillStyle = '#4a5568';
    ctx.textAlign = 'left';
    ctx.fillText('S' + (s+1), lx + 13, 12);
  }
}

function closeHistory() {
  // Se o Gerador de Cardápio está aberto, persiste o estado atual como draft
  if (document.getElementById('gen-result')) saveGenDraft();
  document.getElementById('history-modal').classList.remove('open');
}
document.getElementById('history-modal').addEventListener('click', function(e) {
  // Fecha ao clicar fora do card (no overlay ou no wrapper que envolve o modal)
  if (e.target === this || e.target.classList.contains('modal-wrap')) closeHistory();
});

// ============================================================
// CALENDAR
// ============================================================
let calYear, calMonth;
(function() { const d = new Date(); calYear = d.getFullYear(); calMonth = d.getMonth(); })();

const MONTH_NAMES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_HEADERS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];

function changeMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function renderCalendar() {
  document.getElementById('cal-month-label').textContent = MONTH_NAMES[calMonth] + ' ' + calYear;
  const cal = JSON.parse(localStorage.getItem(STORAGE_KEYS.calLog) || '{}');
  const grid = document.getElementById('cal-grid');
  const today = new Date();
  const todayStr = localDateStr(today);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  let html = DAY_HEADERS.map(d => `<div class="cal-header">${d}</div>`).join('');

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';

  const consumed = getConsumed();
  let forcaDays = 0, cardioDays = 0, totalCardioMin = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const entry = cal[dateStr] || {};
    const hasForca = !!entry.forca;
    const hasCardio = !!entry.cardio;
    const dayMarmitas = consumed[dateStr];
    const hasMarmita = dayMarmitas && ((Array.isArray(dayMarmitas) && dayMarmitas.length > 0) || typeof dayMarmitas === 'string');

    if (hasForca) forcaDays++;
    if (hasCardio) {
      cardioDays++;
      const mins = entry.cardio.match(/(\d+)min/g);
      if (mins) mins.forEach(m => totalCardioMin += parseInt(m));
    }

    let dots = '';
    if (hasMarmita || hasForca || hasCardio) {
      dots = '<div class="cal-dots">';
      if (hasMarmita) dots += '<div class="cal-dot marmita"></div>';
      if (hasForca) dots += `<div class="cal-dot forca" style="width:auto;height:auto;border-radius:3px;padding:0 3px;font-size:8px;font-weight:700;color:#fff;background:var(--blue-mid)">${entry.forca}</div>`;
      if (hasCardio) dots += '<div class="cal-dot cardio"></div>';
      dots += '</div>';
    }

    const hasData = hasMarmita || hasForca || hasCardio;
    html += `<div class="cal-cell ${isToday ? 'today' : ''} ${hasData ? 'has-data' : ''}" data-date="${dateStr}" onclick="showDayDetail('${dateStr}')">${d}${dots}</div>`;
  }
  grid.innerHTML = html;

  // Summary
  const summary = document.getElementById('cal-summary');
  summary.innerHTML = `
    <h3 style="font-size:15px;color:var(--blue);margin-bottom:10px">${MONTH_NAMES[calMonth]} - Resumo</h3>
    <div class="stat-row"><span>Dias de treino de força</span><span class="stat-val">${forcaDays}</span></div>
    <div class="stat-row"><span>Dias de cardio</span><span class="stat-val">${cardioDays}</span></div>
    <div class="stat-row"><span>Minutos totais de cardio</span><span class="stat-val">${totalCardioMin} min</span></div>
    <div class="stat-row"><span>Frequência semanal (média)</span><span class="stat-val">${(forcaDays / (daysInMonth / 7)).toFixed(1)}x força | ${(cardioDays / (daysInMonth / 7)).toFixed(1)}x cardio</span></div>
  `;
}

// ============================================================
// DAY DETAIL
// ============================================================
function showDayDetail(dateStr) {
  const detail = document.getElementById('day-detail');

  // Highlight selected cell
  document.querySelectorAll('.cal-cell.selected').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.cal-cell').forEach(c => {
    if (c.getAttribute('data-date') === dateStr) c.classList.add('selected');
  });

  const cal = JSON.parse(localStorage.getItem(STORAGE_KEYS.calLog) || '{}');
  const entry = cal[dateStr] || {};
  const consumed = getConsumed();
  const dayMarmitas = consumed[dateStr];
  const hasMarmitas = dayMarmitas && ((Array.isArray(dayMarmitas) && dayMarmitas.length > 0) || typeof dayMarmitas === 'string');
  const isPast = dateStr < localDateStr();
  const isToday = dateStr === localDateStr();

  const parts = dateStr.split('-');
  const dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;

  // Always build full card
  let html = `
    <div class="dd-header">
      <span class="dd-date">${dateDisplay}${isToday ? ' (hoje)' : ''}</span>
      <button class="dd-close" onclick="closeDayDetail()" aria-label="Fechar detalhes do dia">&times;</button>
    </div>`;

  // -- Marmitas section --
  html += `<div class="dd-section">
    <div class="dd-label">Marmitas</div>
    <div class="dd-content">`;
  if (hasMarmitas) {
    const arr = Array.isArray(dayMarmitas) ? dayMarmitas : [dayMarmitas, dayMarmitas];
    const grouped = {};
    arr.forEach(t => { grouped[t] = (grouped[t] || 0) + 1; });
    Object.entries(grouped).forEach(([type, count]) => {
      const def = MARMITA_DEFS.find(x => x.id === type);
      const name = def ? def.name.split(' - ')[1] : type;
      const macros = def ? `${def.kcal} kcal | ${def.p}g P` : '';
      html += `<div class="dd-exercise">
        <span class="dd-ex-name">${count}x ${name}</span>
        <span class="dd-ex-stats">${macros}</span>
      </div>`;
    });
  } else {
    html += '<div style="font-size:13px;color:var(--gray-mid)">Nenhuma marmita registrada</div>';
  }
  html += '</div></div>';

  // -- Treino section --
  html += `<div class="dd-section">
    <div class="dd-label">Treino</div>
    <div class="dd-content">`;
  if (entry.forca) {
    const workoutType = entry.forca;
    const wLabel = workoutType === 'F' ? 'Funcional' : 'Treino ' + workoutType;
    const exercises = WORKOUTS[workoutType];
    const allW = JSON.parse(localStorage.getItem(STORAGE_KEYS.workouts) || '{}');
    let workoutData = null;
    if (allW._meta) {
      Object.keys(allW._meta).forEach(k => {
        if (allW._meta[k].date === dateStr && allW._meta[k].type === workoutType) {
          workoutData = allW[k];
        }
      });
    }
    html += `<div style="font-size:13px;font-weight:600;color:var(--blue);margin-bottom:4px">${wLabel}</div>`;
    if (workoutData && exercises) {
      exercises.forEach((ex, ei) => {
        const d = workoutData[ei];
        if (!d) return;
        let totalKg = 0, totalReps = 0, count = 0;
        for (let s = 0; s < ex.sets; s++) {
          if (d[s] && d[s].kg) {
            totalKg += parseFloat(d[s].kg) || 0;
            totalReps += parseInt(d[s].reps) || 0;
            count++;
          }
        }
        if (count > 0) {
          html += `<div class="dd-exercise">
            <span class="dd-ex-name">${ex.name}</span>
            <span class="dd-ex-stats">${(totalKg/count).toFixed(1)}kg &times; ${Math.round(totalReps/count)} reps</span>
          </div>`;
        }
      });
    } else if (workoutType === 'F') {
      html += '<div style="font-size:13px">Sessão de funcional realizada</div>';
    }
  } else {
    html += '<div style="font-size:13px;color:var(--gray-mid)">Nenhum treino registrado</div>';
  }
  html += '</div></div>';

  // -- Cardio section --
  if (entry.cardio) {
    html += `<div class="dd-section">
      <div class="dd-label">Cardio</div>
      <div class="dd-content">`;
    if (entry.cardio_detail && Array.isArray(entry.cardio_detail)) {
      entry.cardio_detail.forEach(c => {
        html += `<div class="dd-exercise">
          <span class="dd-ex-name">${c.type}${c.type === 'Outro' && c.desc ? ': ' + c.desc : ''}</span>
          <span class="dd-ex-stats">${c.min} min${c.km ? ' | ' + c.km + ' km' : ''}</span>
        </div>`;
      });
    } else {
      html += `<div style="font-size:13px">${entry.cardio}</div>`;
    }
    html += '</div></div>';
  }

  // -- Buttons --
  if (isPast) {
    html += `<button class="history-btn" style="margin-top:10px" onclick="openDayEditor('${dateStr}')">Editar Dados</button>`;
  }
  if (hasMarmitas || entry.forca || entry.cardio) {
    html += `<button class="dd-delete-btn" onclick="deleteDayData('${dateStr}')">Apagar dados deste dia</button>`;
  }

  // Set content and show
  detail.innerHTML = html;
  detail.style.display = 'block';
  detail.classList.add('open');
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeDayDetail() {
  const d = document.getElementById('day-detail');
  d.classList.remove('open');
  d.style.display = 'none';
  document.querySelectorAll('.cal-cell.selected').forEach(c => c.classList.remove('selected'));
}

async function deleteDayData(dateStr) {
  const parts = dateStr.split('-');
  const dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
  if (!await customConfirm(
    `Marmitas, treino e cardio do dia ${dateDisplay} serão apagados.\n\nEsta ação não pode ser desfeita.`,
    { title: 'Apagar dados deste dia?', okLabel: 'Apagar', danger: true }
  )) return;

  const cal = JSON.parse(localStorage.getItem(STORAGE_KEYS.calLog) || '{}');
  delete cal[dateStr];
  localStorage.setItem(STORAGE_KEYS.calLog, JSON.stringify(cal));

  const consumed = getConsumed();
  delete consumed[dateStr];
  localStorage.setItem(STORAGE_KEYS.marmitaConsumed, JSON.stringify(consumed));

  closeDayDetail();
  renderCalendar();
  renderStockCard();
  renderMarmitaSelector();
  renderDinnerSelector();
}

// ============================================================
// EXPORT / IMPORT
// ============================================================
// BACKUP_KEYS is defined in data.js and shared with SYNC_KEYS.

function exportData() {
  const data = { _app: 'dieta-diego', _date: new Date().toISOString() };
  BACKUP_KEYS.forEach(k => {
    const raw = localStorage.getItem(k);
    if (raw === null) { data[k] = null; return; }
    try { data[k] = JSON.parse(raw); } catch(e) { data[k] = raw; }
  });
  // Include all meals_ keys (daily meal checks)
  Object.keys(localStorage).forEach(k => { if (k.startsWith('meals_')) data[k] = JSON.parse(localStorage.getItem(k)); });

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = localDateStr();

  // Use share API on mobile if available, otherwise download
  const file = new File([blob], `dieta-backup-${date}.json`, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'Backup Dieta', text: `Backup do app Dieta - ${date}` }).catch(() => {
      // Fallback to download if share cancelled
      downloadFile(url, file.name);
    });
  } else {
    downloadFile(url, file.name);
  }
}

function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!await customConfirm(
    'Importar este backup vai SUBSTITUIR todos os dados atuais do app.',
    { title: 'Importar backup?', okLabel: 'Importar', danger: true }
  )) {
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data._app || data._app !== 'dieta-diego') {
        alert('Arquivo inválido. Selecione um backup gerado por este app.');
        return;
      }
      // Restore all keys
      BACKUP_KEYS.forEach(k => {
        if (data[k] !== null && data[k] !== undefined) {
          localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
        }
      });
      // Restore meals_ keys
      Object.keys(data).forEach(k => {
        if (k.startsWith('meals_')) localStorage.setItem(k, JSON.stringify(data[k]));
      });

      alert('Backup importado com sucesso!\n\nData do backup: ' + (data._date || 'desconhecida').slice(0,10));

      // Re-render everything
      renderMarmitaPlanner();
      renderMeals();
      renderShoppingList();
      renderExercises();
      loadTodayCardio();
      renderCalendar();
    } catch(err) {
      alert('Erro ao ler o arquivo. Verifique se é um JSON válido.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ============================================================
// DAY EDITOR (past dates)
// ============================================================
function isDateInCurrentWeek(dateStr) {
  const editDate = new Date(dateStr + 'T12:00:00');
  const currentWeekId = getCurrentWeekLabel();
  const editWeekId = getWeekId(editDate);
  return editWeekId === currentWeekId;
}

function getEditorStock(editingDateStr) {
  // Stock = plan - all consumed this week, EXCLUDING the date being edited
  const plan = getMarmitaPlan();
  const consumed = getConsumed();
  const stock = {};
  MARMITA_DEFS.forEach(m => { stock[m.id] = plan[m.id] || 0; });

  const currentWeekId = getCurrentWeekLabel();
  Object.entries(consumed).forEach(([date, arr]) => {
    if (date === editingDateStr) return; // Exclude the date being edited
    const d = new Date(date + 'T12:00:00');
    if (getWeekId(d) !== currentWeekId) return; // Only count current week
    const items = Array.isArray(arr) ? arr : [arr, arr];
    items.forEach(type => { if (stock[type] !== undefined) stock[type]--; });
  });
  return stock;
}


function buildFruitBuySuggestions(shortfallCarbsG) {
  if (shortfallCarbsG <= 0) return [];
  // Decide how many different fruits based on shortfall size
  const avgShortfallPorcoes = shortfallCarbsG / FRUIT_AVG_CARB;
  let count;
  if (avgShortfallPorcoes <= 2) count = 1;
  else if (avgShortfallPorcoes <= 5) count = 2;
  else count = 3;
  // Pick the set for the current week (rotates to avoid monotony)
  const weekHash = parseInt(getWeekId().replace(/\D/g, '').slice(-3), 10) || 0;
  const setKeys = FRUIT_SUGGESTION_SETS[weekHash % FRUIT_SUGGESTION_SETS.length];
  const chosen = setKeys.slice(0, count)
    .map(k => GEN_FRUITS.find(f => f.key === k))
    .filter(Boolean);
  if (chosen.length === 0) return [];
  // Split carb budget equally among chosen fruits, convert to porções per fruit (ceil)
  const perFruit = shortfallCarbsG / chosen.length;
  return chosen.map(f => ({
    name: f.label,
    porcoes: Math.ceil(perFruit / f.c),
  }));
}

function getHomeStock() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.homeStock) || '{}');
}

// ============================================================
// GEN DRAFT (in-progress state of the Gerador de Cardápio)
// ============================================================
// Persiste os inputs e resultados gerados entre aberturas do modal, para que
// o usuário possa fechar e reabrir sem perder o que digitou nem a sugestão.
function loadGenDraft() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.genDraft) || 'null'); }
  catch (e) { return null; }
}

function saveGenDraft() {
  try {
    // readGenInputs só funciona se o gerador está aberto no DOM
    if (!document.getElementById('gen-result')) return;
    const stock = readGenInputs();
    const draft = { stock };
    if (window._genMarmitaResult) draft.marmitaResult = window._genMarmitaResult;
    if (window._genDinnerResult)  draft.dinnerResult  = window._genDinnerResult;
    localStorage.setItem(STORAGE_KEYS.genDraft, JSON.stringify(draft));
  } catch (e) {}
}

function clearGenDraft() {
  localStorage.removeItem(STORAGE_KEYS.genDraft);
  window._genStock = null;
  window._genMarmitaResult = null;
  window._genDinnerResult = null;
}

function openMenuGenerator() {
  const modal = document.getElementById('history-modal');
  const content = document.getElementById('history-content');
  document.getElementById('history-title').textContent = 'Gerador de Cardápio';

  // Usa o draft se houver (inputs + resultados da última vez), senão cai para home_stock
  const draft = loadGenDraft();
  const stock = (draft && draft.stock) ? draft.stock : getHomeStock();

  let html = '<div style="font-size:13px;color:var(--gray-mid);margin-bottom:14px">Informe a quantidade <b>crua</b> em gramas do que você tem em casa. As proteínas são usadas para calcular o número de marmitas e/ou jantares (arredondando para baixo). Os demais ingredientes são salvos como estoque e descontados da lista de compras.</div>';

  html += '<div style="font-size:12px;font-weight:700;color:var(--green);text-transform:uppercase;margin:12px 0 6px">Proteínas</div>';
  GEN_PROTEINS.forEach(ing => {
    const existing = stock[ing.key] || '';
    html += `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--gray-light)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--blue)">${ing.label}</div>
        <div style="font-size:11px;color:var(--gray-mid)">${getMarmitaTypeName(ing.marmita)} (${ing.rawPerUnit}g/marmita)</div>
      </div>
      <input type="number" inputmode="numeric" placeholder="0" value="${existing}" id="gen_${ing.key}"
        style="width:80px;padding:10px;border:1.5px solid var(--gray-light);border-radius:10px;font-size:14px;text-align:center;background:var(--gray-bg)">
      <span style="font-size:12px;color:var(--gray-mid)">g</span>
    </div>`;
  });

  html += '<div style="font-size:12px;font-weight:700;color:var(--orange);text-transform:uppercase;margin:14px 0 6px">Carboidratos (Marmitas)</div>';
  GEN_CARBS.forEach(ing => {
    const existing = stock[ing.key] || '';
    html += `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--gray-light)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--blue)">${ing.label}</div>
      </div>
      <input type="number" inputmode="numeric" placeholder="0" value="${existing}" id="gen_${ing.key}"
        style="width:80px;padding:10px;border:1.5px solid var(--gray-light);border-radius:10px;font-size:14px;text-align:center;background:var(--gray-bg)">
      <span style="font-size:12px;color:var(--gray-mid)">g</span>
    </div>`;
  });

  html += '<div style="font-size:12px;font-weight:700;color:var(--purple);text-transform:uppercase;margin:14px 0 6px">Proteínas (Jantares)</div>';
  GEN_SHARED_DINNER_PROTEINS.forEach(ing => {
    const existing = stock[ing.key] || '';
    html += `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--gray-light)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--blue)">${ing.label}</div>
        <div style="font-size:11px;color:var(--gray-mid)">${ing.sharedHint}</div>
      </div>
      <input type="number" inputmode="numeric" placeholder="0" value="${existing}" id="gen_${ing.key}"
        style="width:80px;padding:10px;border:1.5px solid var(--gray-light);border-radius:10px;font-size:14px;text-align:center;background:var(--gray-bg)">
      <span style="font-size:12px;color:var(--gray-mid)">${ing.unit}</span>
    </div>`;
  });
  GEN_DINNER_PROTEINS.forEach(ing => {
    const existing = stock[ing.key] || '';
    html += `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--gray-light)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--blue)">${ing.label}</div>
        <div style="font-size:11px;color:var(--gray-mid)">${getDinnerTypeName(ing.dinner)} (${ing.rawPerUnit}${ing.unit}/jantar)</div>
      </div>
      <input type="number" inputmode="numeric" placeholder="0" value="${existing}" id="gen_${ing.key}"
        style="width:80px;padding:10px;border:1.5px solid var(--gray-light);border-radius:10px;font-size:14px;text-align:center;background:var(--gray-bg)">
      <span style="font-size:12px;color:var(--gray-mid)">${ing.unit}</span>
    </div>`;
  });

  html += '<div style="font-size:12px;font-weight:700;color:var(--blue-mid);text-transform:uppercase;margin:14px 0 6px">Outros (Jantares)</div>';
  GEN_DINNER_OTHERS.forEach(ing => {
    const existing = stock[ing.key] || '';
    html += `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--gray-light)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--blue)">${ing.label}</div>
      </div>
      <input type="number" inputmode="numeric" placeholder="0" value="${existing}" id="gen_${ing.key}"
        style="width:80px;padding:10px;border:1.5px solid var(--gray-light);border-radius:10px;font-size:14px;text-align:center;background:var(--gray-bg)">
      <span style="font-size:12px;color:var(--gray-mid)">${ing.unit}</span>
    </div>`;
  });

  html += '<div style="font-size:12px;font-weight:700;color:var(--orange);text-transform:uppercase;margin:14px 0 6px">Café e Lanches</div>';
  GEN_SNACKS.forEach(ing => {
    const existing = stock[ing.key] || '';
    html += `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--gray-light)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--blue)">${ing.label}</div>
      </div>
      <input type="number" inputmode="numeric" placeholder="0" value="${existing}" id="gen_${ing.key}"
        style="width:80px;padding:10px;border:1.5px solid var(--gray-light);border-radius:10px;font-size:14px;text-align:center;background:var(--gray-bg)">
      <span style="font-size:12px;color:var(--gray-mid)">${ing.unit}</span>
    </div>`;
  });

  html += '<div style="font-size:12px;font-weight:700;color:var(--red);text-transform:uppercase;margin:14px 0 6px">Frutas (gramas)</div>';
  html += '<div style="font-size:11px;color:var(--gray-mid);margin-bottom:6px">Informe a quantidade em <b>gramas</b> de cada fruta. O sistema converte em porções automaticamente pela referência ao lado.</div>';
  GEN_FRUITS.forEach(ing => {
    const existing = stock[ing.key] || '';
    const porcoes = existing ? (existing / ing.gPerPorcao).toFixed(1).replace(/\.0$/, '') : '0';
    html += `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--gray-light)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--blue)">${ing.label}</div>
        <div style="font-size:11px;color:var(--gray-mid)">1 porção ≈ ${ing.gPerPorcao}g <span id="gen_por_${ing.key}" style="color:var(--green)">(${porcoes} porções)</span></div>
      </div>
      <input type="number" inputmode="numeric" placeholder="0" value="${existing}" id="gen_${ing.key}"
        oninput="updateFruitPorcoes('${ing.key}', ${ing.gPerPorcao})"
        style="width:80px;padding:10px;border:1.5px solid var(--gray-light);border-radius:10px;font-size:14px;text-align:center;background:var(--gray-bg)">
      <span style="font-size:12px;color:var(--gray-mid)">${ing.unit}</span>
    </div>`;
  });

  html += '<div id="gen-result" style="margin-top:14px"></div>';
  html += '<button class="save-btn" style="margin-top:14px" onclick="generateMenu()" id="gen-generate-btn">Gerar Cardápio</button>';
  html += '<button class="save-btn" style="margin-top:10px;background:var(--blue-mid)" onclick="applyGeneratedMenu()" id="gen-apply-btn" disabled>Salvar no Planejamento</button>';
  html += '<button class="reset-btn" style="margin-top:10px" onclick="clearHomeStock()">Limpar Estoque em Casa</button>';

  content.innerHTML = html;
  modal.classList.add('open');

  // Rola o card de volta ao início (sempre começa do topo ao abrir)
  const modalBox = content.closest('.modal');
  if (modalBox) modalBox.scrollTop = 0;

  // Se há resultados gerados na última sessão, re-renderiza (inclui rice warnings,
  // listas de Marmitas/Jantares gerados, sugestão de compra de frutas, etc.)
  if (draft && (draft.marmitaResult || draft.dinnerResult)) {
    const mr = draft.marmitaResult || { A:0, B:0, C:0, D:0, E:0, F:0 };
    const dr = draft.dinnerResult  || { O:0, T:0, C:0, A:0, S:0, W:0 };
    renderGeneratedMenu(stock, mr, dr);
  }
}

function updateFruitPorcoes(key, gPerPorcao) {
  const input = document.getElementById('gen_' + key);
  const display = document.getElementById('gen_por_' + key);
  if (!input || !display) return;
  const grams = parseFloat(input.value) || 0;
  const porcoes = grams / gPerPorcao;
  const rounded = porcoes.toFixed(1).replace(/\.0$/, '');
  display.textContent = `(${rounded} porções)`;
}

function readGenInputs() {
  const stock = {};
  const allLists = [GEN_PROTEINS, GEN_CARBS, GEN_DINNER_PROTEINS, GEN_SHARED_DINNER_PROTEINS, GEN_DINNER_OTHERS, GEN_SNACKS, GEN_FRUITS];
  allLists.forEach(list => {
    list.forEach(ing => {
      const el = document.getElementById('gen_' + ing.key);
      if (!el) return;
      const qty = parseFloat(el.value) || 0;
      if (qty > 0) stock[ing.key] = qty;
    });
  });
  return stock;
}

function generateMenu() {
  // Se nenhuma proteína foi inserida, mostra a mensagem de erro direto sem
  // passar pelo picker de modo.
  const stock = readGenInputs();
  const proteinLists = [GEN_PROTEINS, GEN_DINNER_PROTEINS, GEN_SHARED_DINNER_PROTEINS];
  const hasAnyProtein = proteinLists.some(list =>
    list.some(ing => (stock[ing.key] || 0) > 0)
  );
  if (!hasAnyProtein) {
    document.getElementById('gen-result').innerHTML =
      '<div style="background:var(--red-light);color:var(--red);border-radius:10px;padding:12px;font-size:13px;text-align:center">Insira quantidades de <b>proteínas</b> para gerar o cardápio</div>';
    document.getElementById('gen-apply-btn').disabled = true;
    setGenerateButtonState(false);
    // Limpa referências de resultado anterior
    window._genMarmitaResult = null;
    window._genDinnerResult = null;
    return;
  }
  // Com proteínas presentes, mostra o picker de modo (marmita / jantar / ambos)
  showModePicker();
}

function showModePicker() {
  const stock = readGenInputs();
  const shared = GEN_PROTEINS.filter(ing => ing.dinnerAlt && (stock[ing.key] || 0) > 0);

  let warning = '';
  if (shared.length > 0) {
    const list = shared.map(ing => {
      const mName = getMarmitaTypeName(ing.marmita);
      const dName = getDinnerTypeName(ing.dinnerAlt);
      return `<li style="margin:2px 0"><b>${ing.label}</b> <span style="color:var(--gray-mid)">(${mName} / ${dName})</span></li>`;
    }).join('');
    warning = `
      <div style="background:#fffbeb;border-left:3px solid var(--orange);border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:var(--gray)">
        <b style="color:var(--orange)">Ingrediente compartilhado:</b>
        <ul style="margin:4px 0 0 16px;padding:0">${list}</ul>
      </div>`;
  }

  const html = `
    <div style="background:var(--blue-bg);border:2px solid var(--blue-mid);border-radius:12px;padding:14px">
      <div style="font-size:14px;font-weight:700;color:var(--blue);margin-bottom:6px">O que você quer gerar?</div>
      <div style="font-size:12px;color:var(--gray-mid);margin-bottom:10px">
        Marque as opções desejadas. A escolha vale para <b>todos</b> os ingredientes — se marcar só Marmita, só marmitas serão sugeridas (mesmo que você tenha colocado ingredientes de jantar).
      </div>
      ${warning}
      <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;font-size:14px;cursor:pointer;background:#fff;border-radius:8px;margin-bottom:6px;border:1.5px solid var(--gray-light)">
        <input type="checkbox" id="share_marmita" style="width:18px;height:18px;accent-color:var(--green)">
        <span>Gerar Marmita</span>
      </label>
      <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;font-size:14px;cursor:pointer;background:#fff;border-radius:8px;border:1.5px solid var(--gray-light)">
        <input type="checkbox" id="share_dinner" style="width:18px;height:18px;accent-color:var(--purple)">
        <span>Gerar Jantar</span>
      </label>
      <div style="font-size:11px;color:var(--gray-mid);margin-top:8px;font-style:italic">Se marcar os dois e houver proteína compartilhada, a geração é sequencial e alternada (marmita, jantar, marmita, jantar...) enquanto houver ingrediente suficiente.</div>
      <button class="save-btn" style="margin-top:12px" onclick="confirmSharedAllocation()">Confirmar</button>
    </div>
  `;
  document.getElementById('gen-result').innerHTML = html;
  document.getElementById('gen-apply-btn').disabled = true;
}

function confirmSharedAllocation() {
  const useM = document.getElementById('share_marmita').checked;
  const useD = document.getElementById('share_dinner').checked;
  if (!useM && !useD) {
    alert('Selecione ao menos uma opção (Marmita ou Jantar).');
    return;
  }
  const mode = (useM && useD) ? 'both' : (useM ? 'marmita' : 'dinner');
  computeAndRenderMenu(mode);
}

function computeAndRenderMenu(mode) {
  const stock = readGenInputs();
  const result = computeMenuFromStock(stock, mode);
  renderGeneratedMenu(result.stock, result.marmitaResult, result.dinnerResult);
}

// Pure function: given a stock and a mode, returns { stock, marmitaResult, dinnerResult }.
// Isolated from DOM for testability. Regras:
//  - 'marmita' → ignora GEN_DINNER_PROTEINS; compartilhados (frango) viram marmita
//  - 'dinner'  → ignora GEN_PROTEINS não-compartilhadas; compartilhados viram jantar
//  - 'both'    → compartilhada usa sequencial alternado marmita/jantar
// Proteína é a restrição primária — carbos/queijos/pães/tortilla/goma ficam só no estoque.
function computeMenuFromStock(stock, mode) {
  const marmitaResult = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  const dinnerResult  = { O: 0, T: 0, C: 0, A: 0, S: 0, W: 0 };

  // Padrão 2:1:1 para jantares de frango: 2 Sanduíche → 1 Wrap → 1 Tapioca.
  // Wrap precisa de tortilla (≥2 un) e Tapioca precisa de goma de tapioca (≥50g).
  // Se o usuário não tiver esses itens, os slots correspondentes são pulados
  // automaticamente (efetivamente só gera Sanduíche, como antes).
  const FRANGO_DINNER_PATTERN = ['S', 'S', 'W', 'T'];
  const FRANGO_DINNER_SPECS = {
    S: { frango: 134, tortilla: 0, goma: 0 },
    W: { frango: 134, tortilla: 2, goma: 0 },
    T: { frango: 175, tortilla: 0, goma: 50 },
  };
  // Tenta produzir a próxima refeição de frango conforme o padrão. Se a posição
  // atual não puder ser feita, procura sequencialmente a próxima que caiba.
  function tryNextFrangoDinner(state) {
    for (let offset = 0; offset < FRANGO_DINNER_PATTERN.length; offset++) {
      const idx = (state.patternIdx + offset) % FRANGO_DINNER_PATTERN.length;
      const type = FRANGO_DINNER_PATTERN[idx];
      const spec = FRANGO_DINNER_SPECS[type];
      if (state.frango >= spec.frango && state.tortilla >= spec.tortilla && state.goma >= spec.goma) {
        state.frango   -= spec.frango;
        state.tortilla -= spec.tortilla;
        state.goma     -= spec.goma;
        state.patternIdx = (idx + 1) % FRANGO_DINNER_PATTERN.length;
        dinnerResult[type] += 1;
        return type;
      }
    }
    return null;
  }

  // Proteínas de marmita (com possível alocação compartilhada)
  GEN_PROTEINS.forEach(ing => {
    const qty = stock[ing.key] || 0;
    if (qty <= 0) return;
    if (ing.dinnerAlt) {
      // Ingrediente compartilhado (ex.: frango) — pode virar marmita ou jantar
      if (mode === 'marmita') {
        marmitaResult[ing.marmita] += Math.floor(qty / ing.rawPerUnit);
      } else if (mode === 'dinner') {
        // Gera jantares seguindo o padrão 2:1:1 de Sanduíche/Wrap/Tapioca
        const frangoState = {
          frango: qty,
          tortilla: stock.tortilla || 0,
          goma: stock.goma_tapioca || 0,
          patternIdx: 0,
        };
        while (tryNextFrangoDinner(frangoState) !== null) {}
      } else {
        // 'both' — sequencial alternado: marmita -> jantar -> marmita -> jantar ...
        // Cada slot de jantar segue o padrão 2:1:1 via tryNextFrangoDinner.
        // Se um lado não couber, tenta o outro. Se nenhum cabe, para.
        const frangoState = {
          frango: qty,
          tortilla: stock.tortilla || 0,
          goma: stock.goma_tapioca || 0,
          patternIdx: 0,
        };
        let preferM = true;
        for (let i = 0; i < 500; i++) {
          let acted = false;
          if (preferM) {
            if (frangoState.frango >= ing.rawPerUnit) {
              marmitaResult[ing.marmita] += 1;
              frangoState.frango -= ing.rawPerUnit;
              acted = true;
            } else if (tryNextFrangoDinner(frangoState) !== null) {
              acted = true;
            }
          } else {
            if (tryNextFrangoDinner(frangoState) !== null) {
              acted = true;
            } else if (frangoState.frango >= ing.rawPerUnit) {
              marmitaResult[ing.marmita] += 1;
              frangoState.frango -= ing.rawPerUnit;
              acted = true;
            }
          }
          if (!acted) break;
          preferM = !preferM;
        }
      }
    } else {
      // Proteína exclusiva de marmita — só conta se o modo permitir
      if (mode === 'marmita' || mode === 'both') {
        marmitaResult[ing.marmita] += Math.floor(qty / ing.rawPerUnit);
      }
    }
  });

  // Proteínas de jantar (exclusivas) — só contam se o modo permitir
  if (mode === 'dinner' || mode === 'both') {
    // Jantares que NÃO dependem de ovos: processa normalmente (ex.: alcatra → C).
    // Os jantares com ovos (Omelete O e Torrada de Atum com Ovos A) são
    // tratados em um laço sequencial separado logo abaixo.
    GEN_DINNER_PROTEINS.forEach(ing => {
      if (ing.dinner === 'O' || ing.dinner === 'A') return;
      const qty = stock[ing.key] || 0;
      if (qty <= 0) return;
      dinnerResult[ing.dinner] += Math.floor(qty / ing.rawPerUnit);
    });

    // Sequencial ovos: padrão 2:1 → 2 Omeletes, depois 1 Torrada de Atum com Ovos
    // (condicional ao estoque de atum). Repete enquanto houver ovos para omelete.
    // Peru NÃO é restrição para omelete — a lista de compras refletirá a necessidade
    // de peru se o omelete for aplicado ao planejamento sem peru em estoque.
    // Ao esgotar os ovos, se ainda sobrar atum, gera mais Torradas delegando a
    // compra de ovos adicionais para a lista de compras.
    let eggs      = stock.ovos || 0;
    let atumStock = stock.atum_lata || 0;
    const OVO_O = 3;                // Omelete Reforçada
    const OVO_A = 2, LATA_A = 1;    // Torrada de Atum com Ovos

    let step = 0; // 0 e 1 → tentativa de omelete; 2 → tentativa de torrada
    for (let i = 0; i < 500; i++) {
      if (step < 2) {
        // Tenta fazer 1 omelete
        if (eggs >= OVO_O) {
          dinnerResult.O += 1;
          eggs -= OVO_O;
          step++;
        } else {
          break; // ovos insuficientes → termina loop principal
        }
      } else {
        // Tenta fazer 1 torrada (após 2 omeletes)
        if (atumStock >= LATA_A && eggs >= OVO_A) {
          dinnerResult.A += 1;
          eggs      -= OVO_A;
          atumStock -= LATA_A;
        }
        // Reinicia o ciclo independente do resultado da torrada
        step = 0;
      }
    }

    // Se sobraram 2 ovos (não dava pra mais um omelete) e ainda há atum,
    // aproveita pra gerar uma última Torrada consumindo os ovos remanescentes.
    while (atumStock >= LATA_A && eggs >= OVO_A) {
      dinnerResult.A += 1;
      eggs      -= OVO_A;
      atumStock -= LATA_A;
    }

    // Se ainda sobra atum no estoque, continua gerando Torradas SEM restrição
    // de ovos. A lista de compras vai detectar a necessidade de comprar os ovos
    // adicionais automaticamente (ovosNeeded = 56 + 3*dO + 2*dA).
    while (atumStock >= LATA_A) {
      dinnerResult.A += 1;
      atumStock -= LATA_A;
    }
  }

  return { stock, marmitaResult, dinnerResult };
}

function renderGeneratedMenu(stock, marmitaResult, dinnerResult) {
  let totalMarmitas = 0, totalDinners = 0;
  let html = '';

  // Rice substitution warning (perfect substitutability between branco and integral)
  const hasWhite = (stock.arroz_branco || 0) > 0;
  const hasIntegral = (stock.arroz_integral || 0) > 0;
  const marmitasNeedingWhite = [];
  const marmitasNeedingIntegral = [];
  Object.keys(marmitaResult).forEach(id => {
    if ((marmitaResult[id] || 0) <= 0) return;
    const m = MARMITA_DEFS.find(x => x.id === id);
    if (!m) return;
    if (m.ingredients.arroz_branco) marmitasNeedingWhite.push(getMarmitaTypeName(id));
    if (m.ingredients.arroz_integral) marmitasNeedingIntegral.push(getMarmitaTypeName(id));
  });
  let riceWarning = '';
  if (hasWhite && !hasIntegral && marmitasNeedingIntegral.length > 0) {
    riceWarning = `Considerando <b>arroz branco</b> no lugar de integral em: ${marmitasNeedingIntegral.join(', ')}.`;
  } else if (hasIntegral && !hasWhite && marmitasNeedingWhite.length > 0) {
    riceWarning = `Considerando <b>arroz integral</b> no lugar de branco em: ${marmitasNeedingWhite.join(', ')}.`;
  }
  if (riceWarning) {
    html += `<div style="background:#fffbeb;border:1.5px solid var(--orange);border-radius:10px;padding:10px 12px;margin-bottom:8px;font-size:12px;color:var(--gray)">
      <b style="color:var(--orange)">Aviso sobre arroz:</b> ${riceWarning}
    </div>`;
  }

  // Marmitas section
  let marmitaRows = '';
  Object.keys(marmitaResult).forEach(id => {
    const units = marmitaResult[id] || 0;
    if (units <= 0) return;
    totalMarmitas += units;
    const typeName = getMarmitaTypeName(id);
    marmitaRows += `<div style="font-size:13px;padding:4px 0">
      <b style="color:var(--blue)">${typeName}</b>: <b>${units}</b> un
    </div>`;
  });
  if (marmitaRows) {
    html += `<div style="background:var(--green-bg);border-radius:10px;padding:12px;margin-bottom:8px">
      <b style="color:var(--green);font-size:13px">Marmitas Geradas:</b>
      <div style="margin-top:8px">${marmitaRows}</div>
      <div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--green);font-size:12px;font-weight:700;color:var(--green)">Total: ${totalMarmitas} marmitas (${totalMarmitas / 2} dias)</div>
    </div>`;
  }

  // Dinners section
  let dinnerRows = '';
  Object.keys(dinnerResult).forEach(id => {
    const units = dinnerResult[id] || 0;
    if (units <= 0) return;
    totalDinners += units;
    const typeName = getDinnerTypeName(id);
    dinnerRows += `<div style="font-size:13px;padding:4px 0">
      <b style="color:var(--blue)">${typeName}</b>: <b>${units}</b> un
    </div>`;
  });
  if (dinnerRows) {
    html += `<div style="background:var(--purple-light);border-radius:10px;padding:12px">
      <b style="color:var(--purple);font-size:13px">Jantares Gerados:</b>
      <div style="margin-top:8px">${dinnerRows}</div>
      <div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--purple);font-size:12px;font-weight:700;color:var(--purple)">Total: ${totalDinners} jantares (${totalDinners / 2} dias)</div>
    </div>`;
  }

  if (totalMarmitas === 0 && totalDinners === 0) {
    html = '<div style="background:var(--red-light);color:var(--red);border-radius:10px;padding:12px;font-size:13px;text-align:center">Insira quantidades de <b>proteínas</b> para gerar o cardápio</div>';
    document.getElementById('gen-apply-btn').disabled = true;
    setGenerateButtonState(false);
  } else {
    document.getElementById('gen-apply-btn').disabled = false;
    setGenerateButtonState(true);
  }

  document.getElementById('gen-result').innerHTML = html;
  window._genStock = stock;
  window._genMarmitaResult = marmitaResult;
  window._genDinnerResult = dinnerResult;

  // Persiste o draft pra sobreviver a close/reopen do modal
  saveGenDraft();
}

// Flip the "Gerar Cardápio" button to "Atualizar Cardápio" with a softer green theme
// once results are generated. Calling with `false` resets to the initial state.
function setGenerateButtonState(generated) {
  const btn = document.getElementById('gen-generate-btn');
  if (!btn) return;
  if (generated) {
    btn.textContent = 'Atualizar Cardápio';
    btn.style.background = 'var(--green-bg)';
    btn.style.color = 'var(--green)';
    btn.style.border = '2px solid var(--green)';
    btn.style.padding = '12px';
  } else {
    btn.textContent = 'Gerar Cardápio';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.border = '';
    btn.style.padding = '';
  }
}

async function applyGeneratedMenu() {
  if (!window._genMarmitaResult && !window._genDinnerResult) return;
  if (!await customConfirm(
    'O Gerador de Cardápio é apenas uma sugestão. Confira a seleção antes de aplicar — você pode ajustar quantidades manualmente na aba Marmitas depois.\n\nO planejamento de marmitas e jantares será substituído pelas quantidades calculadas, e as quantidades informadas serão salvas como "estoque em casa".',
    { title: 'Aplicar cardápio gerado?', okLabel: 'Aplicar' }
  )) return;

  const newMarmitaPlan = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  Object.assign(newMarmitaPlan, window._genMarmitaResult || {});
  localStorage.setItem(STORAGE_KEYS.marmitaPlan, JSON.stringify(newMarmitaPlan));

  const newDinnerPlan = { O: 0, T: 0, C: 0, A: 0, S: 0, W: 0 };
  Object.assign(newDinnerPlan, window._genDinnerResult || {});
  localStorage.setItem(STORAGE_KEYS.dinnerPlan, JSON.stringify(newDinnerPlan));

  localStorage.setItem(STORAGE_KEYS.homeStock, JSON.stringify(window._genStock || {}));
  clearGenDraft();

  renderMarmitaPlanner();
  renderDinnerPlanner();
  onPlanChange();

  // Fecha sem disparar saveGenDraft (já limpamos o draft acima)
  document.getElementById('history-modal').classList.remove('open');
}

async function clearHomeStock() {
  if (!await customConfirm(
    'A lista de compras voltará a considerar que você não tem nenhum ingrediente guardado.',
    { title: 'Limpar o estoque em casa?', okLabel: 'Limpar', danger: true }
  )) return;
  localStorage.removeItem(STORAGE_KEYS.homeStock);
  clearGenDraft();
  renderShoppingList();
  // Reabre o gerador do zero (com estoque limpo) em vez de fechar o modal,
  // pro usuário poder preencher novamente na sequência se quiser.
  openMenuGenerator();
}

function openDayEditor(dateStr) {
  const parts = dateStr.split('-');
  const dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;

  const cal = JSON.parse(localStorage.getItem(STORAGE_KEYS.calLog) || '{}');
  const entry = cal[dateStr] || {};
  const consumed = getConsumed();
  const dayMarmitas = consumed[dateStr];
  const currentSelections = Array.isArray(dayMarmitas) ? [...dayMarmitas] : (dayMarmitas ? [dayMarmitas, dayMarmitas] : []);
  const currentTreino = entry.forca || '';

  // Check if date is in current week (for stock control)
  window._editorDateStr = dateStr;
  window._editorIsCurrentWeek = isDateInCurrentWeek(dateStr);

  const modal = document.getElementById('history-modal');
  const content = document.getElementById('history-content');
  document.getElementById('history-title').textContent = 'Editar - ' + dateDisplay;

  let html = '';

  // Treino selector
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:13px;font-weight:700;color:var(--blue);margin-bottom:8px">Treino Realizado</div>';
  ['', 'A', 'B', 'F'].forEach(t => {
    const label = t === '' ? 'Nenhum' : t === 'F' ? 'Funcional' : 'Treino ' + t;
    const checked = currentTreino === t ? 'checked' : '';
    html += `<label style="display:flex;align-items:center;gap:8px;padding:8px 0;font-size:14px;cursor:pointer;border-bottom:1px solid var(--gray-light)">
      <input type="radio" name="edit_treino" value="${t}" ${checked} style="width:18px;height:18px;accent-color:var(--blue-mid)"> ${label}
    </label>`;
  });
  html += '</div>';

  // Marmitas selector
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:8px">Marmitas Consumidas</div>';
  if (window._editorIsCurrentWeek) {
    html += '<div style="font-size:11px;color:var(--gray-mid);margin-bottom:6px">Estoque da semana atual será atualizado</div>';
  }
  html += '<div id="editor-marmita-list"></div>';
  html += '<div id="editor-add-btn-container"></div>';
  html += '</div>';

  html += `<button class="save-btn" onclick="saveDayEditor('${dateStr}')">Confirmar</button>`;

  content.innerHTML = html;
  modal.classList.add('open');

  window._editorMarmitas = currentSelections;
  renderEditorMarmitas();
}

function renderEditorMarmitas() {
  const container = document.getElementById('editor-marmita-list');
  const addBtnContainer = document.getElementById('editor-add-btn-container');
  if (!container) return;
  const sels = window._editorMarmitas || [];

  // Calculate available stock if current week
  let stock = null;
  if (window._editorIsCurrentWeek) {
    stock = getEditorStock(window._editorDateStr);
    // Subtract what's currently selected in the editor
    sels.forEach(t => { if (stock[t] !== undefined) stock[t]--; });
  }

  if (sels.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--gray-mid);font-size:13px;padding:6px 0">Nenhuma marmita</div>';
  } else {
    let html = '';
    sels.forEach((type, i) => {
      // Build options: if current week, only show types with stock (or the currently selected type)
      const options = MARMITA_DEFS.map(m => {
        const available = !stock || stock[m.id] > 0 || m.id === type;
        return `<option value="${m.id}" ${m.id===type?'selected':''} ${!available?'disabled':''}>${m.id} - ${m.name.split(' - ')[1]}${stock && m.id !== type ? ` (${Math.max(0,stock[m.id])} rest.)` : ''}</option>`;
      }).join('');
      html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray-light)">
        <select onchange="editorChangeMarmita(${i},this.value)" style="flex:1;padding:8px;border:1.5px solid var(--gray-light);border-radius:8px;font-size:13px">
          ${options}
        </select>
        <button class="cardio-rm" onclick="window._editorMarmitas.splice(${i},1);renderEditorMarmitas()" aria-label="Remover marmita">&#10005;</button>
      </div>`;
    });
    container.innerHTML = html;
  }

  // Show/hide add button based on stock
  if (addBtnContainer) {
    if (stock) {
      const anyAvailable = MARMITA_DEFS.some(m => stock[m.id] > 0);
      if (anyAvailable) {
        addBtnContainer.innerHTML = `<button class="add-cardio-btn" style="margin-top:6px" onclick="editorAddMarmita()">+ Adicionar Marmita</button>`;
      } else {
        addBtnContainer.innerHTML = '<div style="text-align:center;font-size:12px;color:var(--red);margin-top:6px">Estoque esgotado para esta semana</div>';
      }
    } else {
      addBtnContainer.innerHTML = `<button class="add-cardio-btn" style="margin-top:6px" onclick="editorAddMarmita()">+ Adicionar Marmita</button>`;
    }
  }
}

function editorChangeMarmita(i, newVal) {
  window._editorMarmitas[i] = newVal;
  renderEditorMarmitas();
}

function editorAddMarmita() {
  if (!window._editorMarmitas) window._editorMarmitas = [];
  // If current week, find first type with stock
  if (window._editorIsCurrentWeek) {
    const stock = getEditorStock(window._editorDateStr);
    window._editorMarmitas.forEach(t => { if (stock[t] !== undefined) stock[t]--; });
    const available = MARMITA_DEFS.find(m => stock[m.id] > 0);
    if (!available) return;
    window._editorMarmitas.push(available.id);
  } else {
    window._editorMarmitas.push('A');
  }
  renderEditorMarmitas();
}

function saveDayEditor(dateStr) {
  // Save treino
  const treinoVal = document.querySelector('input[name="edit_treino"]:checked');
  const treino = treinoVal ? treinoVal.value : '';

  const cal = JSON.parse(localStorage.getItem(STORAGE_KEYS.calLog) || '{}');
  if (!cal[dateStr]) cal[dateStr] = {};
  if (treino) {
    cal[dateStr].forca = treino;
  } else {
    delete cal[dateStr].forca;
  }
  localStorage.setItem(STORAGE_KEYS.calLog, JSON.stringify(cal));

  // Save marmitas
  const consumed = getConsumed();
  const marmitas = window._editorMarmitas || [];
  if (marmitas.length > 0) {
    consumed[dateStr] = marmitas;
  } else {
    delete consumed[dateStr];
  }
  localStorage.setItem(STORAGE_KEYS.marmitaConsumed, JSON.stringify(consumed));

  // Close modal, refresh
  closeHistory();
  renderCalendar();
  renderStockCard();
  renderMarmitaSelector();
  renderDinnerSelector();
  showDayDetail(dateStr);
}

// ============================================================
// RESET ALL DATA
// ============================================================
async function resetAllData() {
  if (!await customConfirm(
    'Isso vai apagar TODAS as informações do app:\n\n• Planejamento de marmitas\n• Planejamento de jantares\n• Histórico de semanas\n• Lista de compras\n• Checklist de preparo\n• Treinos e cardio registrados\n• Calendário (agenda)\n• Refeições marcadas\n• Consumo de marmitas\n\nEsta ação NÃO pode ser desfeita.',
    { title: 'ATENÇÃO — Resetar tudo?', okLabel: 'Resetar', danger: true }
  )) return;
  if (!await customConfirm(
    'Todos os dados serão apagados permanentemente.\n\nDeseja continuar mesmo assim?',
    { title: 'Última confirmação', okLabel: 'Sim, apagar', danger: true }
  )) return;

  // Clear all sync keys
  SYNC_KEYS.forEach(k => localStorage.removeItem(k));

  // Clear meals_ daily keys
  Object.keys(localStorage).filter(k => k.startsWith('meals_')).forEach(k => localStorage.removeItem(k));

  // Clear cardio_ daily keys
  Object.keys(localStorage).filter(k => k.startsWith('cardio_')).forEach(k => localStorage.removeItem(k));

  // Clear other misc keys
  localStorage.removeItem(STORAGE_KEYS.sundayPromptDate);

  // If logged in, also clear Firestore
  if (currentUser) {
    db.collection('users').doc(currentUser.uid).collection('data').get()
      .then(snapshot => {
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
      })
      .catch(() => {});
  }

  alert('Todos os dados foram apagados com sucesso.');
  location.reload();
}

// ============================================================
// CLEAR TODAY WORKOUT
// ============================================================
async function clearTodayWorkout() {
  if (!await customConfirm(
    'Os pesos, repetições e cardio registrados hoje serão apagados.\n\nEsta ação não pode ser desfeita.',
    { title: 'Limpar treino de hoje?', okLabel: 'Limpar', danger: true }
  )) return;

  // Clear saved workout data for current week (both A and B)
  const allW = JSON.parse(localStorage.getItem(STORAGE_KEYS.workouts) || '{}');
  ['A','B'].forEach(t => {
    delete allW[t + '_w' + currentWeek];
    if (allW._meta) delete allW._meta[t + '_w' + currentWeek];
  });
  localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(allW));

  // Clear checks and re-render with empty fields
  exerciseChecks = {};
  if (currentWorkout !== 'F') {
    // Render with empty data
    const container = document.getElementById('exercises-container');
    const exercises = WORKOUTS[currentWorkout];
    let html = '';
    exercises.forEach((ex, ei) => {
      const isPlank = ex.reps.includes('s');
      html += `<div class="exercise-card" id="excard_${ei}">
        <div class="ex-header">
          <div class="ex-header-info">
            <div class="ex-name">${ex.name}</div>
            <div class="ex-target">Meta: ${ex.sets} x ${ex.reps} | ${ex.muscles}</div>
          </div>
          <div class="ex-check" onclick="toggleExCheck(${ei})">&#10003;</div>
        </div>
        <div class="sets-grid">
          <div class="hdr"></div><div class="hdr">Peso (kg)</div><div class="hdr">${isPlank ? 'Seg' : 'Reps'}</div>`;
      for (let s = 0; s < ex.sets; s++) {
        const kgId = `w_${ei}_${s}_kg`;
        const repId = `w_${ei}_${s}_reps`;
        html += `<div class="set-label">S${s+1}</div>
          <div class="input-stepper">
            <button class="step-btn minus" onclick="stepVal('${kgId}',-1)" aria-label="Diminuir peso">-</button>
            <input type="number" inputmode="decimal" placeholder="kg" id="${kgId}" value="">
            <button class="step-btn plus" onclick="stepVal('${kgId}',1)" aria-label="Aumentar peso">+</button>
          </div>
          <div class="input-stepper">
            <button class="step-btn minus" onclick="stepVal('${repId}',-1)" aria-label="Diminuir repetições">-</button>
            <input type="number" inputmode="numeric" placeholder="${isPlank ? 'seg' : 'reps'}" id="${repId}" value="">
            <button class="step-btn plus" onclick="stepVal('${repId}',1)" aria-label="Aumentar repetições">+</button>
          </div>`;
      }
      html += '</div></div>';
    });
    container.innerHTML = html;
  }

  // Clear today's cardio
  cardioEntries = [];
  const allC = JSON.parse(localStorage.getItem(STORAGE_KEYS.cardioLog) || '{}');
  delete allC[getTodayCardioKey()];
  localStorage.setItem(STORAGE_KEYS.cardioLog, JSON.stringify(allC));
  renderCardioEntries();

  // Remove today from calendar
  const cal = JSON.parse(localStorage.getItem(STORAGE_KEYS.calLog) || '{}');
  const today = localDateStr();
  delete cal[today];
  localStorage.setItem(STORAGE_KEYS.calLog, JSON.stringify(cal));
}

// ============================================================
// FIREBASE + DATA SYNC LAYER
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyACq68zH7MIkCnWUG_qXhZdqjgy-zdnsuk",
  authDomain: "peitudasnow.firebaseapp.com",
  projectId: "peitudasnow",
  storageBucket: "peitudasnow.firebasestorage.app",
  messagingSenderId: "890572333630",
  appId: "1:890572333630:web:6a6e3baf5e48ed73b1276f"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
db.enablePersistence().catch(() => {});

let currentUser = null;
let firestoreUnsubscribes = [];

// SYNC_KEYS is defined in data.js (derived from STORAGE_KEYS).

// Save to localStorage AND Firestore (if logged in)
function saveData(key, value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  localStorage.setItem(key, str);
  if (currentUser) {
    db.collection('users').doc(currentUser.uid).collection('data').doc(key)
      .set({ value: str, updated: firebase.firestore.FieldValue.serverTimestamp() })
      .catch(() => {});
  }
}

// Load from localStorage (Firestore syncs in background)
function loadData(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); } catch(e) { return raw; }
}

// Override localStorage.setItem for sync keys to auto-sync
const _origSetItem = localStorage.setItem.bind(localStorage);
const _origRemoveItem = localStorage.removeItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  _origSetItem(key, value);
  if (currentUser && SYNC_KEYS.includes(key)) {
    db.collection('users').doc(currentUser.uid).collection('data').doc(key)
      .set({ value: value, updated: firebase.firestore.FieldValue.serverTimestamp() })
      .catch(() => {});
  }
};
localStorage.removeItem = function(key) {
  _origRemoveItem(key);
  if (currentUser && SYNC_KEYS.includes(key)) {
    db.collection('users').doc(currentUser.uid).collection('data').doc(key)
      .delete().catch(() => {});
  }
};

// Sync: listen for Firestore changes and update localStorage
function startFirestoreSync() {
  stopFirestoreSync();
  if (!currentUser) return;
  let isInitialSnapshot = true;
  const unsub = db.collection('users').doc(currentUser.uid).collection('data')
    .onSnapshot(snapshot => {
      if (isInitialSnapshot) {
        isInitialSnapshot = false;
        // On initial load: merge - prefer LOCAL over Firestore (local is source of truth)
        // Only pull from Firestore for keys that don't exist locally
        snapshot.forEach(doc => {
          const key = doc.id;
          if (localStorage.getItem(key) === null) {
            // Local doesn't have this, pull from Firestore
            const val = doc.data().value;
            if (val !== undefined) _origSetItem(key, val);
          }
        });
        // Upload all local data back to Firestore to ensure it has the latest
        uploadLocalToFirestore();
        initApp();
        return;
      }
      // Subsequent real-time changes: accept from Firestore (other device edited)
      let hasChanges = false;
      snapshot.docChanges().forEach(change => {
        const key = change.doc.id;
        if (change.type === 'removed') {
          if (localStorage.getItem(key) !== null) {
            _origRemoveItem(key);
            hasChanges = true;
          }
        } else {
          const val = change.doc.data().value;
          const currentVal = localStorage.getItem(key);
          if (val !== undefined && val !== currentVal) {
            _origSetItem(key, val);
            hasChanges = true;
          }
        }
      });
      if (hasChanges) initApp();
    }, () => {});
  firestoreUnsubscribes.push(unsub);
}

function stopFirestoreSync() {
  firestoreUnsubscribes.forEach(fn => fn());
  firestoreUnsubscribes = [];
}

// Upload all local data to Firestore (first login)
function uploadLocalToFirestore() {
  if (!currentUser) return;
  const batch = db.batch();
  const userRef = db.collection('users').doc(currentUser.uid).collection('data');
  SYNC_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      batch.set(userRef.doc(key), { value: val, updated: firebase.firestore.FieldValue.serverTimestamp() });
    }
  });
  // Also sync meals_ keys
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('meals_')) {
      batch.set(userRef.doc(key), { value: localStorage.getItem(key), updated: firebase.firestore.FieldValue.serverTimestamp() });
    }
  });
  batch.commit().catch(() => {});
}

// Auth functions
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => {
    // Fallback for mobile: use redirect
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
      auth.signInWithRedirect(provider);
    } else {
      alert('Erro ao fazer login: ' + err.message);
    }
  });
}

function skipLogin() {
  localStorage.setItem(STORAGE_KEYS.skipLogin, '1');
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  initApp();
}

async function logout() {
  if (!await customConfirm('Seus dados continuam salvos.', { title: 'Sair da conta?', okLabel: 'Sair' })) return;
  stopFirestoreSync();
  currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.skipLogin);
  auth.signOut().then(() => {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
  });
}

// Auth state listener
auth.onAuthStateChanged(user => {
  currentUser = user;
  const authScreen = document.getElementById('auth-screen');
  const appContainer = document.getElementById('app-container');

  if (user) {
    authScreen.style.display = 'none';
    appContainer.style.display = 'block';

    // Render immediately with local data
    initApp();

    // Start Firestore sync (it handles upload/merge internally)
    startFirestoreSync();
  } else {
    // Check if was previously logged in
    if (localStorage.getItem(STORAGE_KEYS.skipLogin)) {
      authScreen.style.display = 'none';
      appContainer.style.display = 'block';
      initApp();
    }
  }
});

// ============================================================
// USER PROFILE (onboarding)
// ============================================================
// Reset profile via URL: ?reset=profile  (clears localStorage + Firestore + reloads)
function resetUserProfile() {
  localStorage.removeItem(STORAGE_KEYS.userProfile);
  if (currentUser) {
    db.collection('users').doc(currentUser.uid).collection('data').doc(STORAGE_KEYS.userProfile)
      .delete().catch(() => {});
  }
}

(function handleProfileResetURL() {
  if (location.search.indexOf('reset=profile') !== -1) {
    // Wait for Firebase auth to settle so we can also delete from Firestore
    setTimeout(() => {
      resetUserProfile();
      // Strip the query string and reload
      const cleanUrl = location.pathname + location.hash;
      history.replaceState(null, '', cleanUrl);
      setTimeout(() => location.reload(), 400);
    }, 800);
  }
})();

function getUserProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.userProfile) || 'null'); }
  catch (e) { return null; }
}

function saveUserProfile(profile) {
  // Use saveData so it propagates to Firestore (when SYNC_KEYS includes STORAGE_KEYS.userProfile)
  saveData(STORAGE_KEYS.userProfile, profile);
}

function showOnboardingIfNeeded() {
  const modal = document.getElementById('onboarding-modal');
  if (!modal) return;
  if (getUserProfile()) {
    // Already has profile — make sure modal is hidden (handles late Firestore sync)
    modal.classList.remove('open');
    return;
  }
  // No profile yet — show modal
  modal.classList.add('open');
}

function renderUserBar() {
  const userBar = document.getElementById('user-bar');
  if (!userBar) return;
  // Show bar if logged in OR skip-login mode AND has profile
  const profile = getUserProfile();
  const shouldShow = !!currentUser || !!profile;
  if (!shouldShow) {
    document.body.classList.remove('logged-in');
    userBar.style.display = 'none';
    return;
  }
  document.body.classList.add('logged-in');
  userBar.style.display = 'flex';

  // v2.1.0: layout compacto com avatar + 2 linhas + botões de ícone
  const fmt = n => (n != null ? n.toString().replace('.', ',') : '');
  let avatarLetter = '?';
  let line1 = '';
  let line2 = '';
  if (profile) {
    const nome = (profile.nome || '').trim();
    const sobrenome = (profile.sobrenome || '').trim();
    avatarLetter = (nome[0] || sobrenome[0] || '?').toUpperCase();
    const idade = calculateAge(profile.data_nascimento);
    line1 = [nome, sobrenome].filter(Boolean).join(' ') || (currentUser ? currentUser.displayName : '');
    const bits = [];
    if (idade != null) bits.push(`${idade}a`);
    if (profile.peso_atual && profile.meta_peso) {
      bits.push(`${fmt(profile.peso_atual)} → ${fmt(profile.meta_peso)} kg`);
    } else if (profile.peso_atual) {
      bits.push(`${fmt(profile.peso_atual)} kg`);
    }
    line2 = bits.join(' · ');
  } else if (currentUser) {
    const display = currentUser.displayName || currentUser.email || '';
    avatarLetter = (display[0] || '?').toUpperCase();
    line1 = display;
  }

  // v2.1.26: se logado com Google e tem photoURL, usa a foto. Senão letra.
  // onerror cai no fallback letra (caso o link da foto quebre).
  const photoURL = currentUser && currentUser.photoURL;
  const avatarHtml = photoURL
    ? `<img src="${photoURL}" alt="${avatarLetter}" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='${avatarLetter}'">`
    : avatarLetter;

  // v2.1.2: clicar no avatar/info abre o profile-view modal (bottom-sheet).
  // O botão "Sair" fica isolado e usa stopPropagation pra não disparar o view.
  const clickableOpen = profile ? 'onclick="openProfileView()"' : '';
  userBar.innerHTML = `
    <div class="user-bar-main" ${clickableOpen}>
      <div class="user-avatar">${avatarHtml}</div>
      <div class="user-info">
        <span class="line1">${line1}</span>
        ${line2 ? `<span class="line2">${line2}</span>` : ''}
      </div>
    </div>
    <div class="user-actions">
      <button class="logout-btn" onclick="event.stopPropagation();logout()" aria-label="Sair">${glyph('log-out', 16)}</button>
    </div>`;
}

// v2.1.2: Bottom-sheet modal que mostra todas as infos do perfil de forma
// legível, com as mesmas formatações usadas no cálculo interno.
function openProfileView() {
  const profile = getUserProfile();
  if (!profile) return;
  const el = document.getElementById('profile-view-content');
  if (!el) return;

  const fmt = n => (n != null ? String(n).replace('.', ',') : '—');
  const idade = calculateAge(profile.data_nascimento);
  const sexoMap = { M: 'Masculino', F: 'Feminino', O: 'Outro / Prefiro não dizer' };
  const atividadeMap = {
    sentado:  'Sedentário (×1,2)',
    leve:     'Levemente ativo — 1-3x/sem (×1,375)',
    rotina:   'Moderadamente ativo — 3-5x/sem (×1,55)',
    intenso:  'Muito ativo — 6-7x/sem (×1,725)',
    atleta:   'Extra ativo — trabalho físico + treino diário (×1,9)',
  };
  const intensityMap = {
    suave:     'Suave — 15% do TDEE',
    moderado:  'Moderado — 20% do TDEE',
    agressivo: 'Agressivo — 30% do TDEE',
    extremo:   'Extremo — 40% do TDEE',
    lento:     'Lento — 10% do TDEE',
  };

  // Pra resolver chaves legadas de atividade (v1 → v2.0.7)
  const atividadeKey = (typeof resolveActivityKey === 'function'
    ? resolveActivityKey(profile.nivel_atividade)
    : profile.nivel_atividade) || profile.nivel_atividade;
  const atividadeLabel = atividadeMap[atividadeKey] || profile.nivel_atividade || '—';

  // Direção atual + intensidade aplicável (só uma aparece, lógica igual ao edit profile)
  const dir = getGoalDirection(profile);
  let intensityLine = '';
  if (dir === 'loss' && profile.deficit_intensity) {
    intensityLine = `
      <div class="pv-row">
        <span class="pv-label">Intensidade do déficit</span>
        <span class="pv-value">${intensityMap[profile.deficit_intensity] || profile.deficit_intensity}</span>
      </div>`;
  } else if (dir === 'gain' && profile.surplus_intensity) {
    intensityLine = `
      <div class="pv-row">
        <span class="pv-label">Intensidade do superávit</span>
        <span class="pv-value">${intensityMap[profile.surplus_intensity] || profile.surplus_intensity}</span>
      </div>`;
  } else if (dir === 'maintain') {
    intensityLine = `
      <div class="pv-row">
        <span class="pv-label">Direção</span>
        <span class="pv-value">Manutenção (meta ≈ peso atual)</span>
      </div>`;
  }

  const bfLine = profile.body_fat_pct != null
    ? `<div class="pv-row">
         <span class="pv-label">Gordura corporal</span>
         <span class="pv-value">${fmt(profile.body_fat_pct)}%</span>
       </div>`
    : '';

  // Data de criação do perfil em formato legível
  let criadoTxt = '';
  if (profile.criado_em) {
    try {
      const d = new Date(profile.criado_em);
      criadoTxt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { criadoTxt = profile.criado_em.slice(0, 10); }
  }

  el.innerHTML = `
    <div class="pv-section">
      <h3>Identificação</h3>
      <div class="pv-row"><span class="pv-label">Nome</span><span class="pv-value">${(profile.nome || '') + ' ' + (profile.sobrenome || '')}</span></div>
      <div class="pv-row"><span class="pv-label">Sexo</span><span class="pv-value">${sexoMap[profile.sexo] || '—'}</span></div>
      <div class="pv-row"><span class="pv-label">Idade</span><span class="pv-value">${idade != null ? idade + ' anos' : '—'}</span></div>
      <div class="pv-row"><span class="pv-label">Nascimento</span><span class="pv-value">${profile.data_nascimento ? profile.data_nascimento.split('-').reverse().join('/') : '—'}</span></div>
    </div>

    <div class="pv-section">
      <h3>Composição corporal</h3>
      <div class="pv-row"><span class="pv-label">Peso atual</span><span class="pv-value">${fmt(profile.peso_atual)} kg</span></div>
      <div class="pv-row"><span class="pv-label">Altura</span><span class="pv-value">${fmt(profile.altura_cm)} cm</span></div>
      ${bfLine}
      <div class="pv-row"><span class="pv-label">Meta de peso</span><span class="pv-value">${fmt(profile.meta_peso)} kg</span></div>
    </div>

    <div class="pv-section">
      <h3>Dieta</h3>
      <div class="pv-row"><span class="pv-label">Atividade física</span><span class="pv-value">${atividadeLabel}</span></div>
      ${intensityLine}
    </div>

    ${criadoTxt ? `<div class="pv-footer">Perfil criado em ${criadoTxt}</div>` : ''}
  `;

  document.getElementById('profile-view-modal').classList.add('open');
}

function closeProfileView() {
  document.getElementById('profile-view-modal').classList.remove('open');
}

// calculateAge is defined in data.js (shared with computeGoals).

// ---- Onboarding inline validation helpers ----
const OB_FIELDS = ['ob-nome','ob-sobrenome','ob-sexo','ob-nascimento','ob-peso','ob-altura','ob-bf','ob-meta','ob-atividade','ob-deficit','ob-surplus'];

// v2.0.6: visibilidade dinâmica de deficit/surplus baseada em meta vs peso.
// Se meta < peso − 0,5: mostra déficit, esconde superávit
// Se meta > peso + 0,5: mostra superávit, esconde déficit
// Zona de manutenção (|delta| ≤ 0,5): esconde ambos, mostra nota explicativa
// Ambos os valores ainda são persistidos no perfil independente da visibilidade,
// pra o usuário não perder a preferência ao oscilar entre direções.
function updateIntensityVisibility() {
  const pesoEl = document.getElementById('ob-peso');
  const metaEl = document.getElementById('ob-meta');
  const deficitField = document.getElementById('ob-deficit-field');
  const surplusField = document.getElementById('ob-surplus-field');
  const maintNote = document.getElementById('ob-maintenance-note');
  if (!pesoEl || !metaEl || !deficitField || !surplusField) return;

  const peso = parseFloat(pesoEl.value);
  const meta = parseFloat(metaEl.value);

  // Peso ou meta ainda não preenchidos → esconde tudo (estado neutro)
  if (!peso || !meta || isNaN(peso) || isNaN(meta)) {
    deficitField.style.display = 'none';
    surplusField.style.display = 'none';
    if (maintNote) maintNote.style.display = 'none';
    return;
  }

  const delta = meta - peso;
  if (delta < -0.5) {
    deficitField.style.display = '';
    surplusField.style.display = 'none';
    if (maintNote) maintNote.style.display = 'none';
  } else if (delta > 0.5) {
    deficitField.style.display = 'none';
    surplusField.style.display = '';
    if (maintNote) maintNote.style.display = 'none';
  } else {
    deficitField.style.display = 'none';
    surplusField.style.display = 'none';
    if (maintNote) maintNote.style.display = '';
  }
}

// Hook listeners once — roda em initApp. Listeners persistem; reagem sempre
// que peso/meta mudam (inclusive durante create mode quando o usuário digita).
function setupIntensityToggle() {
  const pesoEl = document.getElementById('ob-peso');
  const metaEl = document.getElementById('ob-meta');
  if (!pesoEl || !metaEl) return;
  pesoEl.addEventListener('input',  updateIntensityVisibility);
  metaEl.addEventListener('input',  updateIntensityVisibility);
  pesoEl.addEventListener('change', updateIntensityVisibility);
  metaEl.addEventListener('change', updateIntensityVisibility);
  updateIntensityVisibility();
}

function clearOnboardingErrors() {
  OB_FIELDS.forEach(id => {
    const input = document.getElementById(id);
    const err = document.getElementById(id + '-err');
    if (input) input.classList.remove('error');
    if (err) { err.classList.remove('show'); err.textContent = ''; }
  });
}

function showOnboardingError(id, msg) {
  const input = document.getElementById(id);
  const err = document.getElementById(id + '-err');
  if (input) input.classList.add('error');
  if (err) { err.textContent = msg; err.classList.add('show'); }
}

// Abre o modal em modo edição, pré-populando com o perfil atual.
function openEditProfile() {
  const profile = getUserProfile();
  if (!profile) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v == null ? '' : v; };
  set('ob-nome',       profile.nome);
  set('ob-sobrenome',  profile.sobrenome);
  set('ob-sexo',       profile.sexo);
  set('ob-nascimento', profile.data_nascimento);
  set('ob-peso',       profile.peso_atual);
  set('ob-altura',     profile.altura_cm);
  set('ob-meta',       profile.meta_peso);
  // Resolve chave legada pra nova escala (se aplicável) ao pré-popular edit.
  const nivelKey = (typeof resolveActivityKey === 'function'
    ? resolveActivityKey(profile.nivel_atividade)
    : profile.nivel_atividade) || '';
  set('ob-atividade',  nivelKey);
  set('ob-bf',         profile.body_fat_pct != null ? profile.body_fat_pct : '');
  set('ob-deficit',    profile.deficit_intensity || 'moderado');
  set('ob-surplus',    profile.surplus_intensity || 'moderado');
  clearOnboardingErrors();

  const modal = document.getElementById('onboarding-modal');
  modal.dataset.mode = 'edit';
  document.getElementById('ob-title').textContent = 'Editar Perfil';
  document.getElementById('ob-subtitle').style.display = 'none';
  document.getElementById('ob-submit').textContent = 'Salvar';
  // v2.0.6: sincroniza visibilidade dos campos de intensidade com peso/meta pré-populados
  updateIntensityVisibility();
  modal.classList.add('open');
}

function closeEditProfile() {
  const modal = document.getElementById('onboarding-modal');
  modal.classList.remove('open');
  modal.dataset.mode = 'create';
  // Restaura textos padrão para eventual onboarding de outro usuário/conta
  document.getElementById('ob-title').textContent = 'Bem-vindo!';
  document.getElementById('ob-subtitle').style.display = '';
  document.getElementById('ob-submit').textContent = 'Salvar e Continuar';
  clearOnboardingErrors();
}

function submitOnboarding() {
  const get = id => document.getElementById(id);
  const nome       = get('ob-nome').value.trim();
  const sobrenome  = get('ob-sobrenome').value.trim();
  const sexo       = get('ob-sexo').value;
  const nascimento = get('ob-nascimento').value;
  const peso       = parseFloat(get('ob-peso').value);
  const altura     = parseFloat(get('ob-altura').value);
  const meta       = parseFloat(get('ob-meta').value);
  const bfRaw      = get('ob-bf').value.trim();
  const bodyFat    = bfRaw === '' ? null : parseFloat(bfRaw);
  const atividade  = get('ob-atividade').value;
  const deficit    = get('ob-deficit').value;
  const surplus    = get('ob-surplus').value;

  clearOnboardingErrors();
  let hasError = false;
  let firstError = null;
  const fail = (id, msg) => {
    showOnboardingError(id, msg);
    if (!firstError) firstError = id;
    hasError = true;
  };

  if (!nome)      fail('ob-nome',      'Informe seu nome');
  if (!sobrenome) fail('ob-sobrenome', 'Informe seu sobrenome');
  if (!sexo)      fail('ob-sexo',      'Selecione uma opção');
  if (!nascimento) {
    fail('ob-nascimento', 'Informe a data');
  } else {
    const idade = calculateAge(nascimento);
    if (idade === null || idade < 5 || idade > 120) fail('ob-nascimento', 'Data inválida');
  }
  if (!peso || peso <= 0 || peso > 400) fail('ob-peso', 'Peso inválido (kg)');
  if (!altura || altura < 80 || altura > 250) fail('ob-altura', 'Altura entre 80 e 250 cm');
  if (!meta || meta <= 0 || meta > 400) fail('ob-meta', 'Meta inválida (kg)');
  if (bodyFat !== null && (isNaN(bodyFat) || bodyFat < 3 || bodyFat > 60)) fail('ob-bf', 'Entre 3% e 60%');
  if (!atividade || !(atividade in ACTIVITY_MULTIPLIERS)) fail('ob-atividade', 'Selecione uma opção');

  // v2.0.6: deficit e surplus só são obrigatórios quando a direção da meta
  // ativa o campo correspondente (loss → deficit; gain → surplus).
  // Em manutenção (|delta| ≤ 0,5), nenhum dos dois é validado.
  if (peso && meta && !isNaN(peso) && !isNaN(meta)) {
    const delta = meta - peso;
    if (delta < -0.5) {
      if (!deficit || !(deficit in DEFICIT_INTENSITY_PCT)) fail('ob-deficit', 'Selecione uma opção');
    } else if (delta > 0.5) {
      if (!surplus || !(surplus in SURPLUS_INTENSITY_PCT)) fail('ob-surplus', 'Selecione uma opção');
    }
  }

  if (hasError) {
    const el = document.getElementById(firstError);
    if (el && typeof el.focus === 'function') el.focus();
    return;
  }

  const modal = document.getElementById('onboarding-modal');
  const isEdit = modal.dataset.mode === 'edit';
  const existing = isEdit ? (getUserProfile() || {}) : {};
  const pesoAntigo = Number(existing.peso_atual);

  saveUserProfile({
    ...existing,
    nome, sobrenome, sexo,
    data_nascimento: nascimento,
    peso_atual: peso,
    altura_cm: altura,
    body_fat_pct: bodyFat,   // null se não preenchido → cai no Mifflin
    meta_peso: meta,
    nivel_atividade: atividade,
    deficit_intensity: deficit,
    surplus_intensity: surplus,
    criado_em: existing.criado_em || new Date().toISOString(),
  });

  // Se estamos editando e o peso mudou, registra como entrada do weight_log.
  if (isEdit && pesoAntigo && pesoAntigo !== peso) {
    const next = addWeightEntry(getWeightLog(), localDateStr(), peso);
    saveData(STORAGE_KEYS.weightLog, next);
  }

  modal.classList.remove('open');
  modal.dataset.mode = 'create';
  document.getElementById('ob-title').textContent = 'Bem-vindo!';
  document.getElementById('ob-subtitle').style.display = '';
  document.getElementById('ob-submit').textContent = 'Salvar e Continuar';

  renderUserBar();
  renderDietHeader();
  renderWeightLog();
  updateDailyProgress();
}

// ============================================================
// WEIGHT LOG (evolução do peso)
// ============================================================
function getWeightLog() {
  try { return normalizeWeightLog(JSON.parse(localStorage.getItem(STORAGE_KEYS.weightLog) || '[]')); }
  catch (e) { return []; }
}

function saveWeightEntry() {
  const input = document.getElementById('weight-log-input');
  if (!input) return;
  const raw = parseFloat(input.value);
  if (!raw || raw <= 0 || raw > 400) {
    input.classList.add('error');
    input.focus();
    return;
  }
  input.classList.remove('error');
  const next = addWeightEntry(getWeightLog(), localDateStr(), raw);
  saveData(STORAGE_KEYS.weightLog, next);

  // Mantém peso_atual do perfil em sincronia com o último registro.
  const profile = getUserProfile();
  if (profile) {
    profile.peso_atual = raw;
    saveUserProfile(profile);
  }
  input.value = '';

  renderUserBar();
  renderDietHeader();
  renderWeightLog();
  updateDailyProgress();
}

// Renderiza o card de peso: gráfico SVG + input + hint semanal.
// Se não há perfil, esconde o card (nada pra mostrar sem meta).
function renderWeightLog() {
  const card = document.getElementById('weight-log-card');
  if (!card) return;
  const profile = getUserProfile();
  if (!profile) { card.style.display = 'none'; return; }
  card.style.display = 'block';

  const log = getWeightLog();
  const meta = Number(profile.meta_peso) || null;
  const fmt = n => (n == null ? '' : n.toFixed(1).replace('.', ','));

  const latest = log.length ? log[log.length - 1] : null;
  const atual = latest ? latest.peso : Number(profile.peso_atual);
  const delta = (atual != null && meta != null) ? (atual - meta) : null;
  const deltaTxt = delta == null ? '' :
    delta === 0 ? 'na meta' :
    delta > 0 ? `${fmt(delta)} kg acima` : `${fmt(-delta)} kg abaixo`;
  const deltaClass = delta == null ? '' : (delta > 0 ? 'pos' : delta < 0 ? 'neg' : '');

  // Aviso semanal: se a última entrada tem ≥7 dias OU se nunca registrou, mostra hint.
  let hintHtml = '';
  const todayStr = localDateStr();
  const daysSince = latest ? daysBetweenDates(latest.date, todayStr) : null;
  if (!latest) {
    hintHtml = `<div class="weight-log-hint">Registre seu peso pra começar a acompanhar sua evolução.</div>`;
  } else if (daysSince != null && daysSince >= 7) {
    hintHtml = `<div class="weight-log-hint">Já se passou ${daysSince} ${daysSince === 1 ? 'dia' : 'dias'} desde o último registro. Que tal atualizar?</div>`;
  }

  const chartHtml = log.length >= 1 ? renderWeightChart(log, meta) :
    `<div class="weight-chart-empty">Seu gráfico aparece aqui após o primeiro registro.</div>`;

  // Mini lista das últimas 3 entradas (mais antiga → mais nova para leitura natural).
  const recent = log.slice(-3).map(e => {
    const [y, m, d] = e.date.split('-');
    return `<span>${d}/${m}: ${fmt(e.peso)} kg</span>`;
  }).join('');
  const recentHtml = recent ? `<div class="weight-log-recent">${recent}</div>` : '';

  card.innerHTML = `
    <h3>Evolução do Peso</h3>
    ${hintHtml}
    <div class="weight-summary">
      <span>Atual: <b>${fmt(atual)} kg</b></span>
      ${meta != null ? `<span>Meta: <b>${fmt(meta)} kg</b> ${deltaTxt ? `<span class="weight-delta ${deltaClass}">(${deltaTxt})</span>` : ''}</span>` : ''}
    </div>
    ${chartHtml}
    <div class="weight-log-form">
      <input type="number" id="weight-log-input" inputmode="decimal" step="0.1" placeholder="Peso de hoje (kg)">
      <button onclick="saveWeightEntry()">Registrar</button>
    </div>
    ${recentHtml}
  `;
}

// SVG inline — polyline do peso ao longo do tempo + linha de meta pontilhada.
// N amostras no eixo X (últimas até WEIGHT_LOG_MAX), eixo Y auto-escalado com padding.
function renderWeightChart(log, meta) {
  const width = 320, height = 130, padX = 30, padY = 16;
  const values = log.map(e => e.peso);
  const all = meta != null ? values.concat([meta]) : values;
  let minV = Math.min(...all);
  let maxV = Math.max(...all);
  if (minV === maxV) { minV -= 1; maxV += 1; }
  const range = maxV - minV;
  minV -= range * 0.15;
  maxV += range * 0.15;

  const n = log.length;
  const xFor = i => padX + (n <= 1 ? (width - 2 * padX) / 2 : i * (width - 2 * padX) / (n - 1));
  const yFor = v => padY + (maxV - v) / (maxV - minV) * (height - 2 * padY);

  // Polyline dos pontos
  const pts = log.map((e, i) => `${xFor(i).toFixed(1)},${yFor(e.peso).toFixed(1)}`).join(' ');
  const dots = log.map((e, i) =>
    `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(e.peso).toFixed(1)}" r="3" fill="#2a6aa3"/>`
  ).join('');

  // Linha de meta (tracejada) + labels dos eixos (min/max)
  const metaLine = meta != null
    ? `<line x1="${padX}" y1="${yFor(meta).toFixed(1)}" x2="${width - padX}" y2="${yFor(meta).toFixed(1)}" stroke="#48bb78" stroke-width="1.5" stroke-dasharray="4,3"/>
       <text x="${width - padX + 2}" y="${(yFor(meta) + 3).toFixed(1)}" font-size="9" fill="#48bb78" font-weight="700">${meta.toFixed(1).replace('.', ',')}</text>`
    : '';

  // Labels Y (min/max arredondados a 0.5)
  const yLabel = (v, y) => `<text x="${padX - 4}" y="${y.toFixed(1)}" font-size="9" fill="#718096" text-anchor="end">${v.toFixed(1).replace('.', ',')}</text>`;
  const yTop = yLabel(maxV, padY + 3);
  const yBot = yLabel(minV, height - padY + 3);

  // Label X primeira e última data (DD/MM)
  const fmtDate = d => { const [y, m, dd] = d.split('-'); return `${dd}/${m}`; };
  const xLabels = n === 0 ? '' :
    `<text x="${xFor(0).toFixed(1)}" y="${height - 2}" font-size="9" fill="#718096" text-anchor="start">${fmtDate(log[0].date)}</text>
     ${n > 1 ? `<text x="${xFor(n - 1).toFixed(1)}" y="${height - 2}" font-size="9" fill="#718096" text-anchor="end">${fmtDate(log[n - 1].date)}</text>` : ''}`;

  return `<svg class="weight-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
    ${metaLine}
    <polyline points="${pts}" fill="none" stroke="#2a6aa3" stroke-width="2"/>
    ${dots}
    ${yTop}${yBot}${xLabels}
  </svg>`;
}

function initApp() {
  renderTabBar();
  renderMarmitaPlanner();
  renderDinnerPlanner();
  renderFruitSuggestions();
  updateWeekLabel();
  renderMarmitaSelector();
  renderDinnerSelector();
  renderStockCard();
  renderMeals();
  renderShoppingList();
  renderExercises();
  loadTodayCardio();
  renderCalendar();
  renderWeightLog();
  setupIntensityToggle();
  showOnboardingIfNeeded();

  renderUserBar();

  // Sunday prompt - only after app is loaded (logged in or skipped login)
  setTimeout(checkSundayPrompt, 500);
}

// Block pinch-to-zoom and double-tap zoom on iOS
document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Sunday prompt is now called inside initApp (only after login/skip)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
