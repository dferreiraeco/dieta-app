# Dieta App — Roadmap de Evolução

Documento vivo com o que está feito, em andamento e pendente. Atualize conforme o trabalho avança.

Origem: análise crítica feita em abril/2026 cobrindo 33+ pontos de dívida técnica, UX e funcionalidade. Execução em 5 fases, ponto a ponto.

---

## 🍽 v2.1.5 → v2.1.14 — Pratos fotorrealistas no planner (2026-04-13)

**Objetivo:** substituir os emojis placeholder do grid de marmitas/jantares por imagens foto-realistas de pratos, estilo food photography premium, nos moldes do Apphone reference UI kit.

### Entregas incrementais

#### v2.1.5 — Grid 2-por-linha + emoji placeholders
- Refactor do `renderMarmitaPlanner` e `renderDinnerPlanner` pra **grid 2 colunas** com cards side-by-side
- CSS `.planner-cards-grid` + `.pl-card` com imagem circular 80×80 overflow no topo + nome + desc + macros + stepper
- Emoji tables (`MARMITA_EMOJIS`/`DINNER_EMOJIS`) como fallback quando `meal.image` não existe
- Helper `renderMealImageHtml(meal, emojiMap)` escolhe `<img>` ou `<span>` emoji

#### v2.1.5 → v2.1.6 — `images/PROMPTS.md` auto-contido
- Documento com **12 prompts prontos** pra copy/paste direto no ChatGPT/DALL-E 3
- STYLE BLOCK embutido em cada prompt (auto-contido, não precisa concatenar)
- Descrições específicas dos ingredientes exatos de cada marmita/jantar
- Tabela de nomes de arquivo → entries em `data.js`
- Checklist pós-geração (resize, compressão, integração)

#### v2.1.6 — Fonte maior nos cards
- `.pc-name` de 14px → 16px, `.pc-desc` de 10px → 12px
- Melhor legibilidade sem afetar `.pc-macros` (mantidos em 13px/9px conforme solicitado)

#### v2.1.7 → v2.1.10 — Aplicação da 1ª imagem real + tratamento de borda
- `marmita-frango.png` aplicada via `image: 'marmita-frango.png'` em Marmita A
- Iteração no CSS pra remover border/background do círculo quando há imagem real:
  - v2.1.8: `:has(img)` → border/bg transparente
  - v2.1.9: Troca de `:has()` por classe `.has-image` (máxima compat)
  - v2.1.10: Removido scale 1.25× do img (zoom artificial indesejado)

#### v2.1.11 — Crop automático via PIL
- Descoberto que PNG gerado por DALL-E vem com **padding transparente ao redor do bowl** (RGBA alpha=0 nos cantos), fazendo aparecer "anel branco" do card no slot circular
- Script Python com Pillow crop o PNG na bbox do conteúdo opaco → bowl preenche o frame 100%

#### v2.1.12 — Todas as 12 imagens processadas + integradas
- `scripts/crop-meals.py` reutilizável — processa 1 arquivo ou batch da pasta inteira
- Backup automático dos originais em `images/.originals/`
- Detecção por alpha (imagens RGBA) OU RGB diff com cantos (imagens opacas)
- Redimensiona pra **512×512** (4× DPR pro círculo de 80px), otimiza PNG
- 12 entries de `data.js` atualizadas com `image:` field correspondente

#### v2.1.13 → v2.1.14 — Refinamentos do crop
- **v2.1.13**: combinação de RGB diff + **FIND_EDGES** (Laplaciano) pra pegar rim do prato claro sobre fundo claro (ex: sanduíche em prato branco). Erosão pesada removeu watermark da marmita-carne-moida. Projeção de linha/coluna encontra o maior cluster contíguo, isolando prato de texto.
- **v2.1.14**: simplificação — estratégia por **tipo de imagem**:
  - **Landscape/portrait** (aspect ≠ 1:1, ex: jantares 1408×768): center crop to `min(w, h)`. Simples e sempre correto.
  - **Square + bg opaco** (ex: jantares square, marmita-macarrao-coxao): center crop to `min(w, h)` = imagem inteira. Mais confiável que bbox detection com gradient noise.
  - **Square + bg transparente** (marmitas alpha): bbox detection via projeção (mantém watermark removal pra carne-moida).

### Imagens finais (v2.1.14)

| Arquivo | Estratégia | Crop final |
|---|---|---|
| marmita-frango | transparent bbox | 510×510 |
| marmita-carne-moida | transparent bbox + projeção (watermark excluded) | 826×826 |
| marmita-tilapia | transparent bbox | 849×849 |
| marmita-lombo | transparent bbox | 822×822 |
| marmita-sobrecoxa | transparent bbox | 825×825 |
| marmita-macarrao-coxao | opaque center crop | 1024×1024 |
| jantar-omelete | opaque center crop | 1024×1024 |
| jantar-tapioca | opaque center crop | 1024×1024 |
| jantar-carne | opaque center crop | 1024×1024 |
| jantar-atum | landscape center crop | 768×768 |
| jantar-sanduiche | landscape center crop | 768×768 |
| jantar-wrap | landscape center crop | 768×768 |

### Arquivos novos
- `scripts/crop-meals.py` — pipeline de processamento de imagens reutilizável
- `images/PROMPTS.md` — 12 prompts prontos pra DALL-E 3
- `images/README.md` — fluxo de integração
- `images/*.png` — 12 imagens foto-realistas
- `images/.originals/*.png` — backups dos originais da IA

### Tests: 128/128 ✓ (nenhum teste novo — é tudo visual/asset)

---

## 🎨 v2.1.1 → v2.1.4 — Polimento pós-redesign (2026-04-13)

Ciclo de ajustes visuais e UX imediatamente após a v2.1.0 baseado em feedback de uso real.

### v2.1.1 — Fix dos page headers com fundo colorido
- 4 abas (Marmitas, Compras, Treino, Agenda) ainda tinham `style="background:var(--green)"` inline nos `.page-header`, sobrescrevendo o fundo branco da v2.1.0 → títulos escuros ficavam invisíveis sobre verde
- Removidos os 4 inline styles → todas as 5 abas agora consistem com fundo branco + título bold ink-strong + subtitle ink-medium opaco

