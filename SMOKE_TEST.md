# Smoke Test E2E — DietPLAN

Checklist de validação completa antes de marcar a **Fase 0 como 100% concluída** e abrir o app pros primeiros usuários externos.

**Como usar:** rode cada cenário no seu celular (preferencialmente PWA instalado) marcando `[x]` nos itens que passam. Anote qualquer coisa estranha no final do arquivo.

**Duração estimada:** 30-45 minutos pro checklist completo.

**Estado inicial:** use um dispositivo/navegador **novo** ou limpe completamente o cache e dados do DietPLAN antes de começar (Configurações do navegador → Dados do site → Apagar).

---

## Cenário 1 — Primeiro acesso (usuário novo, modo sem conta)

- [ ] Abre o app pela primeira vez → **auth screen aparece** com logo, título "DietPLAN", descrição e 3 opções (Google / Email / Sem conta)
- [ ] Clica em **"Saiba mais sobre o DietPLAN"** → seção expande mostrando "Pra quem é" (verde) e "Pra quem NÃO é" (vermelho) + links de Termos/Privacidade
- [ ] Clica em **"Termos de Uso"** → modal abre instantaneamente com o conteúdo formatado (título, seções, tabelas)
- [ ] Fecha e clica em **"Política de Privacidade"** → mesmo comportamento
- [ ] Fecha e clica em **"Continuar sem conta"** → app entra direto, modal de onboarding aparece
- [ ] No onboarding, deixa campos obrigatórios em branco e tenta salvar → **erros inline** aparecem nos campos faltantes
- [ ] Preenche nome/sobrenome/sexo/nascimento/peso/altura/meta normalmente
- [ ] **Clica no "?" ao lado de "Gordura corporal %"** → tooltip expande com valores típicos e como medir
- [ ] Clica no "?" ao lado de "Nível de atividade física" → tooltip expande com exemplos por faixa
- [ ] Seleciona atividade e **clica no "?" ao lado de "Intensidade do déficit"** → tooltip expande
- [ ] Confirma que o select do déficit só mostra **3 opções** (Suave, Moderado, Agressivo) — sem "Extremo"
- [ ] **Marca o checkbox "Habilitar modo avançado"** → opção "Extremo" aparece no select + warning vermelho aparece abaixo
- [ ] Desmarca o checkbox → "Extremo" some, warning some, e se estava selecionado volta pra "Moderado"
- [ ] Salva perfil → onboarding fecha, app vai pra aba Marmitas
- [ ] **Tour walkthrough dispara automaticamente** após ~1s
- [ ] Clica em "Próximo" nos 7 passos (Welcome → Marmitas → Compras → Dieta → Treino → Agenda → Final)
- [ ] Cada passo mostra **imagem ilustrativa, título, texto e indicador de progresso** (1/7, 2/7...)
- [ ] Durante os passos 2-6, a tab ativa muda e o botão da tab correspondente fica **destacado com spotlight verde**
- [ ] No passo 7 (final), clica em "Concluir" → tour fecha

---

## Cenário 2 — Cadastro via email/senha (fluxo LGPD completo)

- [ ] Faz logout → volta pra auth screen
- [ ] Clica **"Entrar com email"** → formulário abre
- [ ] Clica em **"Criar conta"** (toggle na parte de baixo)
- [ ] Verifica que aparecem:
  - Campo email
  - Campo senha
  - Campo confirmar senha
  - **3 checkboxes de consentimento** (Termos+Privacidade / 18+ / Dados de saúde)
- [ ] Tenta criar conta sem marcar os checkboxes → botão **"Criar conta" fica desabilitado**
- [ ] Marca só o primeiro checkbox → botão continua desabilitado
- [ ] Marca todos os 3 → botão fica ativo
- [ ] Clica nos links de Termos e Privacidade dentro do checkbox → modal abre com conteúdo
- [ ] Preenche email, senha (mínimo 6 caracteres) e confirma
- [ ] Clica "Criar conta" → conta criada
- [ ] **Verifica email recebido** com link de verificação do Firebase Auth
- [ ] App entra direto sem pedir consentimento novamente (signup já marcou)
- [ ] **Consent modal NÃO aparece** (ponto crítico — corrigido em v2.1.74)
- [ ] Onboarding aparece (novo usuário) → preenche e salva
- [ ] Tour dispara automaticamente → completa ou pula

