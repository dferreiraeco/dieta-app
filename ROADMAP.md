# Dieta App — Roadmap de Evolução

Documento vivo com o que está feito, em andamento e pendente. Atualize conforme o trabalho avança.

Origem: análise crítica feita em abril/2026 cobrindo 33+ pontos de dívida técnica, UX e funcionalidade. Execução em 5 fases, ponto a ponto.

---

## 🎯 Visão Geral das Fases

| Fase | Foco | Status |
|---|---|---|
| 1 | Dívida técnica crítica (refactors que destravam o resto) | 🟡 em andamento |
| 2 | Ativar o onboarding (cálculo dinâmico de macros) | ⏳ pendente |
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

### Item 4 — Constantes de localStorage centralizadas ⏳ **PENDENTE**

- [ ] Criar `const STORAGE_KEYS = { marmitaPlan: 'marmita_plan', ... }` em `data.js`
- [ ] Substituir literais `'marmita_plan'`, `'dinner_plan'`, etc. por `STORAGE_KEYS.marmitaPlan` (~75 call sites em `app.js` + 2 em `data.js`)
- [ ] Listas `SYNC_KEYS` e `BACKUP_KEYS` derivadas de `STORAGE_KEYS`

### Item 5 — Remover dead CSS ✅ **COMPLETO**

- [x] Removidas regras `.prep-day`, `.prep-day .day-header`, `.prep-day .day-content`, `.day-header.domingo/quarta/diario` de `styles.css` (10 linhas). `styles.css` agora tem 516 linhas.

---

## ⏳ Fase 2 — Ativar o Onboarding

### Item 6 — Cálculo dinâmico de macros via `user_profile`

O onboarding coleta nome, sobrenome, sexo, data de nascimento, peso, altura, meta, atividade — mas nada disso é usado. `GOALS` está hardcoded (`{ kcal: 2000, p: 190, c: 150, g: 70 }`).

- [ ] Fórmula Mifflin-St Jeor para BMR (varia por sexo)
- [ ] Multiplicador de atividade: sedentário 1.2, leve 1.375, moderado 1.55, alto 1.725
- [ ] Déficit/superávit baseado na direção da meta (`meta_peso - peso_atual`)
  - Perda: 500 kcal abaixo do TDEE (~0,5 kg/semana)
  - Ganho: 300 kcal acima
- [ ] Macros: proteína 2 g/kg, gordura 0,8-1 g/kg, carbo preenche o restante
- [ ] Substituir `GOALS` constante por função `computeGoals(profile)` chamada dinamicamente
- [ ] Atualizar display na aba Dieta (barras de progresso kcal/P/C/G) pra refletir os novos targets
- [ ] Atualizar seção "Meta: ~2.000 kcal/dia" do header da aba Dieta

### Item 7 — Editar perfil

- [ ] Botão "Editar Perfil" em algum lugar (user-bar? nova aba Configurações?)
- [ ] Reabrir o modal de onboarding pré-populado com os valores atuais
- [ ] Validação inline nos campos (borders vermelhas + mensagem) em vez de `alert()`

### Item 8 — Log de peso semanal

- [ ] Nova chave `weight_log` no localStorage (array de `{ date, peso_kg }`)
- [ ] UI para registrar peso atual (campo + botão em algum lugar)
- [ ] Mini-gráfico de linha (canvas ou SVG inline) mostrando evolução vs `meta_peso`
- [ ] Auto-sugestão: a cada semana, pede pro usuário registrar o peso atual
- [ ] Atualizar `profile.peso_atual` quando registra novo peso

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

### Item 15 — Estoque com validade / log de compras

Hoje `home_stock` é snapshot único. Sem noção de quando foi comprado, sem validade.

- [ ] Estrutura: `home_stock[key] = { qty, added_at, expires_at? }`
- [ ] UI para registrar data de compra opcional
- [ ] Alerta quando item próximo da validade

### Item 16 — Substituições manuais na lista de compras

- [ ] Permitir marcar item como "comprei outro no lugar" com texto livre
- [ ] Guardar log de substituições para análise futura

### Item 17 — Estatísticas do histórico semanal

`marmita_history` é salvo mas só visualização básica.

- [ ] Gráfico: média de kcal/semana ao longo do tempo
- [ ] Marmitas mais frequentes (top 3)
- [ ] Desvio vs macros da meta

### Item 18 — Variedade sugerida ao longo do tempo

6 marmitas + 6 jantares = monotonia no longo prazo.

- [ ] Rastrear frequência de cada marmita nas últimas 4 semanas
- [ ] Sugestão: "Você comeu Frango 8× nas últimas 2 semanas. Que tal variar?"
- [ ] Seletor de "modo variedade" no gerador: prefere marmitas com menor frequência recente

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