### v2.1.2 — Round-down da meta + remove "Plano vs meta" + profile view modal
- **`computeGoals`** aplica `Math.floor(kcal / 100) * 100` após o piso de 1200 → alvo sempre múltiplo de 100 (ex: 2245 → 2200)
- **`renderDietBalance`** removeu a linha "Plano do dia vs meta" (confundia o usuário); só per-meal P + diet break hint ficam
- **Novo `#profile-view-modal`** bottom-sheet — clicar no avatar/nome do user-bar abre um modal com todas as infos do perfil em 3 seções (Identificação, Composição corporal, Dieta) + botão "Editar Perfil"
- **`renderUserBar`** refatorado com `user-bar-main` clicável + `event.stopPropagation` no botão "Sair" pra não disparar o view

### v2.1.3 — Remoção total do `#diet-balance`
- User achou que "Meta de proteína por refeição" + diet break hint também confundiam
- HTML removido, função `renderDietBalance` deletada, CSS órfão limpo (`.diet-balance`, `.balance-*`, `.diet-break-hint`)
- Daily tracker fica minimalista: donut + 3 linhas de macros + meals-count + reset button

### v2.1.4 — Animação slide-up do profile view
- `@keyframes sheetSlideUp` com `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- `@keyframes overlayFadeIn` pro backdrop
- Respeita `prefers-reduced-motion` — usuários com essa preferência recebem abertura instantânea
- Só `#profile-view-modal` recebe a animação; outros modais mantêm comportamento original

---

## 🚀 v2.1.0 — Fusion Redesign (2026-04-13)

**Redesign visual completo** baseado na fusão de 4 referências de UI kits (verdes + neutrals warm). Saída do mundo "app bancário" azul/multicolor pra um mundo "dashboard de saúde" verde-forward com feel orgânico.

**Entrega desta release (Passos 1-2 de 4):**

### Foundation
- **Paleta v2.1.0** — novos tokens semânticos em `styles.css`:
  - `--green-primary #2B7A4B`, `--green-dark #1E5A37`, `--green-soft #E8F3ED`
  - `--cream #FAFAF5`, `--surface #FFFFFF`
  - `--ink-strong #1A2E22`, `--ink-medium #5A6B63`, `--ink-soft #9AA8A1`
  - `--accent-warm #E8A04E`, `--accent-danger #D35A47`, `--purple-soft #7B6BA8`
- **Shape tokens**: `--radius-sm/md/lg/pill`
- **Elevation tokens**: `--shadow-soft/mid/lg` (cores warm, baseadas em rgba(26, 46, 34, x))
- **Legacy aliases** — `--blue`, `--green`, `--orange` etc viram aliases das novas vars pra não quebrar regras existentes
- **Dark mode scaffold** — `[data-theme="dark"]` completo (declarado, não ativado)

### Glyph system
- Novo arquivo `glyphs.js` (~280 linhas) com **34 ícones Lucide** inline (SVG stroke-based)
- Helper `glyph(name, size?, color?, stroke?)` retorna SVG string
- Categorias: tab bar, refeições, ações, navegação, macros, extras

### Componentes redesenhados
- **Tab bar** — populada dinamicamente via `renderTabBar()` com glyphs Lucide. Fundo branco, shadow top, dot verde sob o ativo.
- **Daily tracker** — substituiu 4 barras lineares por **donut SVG 120×120** (kcal) + **3 linhas textuais** (P/C/G com dots coloridos + mini barra)
- **Meal cards** — radius 24px, shadow soft, glyph de comida à esquerda (coffee/sun/salad/cookie/soup/moon), macros em pills coloridos, check circular no canto
- **User bar** — layout compacto com avatar circular (primeira letra do nome, verde sólido), 2 linhas (nome / idade + peso), botões de ação como glyphs sem label
- **Page headers** — fundo branco (em vez de barras de cor sólida), título bold 22px, subtitle 13px medium
- **Modais** — bottom-sheet feel com drag handle (40×4px no topo), backdrop com blur 4px, cantos top-only 22px (onboarding/calc-details mantêm cantos totais)
- **Cards genéricos** — radius 24px, shadow soft, padding 18×20, sem bordas
- **Botões** — pill shape (radius 999px), primário com shadow soft, secundário com border fino, destrutivo em texto
- **Inputs** — background cinza warm, sem border visível, foco com green-soft bg + glow verde

**O que ainda falta (Passos 3-4, pendente pra próxima sessão):**
- Cards de marmita/jantar no planner (CSS já existe via `.marmita-card`/`.dinner-card`, falta o HTML render no `renderMarmitaPlanner`/`renderDinnerPlanner` usar a nova estrutura)
- Stepper pill pra quantidade de marmitas (CSS já pronto via `.mc-stepper`)
- Ativação real do dark mode via toggle no user-bar
- Review visual completo em browser (testar em diferentes tamanhos)

**Tests:** 128/128 ✓ (UI pura, sem mudanças na lógica pura — todos os testes de cálculo/refeições passam intactos)

**Arquivos alterados:**
- `styles.css` — paleta nova, dark mode scaffold, ~300 linhas novas de componentes v2.1.0
- `glyphs.js` — NOVO arquivo com 34 ícones Lucide + helper
- `index.html` — `<script src="glyphs.js">`, tab bar virou container vazio, daily tracker virou `.tracker-main` + donut-wrap + macro-lines
- `app.js` — `renderTabBar()` + `TAB_META`, `renderKcalDonut()` + `renderMacroLines()`, `renderMeals` reescrito com glyphs + meal-check, `renderUserBar` com avatar compacto
- `sw.js` → **v2.1.0**, `?v=210`

---

## 🚀 v2.0.7 — Harris-Benedict clássico + extremo 40% + visibilidade dinâmica (2026-04-13)

**Reverte o shift-down conservador de v2.0.1** em favor da escala Harris-Benedict clássica, que é a referência padrão da literatura moderna (Helms 2014, ISSN 2017/2023, ACSM 2016, Academy of Nutrition and Dietetics 2023). Adiciona nível "extremo" 40% como teto superior do déficit.

**Entrega:**

### (1) Fatores de atividade H-B clássicos

`ACTIVITY_MULTIPLIERS` atualizado (mantendo as keys sentado/leve/rotina/intenso/atleta):

| Key | Antes (v2.0.1) | Agora (v2.0.7) | Descrição H-B |
|---|---|---|---|
| sentado | 1.0 | **1.2** | Sedentário |
| leve | 1.2 | **1.375** | Levemente ativo 1-3x/sem |
| rotina | 1.375 | **1.55** | Moderadamente ativo 3-5x/sem |
| intenso | 1.55 | **1.725** | Muito ativo 6-7x/sem |
| atleta | 1.725 | **1.9** | Extra ativo (trabalho físico + treino diário) |