---

## Cenário 3 — Cadastro via Google OAuth

- [ ] Faz logout → volta pra auth screen
- [ ] Clica **"Entrar com Google"** → popup/redirect OAuth do Google
- [ ] Autoriza com conta Google que nunca usou no app
- [ ] Volta pro app → **consent modal blocante aparece** com 3 checkboxes
- [ ] Não consegue fechar o modal de outra forma além de "Aceitar" ou "Sair"
- [ ] Tenta aceitar sem marcar todos → botão "Aceitar e continuar" desabilitado
- [ ] Marca os 3 → botão ativo
- [ ] Clica "Aceitar e continuar" → app libera, onboarding aparece
- [ ] Faz logout e loga de novo com a **mesma conta Google**
- [ ] **Consent modal NÃO aparece de novo** (registro persistido)
- [ ] Dados do perfil carregam do Firestore (sync)

---

## Cenário 4 — Uso funcional das 5 abas

### Aba Marmitas

- [ ] Vê seção "Almoços da Semana" com cards de cada dia
- [ ] Clica em um dia → popup de seleção de marmita
- [ ] Escolhe uma marmita → card atualiza com a escolha
- [ ] Vê seção "Jantares da Semana" (roxo)
- [ ] Clica em um dia → seleciona um jantar
- [ ] Testa **"Gerador de Cardápio"** → abre modal, preenche restrições básicas, gera
- [ ] **"Limpar Planejamento Semanal"** (vermelho) apaga tudo após confirmar

### Aba Compras

- [ ] Lista de compras é populada automaticamente a partir do cardápio
- [ ] Marca alguns itens como comprados → check fica verde
- [ ] Adiciona uma substituição customizada em algum item
- [ ] Estoque em casa mostra itens existentes

### Aba Dieta

- [ ] Header mostra "Meta: ~X kcal/dia*" com **asterisco vermelho**
- [ ] Donut de progresso diário mostra macros (proteína, carbo, gordura)
- [ ] Clica em ⓘ "Detalhes" → modal com breakdown do cálculo BMR/TDEE
- [ ] Marca refeições do dia → donut atualiza progresso
- [ ] Rola até o final da aba → vê **card de disclaimer médico** com o asterisco vermelho + link pros Termos
- [ ] Botão "Resetar Dia" no fim da aba (vermelho) limpa as refeições marcadas

### Aba Treino

- [ ] Tabs A/B visíveis
- [ ] Seleciona treino A → lista de exercícios aparece
- [ ] Marca repetições e pesos em alguns exercícios
- [ ] Valores persistem ao trocar pra treino B e voltar
- [ ] Registra cardio do dia
- [ ] **"Limpar Treino de Hoje"** (vermelho) reseta após confirmar

### Aba Agenda

- [ ] Calendário mensal aparece com dots coloridos marcando atividades
- [ ] Clica em um dia passado → day detail com histórico daquele dia
- [ ] Navega entre meses com as setas
- [ ] Weight log card mostra histórico de peso (se foi adicionado)
- [ ] Adiciona nova entrada de peso → gráfico atualiza

---

## Cenário 5 — Direitos LGPD (profile view)

- [ ] Clica no avatar (canto superior direito) → profile view modal abre
- [ ] Vê seção **"Privacidade e Dados (LGPD)"** com 3 botões:
  - 📤 Exportar meus dados (JSON)
  - 📥 Importar backup (JSON)
  - 🗑 Apagar minha conta
- [ ] Clica **"Exportar meus dados"** → download de `dietplan-meus-dados-YYYY-MM-DD.json` inicia
- [ ] Abre o JSON em editor → confirma presença de:
  - `_app: 'dieta-diego'`
  - `app_name: 'DietPLAN'`
  - `app_version`, `terms_version`, `privacy_version`
  - `user` com uid/email/provider
  - Todas as `STORAGE_KEYS` com dados
- [ ] Vê seção **"Ajuda e Contato"** com botões:
  - 🧭 Refazer tour do app
  - ✉ Falar com o suporte (mailto)
  - 📄 Termos de Uso
  - 🔒 Política de Privacidade
