// ==================================================================
// data.js — Receitas, ingredientes e constantes derivadas.
// Carregado antes do script principal via <script src="data.js">.
// ==================================================================
// Nenhuma função neste arquivo deve tocar o DOM — tudo é pura data
// ou helpers que operam apenas sobre as estruturas declaradas aqui.

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
const INGREDIENTS = {
  // Proteínas — marmitas
  frango:            { label: 'Peito de frango',                     unit: 'g',     role: 'protein' },
  carne_moida:       { label: 'Carne moída',                         unit: 'g',     role: 'protein' },
  tilapia:           { label: 'Filé de tilápia',                     unit: 'g',     role: 'protein' },
  lombo:             { label: 'Lombo suíno',                         unit: 'g',     role: 'protein' },
  sobrecoxa:         { label: 'Sobrecoxa sem pele',                  unit: 'g',     role: 'protein' },
  coxao_mole:        { label: 'Coxão mole',                          unit: 'g',     role: 'protein' },
  // Proteínas — jantares
  atum_lata:         { label: 'Atum em lata',                        unit: 'lata',  role: 'protein' },
  alcatra:           { label: 'Carne bovina (bife ou pedaços; crua)', unit: 'g',    role: 'protein' },
  peito_peru:        { label: 'Peito de peru defumado',              unit: 'g',     role: 'protein' },
  ovos:              { label: 'Ovos',                                unit: 'un',    role: 'protein-share' },
  // Carboidratos
  arroz_branco:      { label: 'Arroz branco (cru)',                  unit: 'g',     role: 'carb' },
  arroz_integral:    { label: 'Arroz integral (cru)',                unit: 'g',     role: 'carb' },
  batata_doce:       { label: 'Batata doce',                         unit: 'g',     role: 'carb' },
  mandioca:          { label: 'Mandioca (crua)',                     unit: 'g',     role: 'carb' },
  macarrao_integral: { label: 'Macarrão integral (cru)',             unit: 'g',     role: 'carb' },
  goma_tapioca:      { label: 'Goma de tapioca',                     unit: 'g',     role: 'carb' },
  tortilla:          { label: 'Tortilla integral',                   unit: 'un',    role: 'carb' },
  pao_integral:      { label: 'Pão integral',                        unit: 'fatias',role: 'carb' },
  // Queijos e cremes
  mussarela:         { label: 'Queijo mussarela',                    unit: 'g',     role: 'other' },
  queijo_minas:      { label: 'Queijo minas frescal',                unit: 'g',     role: 'other' },
  cottage:           { label: 'Queijo cottage',                      unit: 'g',     role: 'other' },
  requeijao:         { label: 'Requeijão cremoso',                   unit: 'g',     role: 'other' },
  // Salada
  alface:            { label: 'Alface + rúcula',                     unit: 'g',     role: 'veg' },
  pepino:            { label: 'Pepino',                              unit: 'g',     role: 'veg' },
};

// Helper: soma as necessidades de ingredientes a partir de um plano de marmitas + jantares
// Retorna { key: quantidadeTotal } somando todas as refeições selecionadas.
function computeIngredientNeeds(marmitaPlan, dinnerPlan) {
  const needs = {};
  MARMITA_DEFS.forEach(m => {
    const qty = marmitaPlan[m.id] || 0;
    if (qty <= 0) return;
    Object.entries(m.ingredients).forEach(([k, raw]) => {
      needs[k] = (needs[k] || 0) + qty * raw;
    });
  });
  DINNER_DEFS.forEach(d => {
    const qty = dinnerPlan[d.id] || 0;
    if (qty <= 0) return;
    Object.entries(d.ingredients).forEach(([k, raw]) => {
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
function computeAromatics(marmitaPlan, dinnerPlan) {
  const totals = { alho: 0, cebola: 0, limao: 0, tomate: 0, polpa_tomate: 0 };
  const accumulate = (defs, plan) => {
    defs.forEach(item => {
      const qty = plan[item.id] || 0;
      const r = item.recipe;
      if (qty <= 0 || !r || !r.yield || !r.aromatics) return;
      const scale = qty / r.yield;
      Object.keys(totals).forEach(k => {
        if (r.aromatics[k]) totals[k] += r.aromatics[k] * scale;
      });
    });
  };
  accumulate(MARMITA_DEFS, marmitaPlan);
  accumulate(DINNER_DEFS, dinnerPlan);
  return totals;
}

function getMarmitaPlan() {
  return JSON.parse(localStorage.getItem('marmita_plan') || JSON.stringify(DEFAULT_PLAN));
}

function getDinnerPlan() {
  return JSON.parse(localStorage.getItem('dinner_plan') || JSON.stringify(DEFAULT_DINNER_PLAN));
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