**LEGACY_ACTIVITY_KEYS** agora é mapeamento preservativo (não é mais shift-down): perfis v1 com `sedentario`/`sedentario_leve`/`moderado`/`alto` mapeiam pras novas keys com **mesmo multiplicador**.

**Fallback** em `computeGoals` muda de `'leve'` (1.375) pra `'sentado'` (1.2) — o mais conservador possível na nova escala.

### (2) Déficit "extremo" 40%

Nova entrada em `DEFICIT_INTENSITY_PCT`: `extremo: 0.40`. Novo `<option>` em `ob-deficit`.

**Base científica:**
- **Longland et al. 2016** — sujeitos obesos com 40% deficit + proteína alta (2,4 g/kg LBM) + treino de força perderam gordura E ganharam massa magra
- **Murphy & Koehler 2022** — review confirma tolerância até 40% quando: BF% inicial alto, proteína ≥2,3 g/kg LBM, treino de força mantido
- **Disclaimer no label:** "Extremo — 40% do TDEE (~1,0+ kg/sem, teto Longland 2016)"

### (3) v2.0.6: Visibilidade dinâmica de déficit/superávit (incluído nessa release)

- Labels sem "(só aplica em perda/ganho)" parenthetical
- `updateIntensityVisibility()` toggla baseado em delta (meta − peso)
- `setupIntensityToggle()` registra listeners input/change em ob-peso/ob-meta
- Modo manutenção mostra nota em vez dos campos
- Validação condicional: só exige deficit se perda, só exige surplus se ganho

**Impacto no alvo do Diego:**

| Cenário | v2.0.6 (conservador) | v2.0.7 (H-B) | Δ |
|---|---|---|---|
| BMR (Katch) | 2.069 | 2.069 | — |
| TDEE (rotina) | 2.845 (×1,375) | **3.207** (×1,55) | +362 |
| Agressivo 30% | 1.992 | **2.245** | +253 |
| Extremo 40% | — | **1.924** | — |
| Macros agressivo | 189P/149C/71G | 189P/**213C**/71G | +64g carbo |
| Macros extremo | — | 189P/132C/71G | — |

**Tests: 126 → 128/128 ✓** (+2 novos pros casos extremo; ~15 existentes atualizados pra usar as novas keys/valores)

**Referências científicas:**
- Harris & Benedict 1919 (fórmula original)
- Mifflin-St Jeor 1990 (BMR moderno)
- **Helms et al. 2014** (bodybuilding contest prep)
- **ISSN Position Stand on Energy** (Kerksick et al. 2017/2023)
- **Ten Haaf & Weijs 2014** (validação em atletas)
- **Academy of Nutrition and Dietetics EAL 2023** (endossa fatores H-B)
- **Longland et al. 2016** (40% deficit em obesos com alta proteína)
- **Murphy & Koehler 2022** (review de tolerância a deficits altos)

---

## 🚀 v2.0.5 — Transparência do cálculo (2026-04-13)

**Batch A do plano de micro-ajustes.** Consolidou dois itens em um só deliverable:
- Item 2: exibir BMR/TDEE/LBM quando BF% preenchido
- Item 3: explicar a hierarquia dos macros com referências

**Entrega:**
- `computeGoals` agora retorna `_details` com metadados de transparência: `bmr`, `tdee`, `lbm`, `bf_pct`, `bmrFormula` ('Katch-McArdle' | 'Mifflin-St Jeor'), `activityKey`, `activityMult`, `macroBase`, `macroBaseLabel`, `protein_per_kg`, `fat_per_kg`, `direction`, `deficitPct`, `surplusPct`, `waterPerKg`
- Novo modal `#calc-details-modal` acessado via link "ⓘ Detalhes" no header da aba Dieta (só aparece quando há perfil)
- Modal tem 6 seções:
  1. Composição corporal (peso, BF%, LBM)
  2. Gasto energético (fórmula BMR + multiplicador + TDEE)
  3. Meta calórica (direção + déficit/superávit aplicado)
  4. Macronutrientes (hierarquia + fórmulas visíveis)
  5. Recomendações adicionais (fibra + água com fórmulas)
  6. Referências científicas (10 categorias, ~25 papers citados)
- CSS novo: `.calc-details-link`, `.calc-section`, `.calc-formula`, `.calc-note`, `.calc-refs`
- 4 testes novos (126/126 total) cobrindo shape de `_details` pro Katch-McArdle, Mifflin-St Jeor, direction loss/gain/maintain, surplusPct condicional

**Exemplo do que aparece pro Diego no modal:**
```
1. Composição corporal
   • Peso total: 118.3 kg
   • Gordura corporal: 33.5%
   • Massa magra (LBM): 78,7 kg  = 118.3 × (1 − 33.5/100)

2. Gasto energético
   • Fórmula: Katch-McArdle  = 370 + 21,6 × 78,7
   • BMR: 2.069 kcal/dia
   • Atividade: rotina (× 1,375)
   • TDEE: 2.845 kcal/dia  = 2.069 × 1,375

3. Meta calórica
   • Direção: Perda
   • Déficit: 30% do TDEE = −854 kcal
   • Alvo: 1.992 kcal/dia

4. Macronutrientes
   • Proteína: 189g  = 2,4 × 78,7 kg LBM
   • Gordura:  71g  = 0,9 × 78,7 kg LBM
   • Carbo:   149g  = (1.992 − 756 − 639) / 4
   • Por refeição: ~31g P  = 0,4 × 78,7 kg LBM

5. Recomendações adicionais
   • Fibra: 28g/dia  = max(25, 14 × 1.992 / 1.000)
   • Água: 4,7 L/dia = 40 ml/kg × 118.3 kg

6. Referências científicas (lista completa Helms/Morton/Dorgan/Reynolds/Manz-Wentz/etc.)
```

---

## 🚀 v2.0.4 — Surplus configurável + diet break + meta de P por refeição (2026-04-13)

**Motivação:** completa a auditoria científica do cálculo cobrindo 3 lacunas residuais:
1. **Surplus +300 fixo** era grosseiro em TDEEs extremos (Iraki 2019 recomenda 10-20% escalável)
2. **Nenhum lembrete de diet break** apesar da literatura (Helms 2014; Peterson 2017) recomendar 1-2 semanas em manutenção a cada 8-12 semanas de cut
3. **Meta de proteína por refeição** não era exposta (Schoenfeld & Aragon 2018; Areta et al. 2013: 0,4 g/kg × 4-5 refeições otimiza MPS)