- [ ] Clica "Refazer tour do app" → profile fecha, tour começa do zero
- [ ] Clica "Termos de Uso" → modal legal abre corretamente
- [ ] Clica "Falar com o suporte" → email client abre com `[SUPORTE]` pré-preenchido

---

## Cenário 6 — Apagar conta (exclusão real com re-auth)

- [ ] Profile view → clica **"Apagar minha conta"**
- [ ] Primeira confirmação (customConfirm) aparece com aviso completo → clica "Continuar"
- [ ] Segunda confirmação (última chance) aparece → clica "Sim, apagar tudo"
- [ ] Se for conta email/senha: **prompt de senha** aparece → digita senha correta
- [ ] Se for conta Google: **popup OAuth** aparece pra re-auth
- [ ] Após re-auth bem-sucedida: conta apagada + localStorage limpo + reload
- [ ] App volta pra auth screen
- [ ] Tenta logar com o mesmo email → **"Email não encontrado"** (conta realmente foi apagada)
- [ ] Verifica no Firebase Console → Authentication → conta não está mais listada
- [ ] Verifica no Firestore Console → documento `users/{uid}/data/*` não existe

---

## Cenário 7 — Importar backup

- [ ] Cria nova conta (email ou Google)
- [ ] Profile view → **"Importar backup (JSON)"** → seleciona o JSON exportado no Cenário 5
- [ ] Confirma o aviso de substituição de dados
- [ ] Após import: perfil, cardápio, histórico todos restaurados
- [ ] Navega nas abas pra confirmar que os dados estão lá

---

## Cenário 8 — Dark mode

- [ ] Profile view → Aparência → clica **"Escuro"**
- [ ] Tema muda imediatamente pra dark
- [ ] Todos os textos legíveis, contraste ok
- [ ] Cards, modais, botões renderizam corretamente no dark mode
- [ ] Volta pra "Claro" → tema volta
- [ ] Testa "Auto" → segue o tema do sistema operacional

---

## Cenário 9 — Offline / PWA install

- [ ] Ativa airplane mode no celular
- [ ] App continua funcionando (dados locais via IndexedDB + localStorage)
- [ ] Faz mudanças offline (marca refeições, adiciona peso)
- [ ] Reativa internet → sync automático pro Firestore
- [ ] Instala o app como PWA (Chrome Android: menu → "Instalar app")
- [ ] Ícone aparece na tela inicial
- [ ] Abre via ícone → app roda em modo standalone (sem barra do navegador)

---

## Cenário 10 — Segurança

- [ ] Firebase Console → Firestore → Rules Playground
- [ ] Testa: usuário A tentando ler dados do usuário B → **deny**
- [ ] Testa: acesso sem auth → **deny**
- [ ] Testa: acesso ao próprio `users/{uid}/data/*` → **allow**
- [ ] Abre DevTools no browser do app → inspeciona `localStorage`
- [ ] Confirma que os dados de saúde estão presentes (comportamento esperado — criptografia em repouso é feita pelo SO/navegador)
- [ ] Rede → confirma que todas as requisições são **HTTPS** (TLS 1.2+)
- [ ] Rede → confirma que **não há chamadas pra analytics, pixels ou terceiros** além de Firebase

---

## Notas e bugs encontrados

> Anote aqui qualquer comportamento estranho, bug ou ajuste necessário. Mesmo que seja menor, ajuda a ter um registro antes do soft launch.

-
-
-

---

## Conclusão

Se **todos os cenários passarem**:

- [ ] Marcar Fase 0 como **100% ✅** no `EXPANSION_STRATEGY.md`
- [ ] Commitar este `SMOKE_TEST.md` com `[x]` em todos os itens como evidência
- [ ] Avançar pra **Fase 1 — Soft launch interno** (listar candidatos a beta testers)

Se algum cenário falhar:

- [ ] Abrir item no backlog (inline no doc ou commit separado)
- [ ] Corrigir antes de avançar
- [ ] Re-rodar o cenário afetado

---

**Última execução:** — (preencher com data quando rodar)
**Versão testada:** — (preencher com `v2.1.XX`)
**Dispositivo:** — (ex: iPhone 13 Safari PWA standalone)