**Entrega:**

### (a) Surplus percentual configurável

- Nova constante `SURPLUS_INTENSITY_PCT` em `data.js`:
  - `lento` = 10% (lean bulk, Ribeiro 2019)
  - `moderado` = 15% (default, Iraki 2019)
  - `agressivo` = 20% (Garthe 2013)
- `computeGoals` consulta `profile.surplus_intensity` no modo ganho; fallback +300 kcal fixo pra perfis v1
- Novo campo `<select id="ob-surplus">` no modal de onboarding
- `openEditProfile` pré-popula; `submitOnboarding` valida e persiste

### (b) Diet break reminder (Helms 2014)

- Função pura `weeksInCut(weightLog)` em `data.js` — conta semanas desde o peso máximo do log até a entrada mais recente
- `renderDietBalance` exibe hint laranja quando `weeksInCut ≥ 8`, hint crítico vermelho quando `≥ 12`
- Mensagem cita Helms et al. 2014 como referência
- Só aparece em modo `loss` (getGoalDirection)

### (c) Meta de proteína por refeição

- `computeGoals` retorna `perMealP = round(0,4 × macroBase)` (Schoenfeld & Aragon 2018)
- `renderDietBalance` mostra linha "Meta de proteína por refeição: ~Xg" abaixo do saldo
- `renderMeals` adiciona marcador visual por refeição: ✓ verde se >= meta, amarelo 60-100%, ⚠ laranja < 60%
- CSS novo em `styles.css`: `.p-ok`, `.p-low`, `.p-mid`, `.balance-per-meal`, `.diet-break-hint`

**Testes novos (13):**
- 5 pra surplus (lento/moderado/agressivo/legacy/ignorado em maint+loss)
- 2 pra perMealP (com BF% / sem BF%)
- 6 pra weeksInCut (vazio/curto/cut longo/cut recente/não em cut/ordem)

**Tests total:** 109 → **122/122 ✓**

**Impacto no teu caso (Diego):**
- **Surplus:** N/A (você está em perda)
- **perMealP:** `0,4 × 78,67 LBM = 31g por refeição`. Em 6 refeições = 186g total, bate com a meta de 189g. Dieta já está bem distribuída — refeições que provavelmente vão aparecer com ⚠ são Lanche 1 (24g P: ratio 77% → amarelo, ok) e Pré-sono (se a opção escolhida tiver pouca P, ~22g: 71% → amarelo).
- **Diet break:** vai ativar automaticamente quando você registrar 8+ semanas de cutting no `weight_log`. Como o log tá vazio agora, só vai aparecer depois que você registrar peso por tempo suficiente.

**Referências científicas adicionadas:**
- **Ribeiro et al. 2019** — *Effects of different dietary energy intake following resistance training on muscle mass and body fat in bodybuilders: a pilot study.* Journal of Human Kinetics
- **Iraki, Fitschen, Espinar & Helms 2019** — *Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review.* Sports 7(7):154
- **Garthe et al. 2013** — *Effect of nutritional intervention on body composition and performance in elite athletes.* European Journal of Sport Science
- **Helms, Aragon & Fitschen 2014** — *Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation.* Journal of the International Society of Sports Nutrition 11:20
- **Peterson et al. 2017** — *Intermittent energy restriction in obesity: a systematic review.* Obesity Reviews
- **Schoenfeld & Aragon 2018** — *How much protein can the body use in a single meal for muscle-building?* Journal of the International Society of Sports Nutrition 15:10
- **Areta et al. 2013** — *Timing and distribution of protein ingestion during prolonged recovery from resistance exercise alters myofibrillar protein synthesis.* Journal of Physiology 591(9):2319-2331

---

## 🚀 v2.0.3 — Fibra calorie-adjusted + água body-weight-adjusted (2026-04-13)

**Motivação:** a v2.0.2 deixou fibra e água como constantes estáticas em `FIXED_RECOMMENDATIONS` (20g fibra, 3-4 L água), mas a literatura moderna tem critérios **individualizados** que devem escalar com o perfil do usuário — fibra com ingestão calórica, água com peso corporal e atividade.

**Fibra — critério calorie-adjusted:**
```
fiber_g = max(25, round(14 × kcal/1000))
```
- **14 g/1000 kcal** (IOM 2005 DRI; USDA Dietary Guidelines for Americans 2020-2025) — fórmula funcional que escala com ingestão calórica individual
- **Piso de 25 g** (WHO 2023 Guideline on Carbohydrate Intake for Adults; Reynolds et al. 2019 Lancet meta-analysis) — abaixo disso o efeito protetor em mortalidade, CHD, T2D e câncer colorretal enfraquece
- **Diego 1.992 kcal:** `max(25, 27,9) = 28 g/dia`
- **Perfil pequeno 1.200 kcal:** `max(25, 16,8) = 25 g/dia` (piso domina)
- **Atleta 3.371 kcal:** `max(25, 47,2) = 47 g/dia`

**Água — critério body-weight-adjusted:**
```
water_ml = ACTIVITY_WATER_ML_PER_KG[atividade] × peso_kg
```
Escala de ml/kg por nível de atividade:
| Atividade | ml/kg | Base científica |
|---|---|---|
| sentado  | 35 | Manz & Wentz 2005 baseline |
| leve     | 37 | +5% sudorese leve |
| rotina   | 40 | +14% (3-5x/semana) |
| intenso  | 45 | +28% (6-7x/semana), compat ACSM 2007/2016 |
| atleta   | 50 | +43% (2x/dia, trabalho físico) |

- **Diego 118,3 kg rotina:** `40 × 118,3 = 4.732 ml → ~4,7 L/dia`
- **Mulher 60 kg leve:** `37 × 60 = 2.220 ml → ~2,2 L/dia`
- **Atleta 80 kg:** `50 × 80 = 4.000 ml → 4,0 L/dia`

**Entrega:**
- `computeGoals` retorna `fiber` e `water_ml` além de kcal/P/C/G
- Nova constante `ACTIVITY_WATER_ML_PER_KG` em `data.js`
- `FIXED_RECOMMENDATIONS` removido (agora dinâmico por perfil)
- `DEFAULT_GOALS` atualizado com `fiber: 28, water_ml: 2450` (ref 70 kg / 2.000 kcal)
- `renderDietHeader` adiciona linha "Fibra: Xg/dia • Água: Y L/dia" abaixo da linha de kcal, com fonte menor
- 3 testes novos (109/109 total): fiber calorie-adjusted, water por atividade, integridade do `ACTIVITY_WATER_ML_PER_KG`

**Fontes científicas** (consultadas do conhecimento prévio até 2025; WebSearch estava indisponível no momento da implementação — se alguma revisão 2025+ mudar os critérios, podemos validar depois):
- **Fibra:**
  - Reynolds et al. 2019. *Carbohydrate quality and human health: a series of systematic reviews and meta-analyses.* Lancet 393(10170):434-445.
  - WHO 2023. *WHO Guideline on Carbohydrate Intake for Adults and Children.*
  - IOM 2005. *Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids.*
  - USDA/HHS 2020. *Dietary Guidelines for Americans 2020-2025.*
  - EFSA 2010. *Scientific Opinion on Dietary Reference Values for Carbohydrates and Dietary Fibre.*
- **Água:**
  - Manz & Wentz 2005. *The importance of good hydration for the prevention of chronic diseases.* Nutrition Reviews 63(6 Pt 2):S2-5.
  - Popkin, D'Anci & Rosenberg 2010. *Water, hydration, and health.* Nutrition Reviews 68(8):439-458.
  - IOM 2005. *Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate.*
  - Sawka et al. 2007 (ACSM Position Stand, reaffirmed 2016). *Exercise and fluid replacement.* Med Sci Sports Exerc 39(2):377-390.

---

## 🚀 v2.0.2 — Macros via LBM quando BF% conhecido (2026-04-13)

**Motivação:** na v2.0.1 o alvo kcal do Diego caiu pra 1.992 kcal com Katch+rotina+30%, mas os macros ainda estavam calibrados em **peso total** (P=237, G=106), o que forçava carbo em ~23g — keto não-intencional. O doc de referência usa **LBM como base** com multiplicadores calibrados pra LBM (Helms 2014; Morton 2018; Dorgan 1996).

**Entrega:**
- Nova constante `MACRO_RATIOS` em `data.js` com dois conjuntos:
  - `lbm:   { protein_per_kg: 2.4, fat_per_kg: 0.9 }` — ativo quando `body_fat_pct` presente
  - `total: { protein_per_kg: 2.0, fat_per_kg: 0.9 }` — fallback sem BF% (retrocompatível)
- `computeGoals` escolhe base e ratios dependendo da presença de BF%: `macroBase = LBM` (se BF%) ou `peso` (fallback)
- Hierarquia mantida: proteína primeiro, gordura depois, carbo preenche o restante
- Nova constante `FIXED_RECOMMENDATIONS` com fibra ≥20g (IOM) e água 3-4 L/dia (IOM 2005) — disponível pro display, não entra no cálculo de kcal
- 2 testes novos (106/106 total): Diego real com macros LBM + teste explícito comparando LBM vs peso total

**Impacto no alvo do Diego** (1.992 kcal, rotina 1.375, agressivo 30%, BF 33.5%):
```
v2.0.1 (peso total):  237g P |  23g C | 106g G   ← keto não-intencional
v2.0.2 (LBM):         189g P | 149g C |  71g G   ← balanceado
```

**Referências científicas:**
- Morton et al. 2018 (meta-análise) — proteína 1,6-2,2 g/kg para hipertrofia
- Helms et al. 2014 — 2,3-3,1 g/kg LBM em cutting (2,4 escolhido no piso dessa janela)
- Dorgan et al. 1996 — gordura mínima 0,9 g/kg LBM para função hormonal
- Slater & Phillips 2011 — carbo como "restante calórico" na hierarquia
- IOM 2005 — fibra ≥20g, água 3-4 L/dia

---

## 🚀 v2.0.1 — Katch-McArdle + escala de atividade mais conservadora (2026-04-13)

**Motivação:** o cálculo default do app (Mifflin-St Jeor + escala de atividade Harris-Benedict padrão) estava dando TDEE mais alto do que o apropriado para perfis com BF% conhecido — especialmente pra Diego (118,3 kg, 33,5% BF). Exemplo: meta agressiva dava 2.328 kcal no app vs ~2.100 kcal em doc de referência, vs ~1.992 kcal numa escala ainda mais conservadora.

**Entrega:**
- **Katch-McArdle ativado** quando `profile.body_fat_pct` é preenchido. Fórmula: BMR = 370 + 21,6 × LBM (LBM = peso × (1 − BF%/100))
- **Escala de atividade nova, mais conservadora** — Harris-Benedict deslocada uma categoria pra baixo:
  - `sentado` = 1,0 (antes não existia)
  - `leve` = 1,2 (equivalente ao antigo `sedentario`)
  - `rotina` = 1,375 (equivalente ao antigo `sedentario_leve`, agora rotulado como "3-5x/semana")
  - `intenso` = 1,55 (equivalente ao antigo `moderado`)
  - `atleta` = 1,725 (equivalente ao antigo `alto`)
- **Migração automática de perfis legados v1** via `LEGACY_ACTIVITY_KEYS` + `resolveActivityKey`. Perfis antigos têm suas chaves migradas "uma categoria pra baixo", tornando automaticamente mais restritivos.
- **Novo campo opcional `body_fat_pct`** no onboarding (range 3-60%)
- **Fallback:** se BF% não preenchido, usa Mifflin-St Jeor como v1 (retrocompatível)
- **7 testes novos** (105/105 total): resolveActivityKey (3), Katch-McArdle (4), migração legacy
- **Teste nominal do Diego real** com Katch-McArdle + rotina + agressivo 30% → **1.992 kcal** (bate com a conta proposta)

**Impacto no alvo do Diego** (118,3 kg / 182 cm / 36a / 3x semana / BF 33,5% / agressivo 30%):
```
v1:      Mifflin + moderado 1,55 + 500 fixo → 2.826 kcal
v2.0:    Mifflin + moderado 1,55 + 30%      → 2.328 kcal
v2.0.1:  Katch + rotina 1,375 + 30%         → 1.992 kcal  ← atual
```

---

## 🚀 v2.0 — Dieta Escalável (2026-04-13)

**Motivação:** antes da v2.0, as 6 refeições diárias tinham macros hardcoded somando ~2.000 kcal, independente do target calculado. Usuários com TDEE alto (ex: 2.826 kcal) viam a barra de progresso travada em ~71% mesmo marcando tudo como comido — a dieta não escalava com a meta.

**Entrega:**
- Refeições fixas (café, lanche1, lanche2, pré-sono) agora são **derivadas de ingredientes estruturados × tabela nutricional por 100g**, não mais macros hardcoded
- Fator de escala `portionScale = meta_kcal / 2000` aplicado aos gramas, com arredondamento sensato: contáveis (ovos, fatias, scoops) ao inteiro mais próximo (mín 1), gramas puras a múltiplos de 5g (mín 5g)
- `INGREDIENTS` catalog estendido com `per100g` + `grams_per_un` para 9 alimentos (ovos, claras, pão integral, mussarela, cottage, banana prata, whey isolado, maçã, iogurte grego)
- `FIXED_MEAL_RECIPES` novo (data.js) com estrutura declarativa por refeição
- Helpers puros em data.js: `computePortionScale`, `scaleIngredient`, `scaleMealIngredients`, `computeMealMacros`, `renderMealFoodsText`, `renderIngredientLine`
- `getMeals()` (app.js) refatorado — constrói as 4 refeições fixas via `buildFixedMeal(id)` + `getPortionScale()`
- `updateDailyProgress()` mostra **indicador de saldo** (#diet-balance) com o gap kcal/P/C/G entre o plano do dia e a meta
- 19 testes novos (98/98 total) cobrindo scaling, rounding, derivação de macros, render de texto

**Limitações conhecidas (Phase 2 da v2.0):**
- Marmitas e jantares ainda são hardcoded (não escalam) — escalar afetaria shopping list/planner, precisa design separado
- Com só as refeições fixas escalando, o total ainda fica ~200-400 kcal abaixo do target pra usuários de TDEE alto. O saldo visível documenta esse gap; o usuário preenche com porções extras de marmita/lanche ou ajustes manuais

**Backup:** estado completo da v1 preservado em `/mnt/c/users/diego/Desktop/dieta-app-v1/` (sibling folder).


---

## 🎯 Visão Geral das Fases

| Fase | Foco | Status |
|---|---|---|
| 1 | Dívida técnica crítica (refactors que destravam o resto) | ✅ completa |
| 2 | Ativar o onboarding (cálculo dinâmico de macros) | ✅ completa |
| 3 | UX e interface | ⏳ pendente |
| 4 | Funcionalidades faltantes | ⏳ pendente |
| 5 | Acessibilidade e segurança | ⏳ pendente |

---

## ✅ Fase 1 — Dívida Técnica

### Item 1 — Consolidar receitas num modelo único ✅ **COMPLETO**

- [x] Normalizar chaves inconsistentes (`frango_cru` → `frango`, `alcatra_cru` → `alcatra`, `pao_fatias` → `pao_integral`)
- [x] Criar `INGREDIENTS` catalog com metadata (`label`, `unit`, `role`)
- [x] Helper `computeIngredientNeeds(marmitaPlan, dinnerPlan)` derivando necessidades do plano
- [x] `BREAKFAST_BASELINE` para demanda fixa do café/lanches
- [x] Refatorar `buildShoppingList` com `toBuy(key)` genérico (removeu ~20 cálculos hardcoded)
- [x] Corrigir unidades (atum em latas, tortilla em unidades)
- [x] Derivar `GEN_PROTEINS` automaticamente de `MARMITA_DEFS` + `INGREDIENTS`
- [x] Derivar `GEN_CARBS`
- [x] Derivar `GEN_DINNER_PROTEINS`
- [x] Derivar `GEN_SHARED_DINNER_PROTEINS` com `sharedHint` dinâmico
- [x] Derivar `GEN_DINNER_OTHERS` sem duplicar `GEN_CARBS`
- [x] Alface/rúcula/pepino derivados de `needs.alface`/`needs.pepino`

**Resultado:** mudar `frango: 215` → `frango: 220` num único lugar (`MARMITA_DEFS[0].ingredients.frango`) propaga para: lista de compras, gerador, receita, cap de ovos, pattern 2:1:1.

### Item 2 — Testes unitários do gerador ✅ **COMPLETO**

- [x] Extrair `computeMenuFromStock(stock, mode)` pure de `computeAndRenderMenu`
- [x] Criar `tests/test-runner.js` — harness sem dependências externas com sandbox VM + DOM stubado
- [x] Criar `tests/generator.test.js` — **38 testes cobrindo:**
  - `computeIngredientNeeds` (7)
  - mode=marmita/dinner/both (13)
  - Pattern ovos 2:1 Omelete/Torrada (5)
  - Proteínas exclusivas (3)
  - Fruit budget (2)
  - GEN_* derivations (5)
  - `computeAromatics` (3)
- [x] `package.json` com `npm test`

**Rodar:** `npm test` (dentro do diretório `dieta-app/`)

### Item 3 — Separar `index.html` em arquivos ✅ **COMPLETO**

- [x] **3A** Extrair `styles.css` (526 linhas, 25KB)
- [x] **3B** Extrair `data.js` (INGREDIENTS, MARMITA_DEFS, DINNER_DEFS, derivations, 536 linhas, 29KB)
- [x] **3C** Extrair `app.js` (render, auth, geração, 3435 linhas, 149KB)
- [x] Atualizar `test-runner.js` pra seguir `<script src>` automaticamente
- [x] `npm test` passa 38/38

**Resultado:** `index.html` caiu de 4838 → 353 linhas (~92% de redução), agora só estrutura HTML. FIXED_MEALS, computeAromatics, getMarmitaPlan/getDinnerPlan foram junto em `data.js`. BREAKFAST_BASELINE e WORKOUTS ficaram em `app.js` por estarem adjacentes a lógica que depende deles.

### Item 4 — Constantes de localStorage centralizadas ✅ **COMPLETO**

- [x] Criado `STORAGE_KEYS` em `data.js` com 15 chaves (planejamento, compras, treino, perfil/sessão)
- [x] Criado `STORAGE_PREFIXES` (meals/cardio) para chaves dinâmicas usadas em cleanup/backup
- [x] Substituídos todos os literais em `data.js` (2) e `app.js` (~96 call sites)
- [x] `SYNC_KEYS` e `BACKUP_KEYS` agora derivados de `STORAGE_KEYS` e declarados uma vez só em `data.js` (removidas cópias duplicadas de `app.js`)
- [x] `npm test` continua 38/38

**Resultado:** mudar uma chave (ex: `marmita_plan` → `marmitas_v2`) agora é uma edição de um único lugar em `data.js`. Sync + backup + export/import propagam automaticamente.

### Item 5 — Remover dead CSS ✅ **COMPLETO**

- [x] Removidas regras `.prep-day`, `.prep-day .day-header`, `.prep-day .day-content`, `.day-header.domingo/quarta/diario` de `styles.css` (10 linhas). `styles.css` agora tem 516 linhas.

---

## ⏳ Fase 2 — Ativar o Onboarding

### Item 6 — Cálculo dinâmico de macros via `user_profile` ✅ **COMPLETO** + 🔧 **estendido**

**Extensão (pós-entrega inicial):** déficit calórico configurável por intensidade.

- [x] `DEFICIT_INTENSITY_PCT` em `data.js` com 3 níveis: suave (15%) / moderado (20%) / agressivo (30%)
- [x] `computeGoals` lê `profile.deficit_intensity` e aplica percentual sobre TDEE quando está em perda
- [x] Fallback pro comportamento legado (−500 kcal fixo) quando `deficit_intensity` ausente — perfis antigos seguem funcionando sem migração
- [x] Ignorado em manutenção e ganho (só faz sentido em perda)
- [x] Novo campo `<select id="ob-deficit">` no modal de onboarding com "Moderado" pré-selecionado
- [x] `submitOnboarding` valida e persiste; `openEditProfile` pré-popula (default 'moderado' se legado)
- [x] 8 novos testes incluindo um nominal pro perfil real do usuário (118,3 kg / 182 cm / 36a / moderado / agressivo → 2.328 kcal) — 79/79 total



- [x] Fórmula Mifflin-St Jeor para BMR (M/F/O via constante −78 para "outro")
- [x] Multiplicador de atividade: sedentário 1.2, leve 1.375, moderado 1.55, alto 1.725
- [x] Déficit/superávit baseado em `meta_peso - peso_atual` com zona morta de ±0,5 kg
  - Perda: TDEE − 500 kcal
  - Ganho: TDEE + 300 kcal
  - Manutenção: TDEE
- [x] Piso de segurança: 1200 kcal/dia
- [x] Macros: proteína 2 g/kg, gordura 0,9 g/kg, carbo preenche o restante
- [x] `computeGoals(profile, today?)` pura em `data.js` (testável via `today` opcional)
- [x] `getGoals()` em `app.js` — lê perfil e cai em `DEFAULT_GOALS` se incompleto
- [x] `calculateAge` movido de `app.js` para `data.js` (removida duplicação)
- [x] `updateDailyProgress` usa targets dinâmicos
- [x] `renderDietHeader` atualiza "Meta: ~X kcal/dia | Objetivo: …" dinamicamente (`id="diet-goal-text"`)
- [x] `getGoalDirection(profile)` classifica loss/gain/maintain para o texto do header
- [x] 20 novos testes unitários cobrindo fórmulas, atividade, sexo, piso, zona de manutenção, edge cases (58/58 total)

### Item 7 — Editar perfil ✅ **COMPLETO**

- [x] Botão "Editar" no user-bar (ao lado de "Sair"), aparece só quando há perfil
- [x] `openEditProfile()` reabre o modal de onboarding pré-populado com os valores atuais
- [x] Modo controlado por `data-mode="create|edit"` no modal — close-x só aparece em edit
- [x] Título e botão viram "Editar Perfil" / "Salvar" em edit mode; restauram defaults ao fechar
- [x] Validação inline substituiu `alert()`: campo com `.error` (border vermelho + bg) + mensagem em `.ob-error.show`
- [x] Primeiro campo inválido recebe focus
- [x] `submitOnboarding` preserva `criado_em` em edit mode, chama `renderUserBar`/`renderDietHeader`/`renderWeightLog`/`updateDailyProgress` para propagar mudanças (ex: nova meta recalcula macros imediatamente)
- [x] Se o peso muda via edit, registra automaticamente uma entrada em `weight_log`

### Item 8 — Log de peso semanal ✅ **COMPLETO**

- [x] `STORAGE_KEYS.weightLog = 'weight_log'` — array de `{ date, peso }` deduplicado por dia
- [x] Helpers puros em `data.js`: `normalizeWeightLog`, `addWeightEntry`, `daysBetweenDates`, `WEIGHT_LOG_MAX=52`
- [x] Card "Evolução do Peso" na aba Dieta (após o daily tracker), escondido se não há perfil
- [x] Gráfico SVG inline: polyline do peso + linha de meta pontilhada verde + labels min/max/datas
- [x] Card mostra atual + meta + delta ("X,X kg abaixo/acima/na meta") com cor por direção
- [x] Últimas 3 entradas em pílulas compactas abaixo do gráfico
- [x] Input + botão "Registrar" sincroniza com `profile.peso_atual`
- [x] Auto-sugestão semanal: se a última entrada tem ≥7 dias (ou nunca registrou), exibe hint laranja no topo do card
- [x] 13 novos testes para o logic puro (71/71 total)

---

## ⏳ Fase 3 — UX e Interface

### Item 9 — User-bar compacto no mobile

Atualmente: `Nome Sobrenome | XX anos | Peso atual: XX,X kg | Meta de peso: YY,Y kg` — muito texto para 40px.

- [ ] Reduzir para duas linhas ou abreviar
- [ ] Formato proposto: `Nome · XX anos` (linha 1) + `XX,X → YY,Y kg` (linha 2)

### Item 10 — Reorganizar modal do Gerador de Cardápio

Atualmente 7 seções num modal 80vh com scroll infinito. Seletor de modo (marmita/jantar) aparece só depois de clicar.

- [ ] Mode picker sticky no TOPO do modal (checkboxes sempre visíveis)
- [ ] Accordion por seção (Proteínas / Carbos / Jantares / Outros / Lanches / Frutas)
- [ ] Indicador visual em cada seção (bolinha quando há valor preenchido)
- [ ] Remover pop-up intermediário de "Confirmar modo"

### Item 11 — Modal customizado substituindo `confirm()`

- [ ] Helper `showConfirmDialog(title, body, { onConfirm, onCancel, variant: 'danger' })`
- [ ] Modal customizado com branding (z-index acima do history-modal)
- [ ] Substituir todos os `confirm()` no código (~5-6 ocorrências)

### Item 12 — Validação inline no onboarding

- [ ] Borders vermelhas em campos inválidos
- [ ] Mensagens de erro abaixo de cada campo
- [ ] Botão "Salvar e Continuar" fica desabilitado até tudo válido
- [ ] Substituir `alert()` atual

### Item 13 — Dark mode

- [ ] Variáveis CSS secundárias `[data-theme="dark"]`
- [ ] Toggle em alguma aba ou no user-bar
- [ ] Persistir escolha em `localStorage.theme`
- [ ] Respeitar `prefers-color-scheme` como default

### Item 14 — Cards compactos no planner

Cada card tem ~200px (composição + macros + botão receita). Usuário rola muito.

- [ ] Modo compacto: só nome + macros + stepper
- [ ] Expand opcional ao clicar (mostra composição + receita)
- [ ] Toggle "compacto/detalhado" no header da seção

---

## ⏳ Fase 4 — Funcionalidades Faltantes

### Item 15 — Estoque com validade / log de compras ❌ **WON'T DO**

**Decisão (2026-04-13):** não implementar. Validade de alimentos depende de critérios sanitários que variam por embalagem, método de armazenamento, temperatura de geladeira, lote e manuseio após abertura. O app não tem dados nem autoridade pra fazer alertas confiáveis, e um alerta errado pode induzir o usuário a consumir algo vencido ou descartar algo bom. Fora do escopo.

### Item 16 — Substituições manuais na lista de compras

- [ ] Permitir marcar item como "comprei outro no lugar" com texto livre
- [ ] Guardar log de substituições para análise futura

### Item 17 — Estatísticas do histórico semanal ✅ **COMPLETO** (v2.1.48)

- [x] Gráfico: média de kcal/dia por semana (barras horizontais, últimas 12)
- [x] Top 3 marmitas + top 3 jantares mais frequentes
- [x] Desvio vs macros da meta atual (colorido por severidade)

### Item 18 — Variedade sugerida ao longo do tempo ❌ **WON'T DO**

**Decisão (2026-04-13):** não implementar. O usuário prefere controlar manualmente o que cozinha — sugestões automáticas podem ser intrusivas e contradizer preferências circunstanciais (ex: "essa semana só tenho tempo pra uma receita"). O gerador de cardápio já permite planejar a semana considerando estoque em casa, que é o caminho de personalização preferido.

---

## ⏳ Fase 5 — Acessibilidade e Segurança

### Item 19 — Acessibilidade básica

- [ ] `aria-label` em todos os botões icônicos (X, steppers, tabs)
- [ ] Focus trap nos modais (Tab ciclando dentro do modal)
- [ ] Atalhos de teclado (Esc fecha modal, Enter confirma, arrows em steppers)
- [ ] Focus indicators visíveis (borders 2px azul)

### Item 20 — Contraste WCAG AA

- [ ] Auditar todas as combinações fg/bg
- [ ] Corrigir casos que falham (especialmente `gray-mid` sobre `gray-bg`)
- [ ] Adicionar variantes high-contrast se necessário

### Item 21 — Firestore Security Rules

- [ ] Verificar rules atuais no console do Firebase
- [ ] Garantir que `users/{uid}/data/*` só é acessível pelo próprio usuário
- [ ] Testar leitura/escrita não autenticada (deve falhar)

### Item 22 — Decisão sobre criptografia

- [ ] Decidir se dados de saúde (peso, altura, sexo) merecem criptografia no Firestore
- [ ] Para uso pessoal: provavelmente OK sem. Documentar a decisão.

---

## 📌 Notas de Contexto (para retomada)

### Arquitetura atual
- **PWA sem build tools** — HTML/CSS/JS servidos diretamente pelo GitHub Pages
- Single `index.html` (~4300 linhas) + `sw.js` + ícones PNG + `manifest.json` + `styles.css` (recém extraído)
- **Firebase**: auth (Google) + Firestore para sync. API key exposta (restricted via rules)
- **localStorage**: fonte de verdade primária; Firestore sincroniza em background
- **Deploy**: `git push` no repo `dferreiraeco/dieta-app` → GitHub Pages atualiza em ~1 min

### Comandos importantes
```bash
# Rodar testes
cd /mnt/c/users/diego/Desktop/dieta-app
npm test

# Validar sintaxe JS do index.html
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=h.match(/<script(?!\\s+src)[^>]*>([\\s\\S]*?)<\\/script>/g);let js='';m.forEach(s=>{js+=s.replace(/<script[^>]*>/,'').replace(/<\\/script>/,'');});new Function(js);console.log('OK');"

# Bump SW version (após qualquer mudança)
# Editar sw.js: const CACHE_NAME = 'dieta-vNNN';
```

### Preferências do usuário
- **Não commitar automaticamente** — aguardar instrução explícita ("commit" / "faz o commit" / "taca fogo")
- Usa o app em `file://` local pra testar antes de deploy
- Receitas são pra 2 pessoas (casal)
- Não come leguminosas, legumes (exceto pepino), só folhas

### Decisões técnicas já feitas
- **IDs das receitas:** mantém A-F (marmitas) e O/T/C/A/S/W (jantares), separados em objetos distintos (marmitaResult vs dinnerResult). Colisão (A marmita + A jantar) só é preocupação visual, não bug.
- **Frango compartilhado:** `dinnerAlt='S'` (Sanduíche Natural, 134g) — dinner com menor raw → máxima flexibilidade
- **Ovos compartilhados:** tratados via cap pós-processamento, pattern 2:1 (2 Omelete : 1 Torrada)
- **Frango dinners:** pattern 2:1:1 (S : W : T) só ativa se houver tortilla ou goma no estoque
- **Arroz branco ↔ integral:** perfeitamente substituíveis, pool de estoque na lista de compras
- **Frutas:** budget em **gramas de carbo** (42 × 16,2 ≈ 680g/semana), não em porções
- **Aromatics dinâmicos:** alho (1 cabeça = 10 dentes exatos), cebola, limão, tomate, polpa de tomate — escalonados por `scale = plan / yield`

### Feature flags / constantes mágicas
- `BREAKFAST_BASELINE = { ovos: 56, pao_integral: 14, mussarela: 280, iogurte_grego: 1820 }` — 14 cafés e 14 lanches da tarde por semana para 2 pessoas
- `FRUIT_WEEKLY_CARB_NEED = 680` — 42 porções × 16,2g avg carbs
- `PEPINO_PER_UN = 150g`, `ALFACE_PER_HEAD = 200g`, `RUCULA_PER_MAÇO = 100g`
- Proporção folhas: ~60% alface + ~40% rúcula

### Scripts e ferramentas
- `tests/test-runner.js` — sandbox VM + DOM stubs + mini TestHarness
- `tests/generator.test.js` — 38 testes
- `package.json` — só `"test": "node tests/generator.test.js"`, zero deps
