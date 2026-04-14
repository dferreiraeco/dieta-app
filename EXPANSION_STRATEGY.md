# DietPLAN — Estratégia de Expansão Pública

Documento vivo para expandir o app de uso familiar (2 pessoas) para uma base de usuários mais ampla. Atualize o status de cada item conforme progride.

**Criado:** 2026-04-13 (v2.1.68)
**Status global:** 🟡 Fase 0 em progresso — Sprint 0B (docs legais) drafts concluídos, aguardando integração no app
**Última atualização:** 2026-04-13 (PRIVACY.md e TERMS.md draftados com sac.dietplan@gmail.com)

---

## 📋 Como usar este documento

- **Marque os checkboxes** à medida que completa cada item
- **Status de cada item:** `⏳ pendente`, `🔄 em progresso`, `✅ concluído`, `⚠ bloqueado`, `❌ descartado`
- **Atualize o "Status global"** no topo conforme avança entre fases
- **Não pule fases** — cada fase é pré-requisito da próxima. Tentar abrir pro público sem Fase 0 vai dar problema legal/operacional.
- **Decisões ficam registradas** na seção "Decisões tomadas" no final

---

## 🎯 Visão geral das fases

| Fase | Objetivo | Usuários esperados | Duração estimada | Status |
|---|---|---|---|---|
| **0** | Hardening legal + técnico mínimo | 0 (interno) | 1-2 dias de trabalho | 🔄 em progresso |
| **1** | Soft launch interno | 5-20 conhecidos | 2-4 semanas de uso real | ⏳ pendente |
| **2** | Expansão controlada | 50-200 amigos de amigos | 1-2 meses | ⏳ pendente |
| **3** | Aberto ao público | sem limite | contínuo | ⏳ pendente |

**Pré-requisito absoluto:** Fase 0 100% completa antes de qualquer link ser passado pra fora do círculo familiar imediato.

---

## Fase 0 — Hardening pré-expansão

**Objetivo:** deixar o app pronto pra terceiros sem expor você legalmente nem deixar usuários frustrados/inseguros. Nenhum item desta fase é opcional.

**Critério de conclusão:** todos os checkboxes desta fase marcados.

### 0.1 — Legal / Compliance LGPD

- [x] **Política de Privacidade** escrita — `PRIVACY.md` v1.0 (2026-04-13)
  - ✅ Cobre: dados coletados por modo (sem conta / email / Google), finalidade, base legal LGPD, compartilhamento Firebase/Google, direitos do titular (Art. 18), retenção, contato DPO
  - ⏳ Pendente: link no footer do auth screen + profile view modal (Sprint 0B continuação)

- [x] **Termos de Uso** escritos — `TERMS.md` v1.0 (2026-04-13)
  - ✅ Disclaimer médico forte no topo (quem não deve usar, contraindica grávidas/menores/condições crônicas)
  - ✅ Limitação de responsabilidade (seção 10), gratuidade, uso aceitável, propriedade intelectual
  - ✅ Foro: comarca do domicílio do usuário (CDC Art. 101, I)
  - ⏳ Pendente: link no footer do auth screen + profile view modal

- [ ] **Consentimento explícito no cadastro**
  - Checkbox obrigatório: "Li e aceito os [Termos] e [Política de Privacidade]"
  - Checkbox adicional (opcional mas recomendado): "Autorizo o processamento dos meus dados de saúde (peso, altura, composição corporal) para os fins descritos na Política"
  - Só habilita o botão "Criar conta" após os dois marcados
  - Data do aceite salva junto com o perfil (`profile.accepted_terms_at`, `profile.accepted_privacy_at`, versão dos termos)

- [ ] **Disclaimer médico visível**
  - Badge ou banner na auth screen: "Este app não substitui aconselhamento médico ou nutricional"
  - Também na aba Dieta, próximo à meta calórica
  - Texto mais completo no modal de "Detalhes do cálculo"

- [ ] **Direito de apagamento (account deletion) real**
  - Hoje `resetAllData` limpa dados mas deixa a conta Firebase Auth existindo
  - Implementar: botão "Apagar minha conta" no profile view modal
  - Ação: deletar todos os docs em `users/{uid}/data/*` no Firestore + `auth.currentUser.delete()` no Firebase Auth
  - Tratar `auth/requires-recent-login` (usuário pode precisar reautenticar)
  - Confirmação dupla via customConfirm

- [ ] **Direito de acesso / portabilidade**
  - Hoje já temos `exportShoppingPDF` mas não export completo dos dados
  - Implementar: botão "Exportar meus dados" no profile view
  - Ação: gera JSON com todos os STORAGE_KEYS + downloadable
  - Formato legível (não só blob criptografado)

- [ ] **Contato do responsável (DPO informal)**
  - Um email público de contato para exercer direitos LGPD
  - Pode ser seu email pessoal ou um Gmail dedicado
  - Colocar nos Termos e Política
  - Tempo de resposta prometido: 15 dias (conforme LGPD Art. 18 §3)

### 0.2 — Segurança técnica

- [ ] **Email verification ligado no signup**
  - Hoje `createUserWithEmailAndPassword` não envia verification
  - Implementar: `auth.currentUser.sendEmailVerification()` logo após signup
  - UI: mensagem "Verifique seu email antes de usar" (pode permitir usar mas lembrar)
  - Ou bloquear features sensíveis até verificar

- [ ] **Firestore Security Rules reforçadas** (já feito Fase 5 ✅)
  - Confirmação: rules atuais já isolam por uid (Item 21 roadmap ✅)
  - Não precisa mudança

- [ ] **Rate limiting de signup**
  - Firebase Auth já tem basic rate limit nativo (bloqueia ~100 signups/hora do mesmo IP)
  - Não precisa implementação adicional pra fase 0
  - Se abrir pro público, considerar reCAPTCHA v3 no signup

- [ ] **Sanitização de input**
  - Audit rápido nos lugares onde usuário digita texto livre:
    - `shop_subs` (text livre)
    - `profile.nome`, `profile.sobrenome`
    - `home_stock` entries (labels)
  - Garantir que nada é interpolado como HTML sem escape
  - Hoje uso template literals com `${}` — mas em alguns places uso innerHTML sem DOMParser. Verificar.

- [ ] **Reavaliação da decisão de criptografia**
  - Com usuários externos, revisitar SECURITY.md seção 2
  - Decisão provável: manter sem E2E mas documentar no Termos de Uso
  - Atualizar o "Triggers de reavaliação" com a data atual

### 0.3 — Produto / UX para estranhos

- [ ] **Landing page / home explicativa**
  - Antes do login, ou mesmo no login, explicar o que o app faz
  - Screenshots ou gif curto
  - "Para quem é": pessoas fazendo recomposição corporal com cardápio planejado
  - "Para quem NÃO é": pessoas que precisam de aconselhamento profissional

- [ ] **Tour/walkthrough no primeiro uso**
  - Pode ser tooltips sequenciais, overlay de boas-vindas, ou um modal multi-step
  - Cobrir: tabs principais, como adicionar marmita, como gerar cardápio, onde fica o perfil

- [ ] **Disclaimer forte na aba Dieta**
  - Já existe tooltip "ⓘ Detalhes" → expandir com aviso explícito
  - Destacar que é estimativa baseada em fórmulas, não prescrição

- [ ] **Defaults mais conservadores pra metas**
  - Hoje o usuário pode marcar déficit de 40% ("extremo")
  - Considerar: esconder o 40% por default, mostrar só com "modo avançado"
  - Ou: adicionar warning explícito ao selecionar extremo
  - Decidir baseado no público alvo

- [ ] **Onboarding mais guiado**
  - Hoje pede LBM, BF%, fator H-B — termos técnicos
  - Adicionar ajuda contextual (tooltip ao lado de cada campo)
  - Glossário rápido: "BF%: percentual de gordura corporal — se não souber, deixe em branco"

- [ ] **Feedback canal**
  - Botão "Reportar bug / sugerir feature" no profile view
  - Link para um form (Google Forms, Typeform, ou email mailto)

### 0.4 — Operacional

- [ ] **Firebase plano Blaze ativo**
  - Free tier aguenta ~50-100 usuários ativos
  - Blaze (pay-as-you-go) libera scaling e você paga só o que exceder
  - Configurar alerta de billing em $10/mês pra não ter surpresa

- [ ] **Monitoramento básico**
  - Firebase Console → Authentication → Users (ver quantos estão ativos)
  - Firestore → Usage tab (ver reads/writes diários)
  - Não precisa Sentry/LogRocket nesta fase

- [ ] **Backup strategy documentada**
  - Firestore tem backup automático em projetos Blaze
  - Documentar onde/quando/como restaurar
  - Adicionar em SECURITY.md

### 0.5 — Decisões tomadas (2026-04-13)

- [x] **Público-alvo geográfico: Brasil only**
  - PT-BR suficiente, sem i18n
  - Impacto: elimina ~1-2 semanas de trabalho de internacionalização
  - Pode revisitar se houver demanda de fora do BR

- [x] **Modelo de receitas: fixo agora, custom futuro**
  - Mantém as 6 marmitas + 6 jantares atuais como core da Fase 0-3
  - Custom recipes vira item de evolução **pós-expansão** (Fase 4+ ou novo roadmap)
  - Impacto: não bloqueia Fase 0. Nenhum refactor grande agora.
  - Caveat: usuários vão perceber o limite. Adicionar texto nos termos/FAQ explicando "por enquanto, as refeições são fixas; custom virá em breve".

- [x] **Modelo de negócio: gratuito 100%**
  - Sem monetização (doação, freemium, assinatura — nada agora)
  - Custo Firebase sai do bolso do desenvolvedor (~$0-5/mês pra até 100-200 usuários ativos)
  - Termos de Uso deixam claro "software gratuito, sem garantia, best-effort"
  - Impacto: elimina complexidade de billing, payment integration, tiers
  - Revisitar se custo Firebase virar problema real

- [x] **DPO / ponto de contato: `sac.dietplan@gmail.com`** ✅ criado 2026-04-13
  - Já embutido em:
    - ✅ `PRIVACY.md` (seção 13 — Contato)
    - ✅ `TERMS.md` (seção 15 — Contato)
  - Ainda falta aparecer em:
    - ⏳ Auth screen footer
    - ⏳ Profile view modal (botão "Ajuda / Contato")
  - Tempo de resposta prometido: **15 dias** (conforme LGPD Art. 18 §3)
  - Assuntos padronizados: `[SUPORTE]`, `[BUG]`, `[LGPD]`, `[CONTA]`, `[JURÍDICO]`

---

## Fase 1 — Soft launch interno (5-20 usuários)

**Objetivo:** validar que o app funciona com usuários reais que não são você. Pegar bugs, feedback de UX, entender custo Firebase real.

**Pré-requisito:** Fase 0 100% ✅

**Critério de conclusão:** 5-20 usuários ativos há 2+ semanas sem bugs críticos não resolvidos.

### 1.1 — Preparação

- [ ] **Listar candidatos a beta testers**
  - Pessoas conhecidas que você confia dar feedback honesto
  - Preferência: variedade (homens/mulheres, diferentes idades, diferentes níveis técnicos)
  - ~10 convites → espera-se ~5-8 aceitando e usando de fato

- [ ] **Email ou mensagem de convite padrão**
  - Template curto explicando o app, link pra instalar como PWA, pedido de feedback
  - Avisar que está em beta e pode ter bugs
  - Onde mandar feedback (email ou form)

- [ ] **Canal de suporte**
  - Grupo WhatsApp? Canal Telegram? Email só?
  - Commit-se a responder em até 48h nessa fase

### 1.2 — Métricas a observar

- [ ] **Ativação:** quantos dos convidados efetivamente criaram conta e preencheram o perfil?
- [ ] **Retenção:** quantos voltaram depois do dia 1? Dia 7? Dia 14?
- [ ] **Uso real:** quantas marmitas planejadas, refeições marcadas, checklist de compras marcado?
- [ ] **Bugs reportados:** lista + severidade + status
- [ ] **Custo Firebase:** leitura pela Firebase Console no final de cada semana

### 1.3 — Ações durante a fase

- [ ] **Revisar ACCESSIBILITY.md e SECURITY.md** com base em uso real
- [ ] **Iterar bugs** reportados (manter tempo de resposta <48h)
- [ ] **Documentar padrões de uso** que não tinha previsto
- [ ] **Decidir se avança pra Fase 2** ou volta pra Fase 0 ajustar

---

## Fase 2 — Expansão controlada (50-200 usuários)

**Objetivo:** escalar pra amigos de amigos e round 2 de divulgação. Aprender como o sistema se comporta com carga real.

**Pré-requisito:** Fase 1 validada, bugs críticos resolvidos.

**Critério de conclusão:** 50+ usuários ativos, custo Firebase estável, backlog de bugs sob controle.

### 2.1 — Preparação técnica

- [ ] **Firebase Blaze alertas ajustados** com base no consumo da Fase 1
  - Alert em 50% do orçamento mensal definido
  - Alert em 80%, 100%
- [ ] **Considerar custos alternativos** se Firebase tá ficando caro
  - Supabase (free tier mais generoso, mas requer migração de código)
  - Self-hosted Postgres + API minimal (muita complexidade)
- [ ] **Performance audit**
  - Lighthouse scores no Chrome DevTools
  - Tempo de FCP (First Contentful Paint) no Firebase Performance Monitoring
  - Investigar operações lentas em dispositivos low-end

### 2.2 — Preparação produto

- [ ] **Polish do onboarding** com base em feedback da Fase 1
- [ ] **FAQ / Ajuda** dentro do app respondendo perguntas comuns
- [ ] **Página de "Novidades"** pra comunicar atualizações aos usuários
- [ ] **Sistema de versão no UI** (mostrar versão atual + link pro changelog)

### 2.3 — Divulgação

- [ ] **Canal de divulgação definido**
  - Indicação pessoal ainda
  - Ou: primeiro post em rede social fechada
  - Evitar: público aberto ainda (Fase 3)

- [ ] **Link de convite com tracking** (opcional)
  - URL parameters (`?ref=amigo123`) pra saber de onde vem o usuário
  - Google Analytics ou Plausible (privacy-friendly)

### 2.4 — Operacional

- [ ] **SLA de suporte definido** (agora com mais usuários)
  - Ex: responder em 72h, resolver bugs críticos em 1 semana
- [ ] **Rotina de verificação diária** (ou semanal)
  - Firebase Console → Authentication (novos signups)
  - Firestore → Usage (reads/writes)
  - Canal de feedback (bugs novos)
- [ ] **Escalação documentada** — o que fazer em caso de incidente (vazamento, downtime, bug crítico)

---

## Fase 3 — Aberto ao público

**Objetivo:** remover as restrições de acesso. Qualquer pessoa pode encontrar e usar.

**Pré-requisito:** Fase 2 estável, operação sustentável.

**Critério de conclusão:** n/a (estado contínuo de operação).

### 3.1 — Distribuição

- [ ] **Landing page pública** em dietplan.com.br (ou subdomínio do GitHub Pages)
- [ ] **SEO básico**
  - `<meta>` description, og:image, twitter:card
  - robots.txt permitindo indexação
  - sitemap.xml
- [ ] **App Store / Play Store?**
  - PWA dá pra "instalar" via navegador — basta
  - TWA (Trusted Web Activity) pra Play Store — opcional, R$ 25 taxa única Google
  - iOS App Store — complexo, requer conta Apple Developer $99/ano

### 3.2 — Moderação

- [ ] **Revisar áreas com texto livre do usuário**
  - `shop_subs`, `profile.nome`, etc.
  - Implementar report/block se necessário (improvável nesta fase — dados privados)
- [ ] **Política de uso abusivo**
  - Adicionar aos Termos
  - Procedimento documentado pra banir contas

### 3.3 — Sustentabilidade

- [ ] **Monetização ativada** (se definida na Fase 0)
  - Donation button, freemium tiers, ou assinatura
- [ ] **Budget Firebase mensal definitivo**
- [ ] **Plano de crescimento** — até onde aguenta o stack atual?

### 3.4 — Continuous improvement

- [ ] **Changelog público**
- [ ] **Roadmap público** (pode reusar o ROADMAP.md)
- [ ] **Canal de feedback persistente** (form online ou email)

---

## 🚨 Red flags — quando parar e reavaliar

Se qualquer um destes acontecer, PARE a expansão e volte pra revisar:

- [ ] Reclamação formal LGPD (ANPD ou Procon)
- [ ] Incidente de segurança (vazamento, abuso, conta comprometida)
- [ ] Custo Firebase > 3× o esperado sem explicação
- [ ] Bug crítico afetando dados de usuário (perda, corrupção)
- [ ] Feedback consistente de que a UX frustra usuários novos

---

## 📝 Decisões tomadas

Registre aqui cada decisão significativa com data e justificativa. Facilita revisitar depois.

### Decisão #1 — Público-alvo geográfico

**Data:** 2026-04-13
**Contexto:** Pra internacionalizar ou não o app antes da expansão.
**Opções consideradas:** Brasil only / Brasil+PT / Internacional (i18n).
**Decisão:** **Brasil only.**
**Justificativa:** Reduz escopo da Fase 0 eliminando i18n (~1-2 semanas). PT-BR é suficiente, e se houver demanda estrangeira futura, pode-se reabrir essa decisão. LGPD já cobre o contexto legal brasileiro.

### Decisão #2 — Modelo de receitas

**Data:** 2026-04-13
**Contexto:** Se refatoramos agora pra permitir usuário criar receitas customizadas, ou mantemos as 12 fixas.
**Opções consideradas:** Fixo / Custom / Híbrido.
**Decisão:** **Fixo por enquanto**, com custom recipes planejado como evolução pós-expansão.
**Justificativa:** Custom recipes é refactor grande (~1 semana) que não é bloqueador pra abrir o app. Usuários entendem a limitação se estiver documentada. Melhor validar o app com receitas fixas primeiro e iterar depois.

### Decisão #3 — Modelo de negócio

**Data:** 2026-04-13
**Contexto:** Como sustentar o custo Firebase e a manutenção do app.
**Opções consideradas:** Grátis / Doação / Freemium / Pago.
**Decisão:** **Gratuito 100%**, custo Firebase sai do bolso do dev.
**Justificativa:** App pessoal sem ambição comercial. Firebase estimado em ~$0-5/mês pra até 100-200 usuários ativos, absorvível. Elimina complexidade enorme de billing, payment integration, tiers, compliance fiscal. Revisitar se a base crescer muito ou custo virar problema real.

### Decisão #4 — Ponto de contato LGPD / DPO

**Data:** 2026-04-13
**Contexto:** LGPD exige ponto de contato pra exercício de direitos do titular.
**Opções consideradas:** Email pessoal / Email dedicado / Form online.
**Decisão:** **Email Gmail dedicado**, a ser criado (`dietplan.contato@gmail.com` ou similar).
**Justificativa:** Separação profissional/pessoal é boa prática. Gmail é gratuito. Form online adiciona complexidade desnecessária pro volume esperado. **Ação pendente:** criar o email ANTES de publicar os documentos legais (senão ficam com placeholder que expõe juridicamente).

---

## 📦 Entregas e versões

Conforme cada item da Fase 0 for sendo completado, registrar aqui com a versão e referência ao commit/PR.

| Item | Fase | Versão | Commit | Data | Notas |
|---|---|---|---|---|---|
| Documento de estratégia criado | — | v2.1.69 | — | 2026-04-13 | Este arquivo |
| Decisões 1-4 da Fase 0 | 0.5 | v2.1.69 | 5eaf2ff | 2026-04-13 | Brasil only, receitas fixas, gratuito, DPO Gmail |
| Email DPO criado (`sac.dietplan@gmail.com`) | 0A | — | — | 2026-04-13 | Sprint 0A concluído |
| `PRIVACY.md` v1.0 | 0.1 | v2.1.69 | — | 2026-04-13 | LGPD-compliant, 13 seções, DPO embutido |
| `TERMS.md` v1.0 | 0.1 | v2.1.69 | — | 2026-04-13 | Disclaimer médico, limitação de responsabilidade, foro BR |

---

## 🔗 Documentos relacionados

- `ROADMAP.md` — roadmap original (33 itens, 100% completo)
- `SECURITY.md` — modelo de segurança atual, Firestore Rules, decisão de criptografia
- `ACCESSIBILITY.md` — audit WCAG AA, focus trap, tokens -text
- `CLAUDE.md` — contexto do agente para a retomada de sessões futuras (se existir)

---

## 📌 Plano de execução da Fase 0 (2026-04-13)

As 4 decisões de 0.5 estão tomadas. Com base nelas, aqui está a ordem recomendada de execução da Fase 0:

### Sprint 0A — Bloqueadores externos (dia 1, ~30min do usuário)

**Ação do usuário** (não posso fazer por você):
1. **Criar `dietplan.contato@gmail.com`** (ou nome disponível similar) no Gmail
2. **Me avisar o email escolhido** pra eu usar nos documentos legais

**Ação minha** (paralela):
- Começar a estruturar os docs legais com placeholder `{DPO_EMAIL}` pra substituir depois

### Sprint 0B — Docs legais (1 dia de trabalho)

Dependência: email DPO criado.

- `PRIVACY.md` — Política de Privacidade (LGPD compliant, ~2-3 páginas)
- `TERMS.md` — Termos de Uso (disclaimer médico forte, ~1-2 páginas)
- Adicionar links no auth screen footer + profile view modal
- Checkbox de consentimento no form de signup (requer pequena mudança em `submitAuthEmail`)

### Sprint 0C — Account management (1 dia)

- Export completo de dados como JSON (botão no profile view)
- Account deletion real (delete Firestore + `auth.currentUser.delete()`)
- Email verification no signup (`sendEmailVerification` após createUser)
- Disclaimer médico visível na aba Dieta

### Sprint 0D — UX pro estranho (1-2 dias)

- Landing/intro antes do login (pode ser seção no próprio auth screen)
- Tooltip help contextual no onboarding (LBM, BF%, fator atividade)
- Defaults mais conservadores (déficit extremo atrás de "modo avançado")
- Tour/walkthrough no primeiro uso (opcional, decide depois)
- Feedback canal (botão/link pro email DPO)

### Sprint 0E — Operacional (parte pelo usuário)

**Ação do usuário:**
- Migrar Firebase pra plano Blaze (pay-as-you-go) — gratuito até consumo exceder free tier
- Definir budget alerta em Firebase Console (ex: $10/mês)

**Ação minha:**
- Documentar no SECURITY.md (seção nova sobre Blaze + alerts)
- Atualizar ROADMAP.md referenciando EXPANSION_STRATEGY

### Sprint 0F — Validação

- Smoke test completo end-to-end simulando usuário novo
- Auditoria manual de todos os checkboxes de Fase 0
- Marcar Fase 0 como ✅ 100% concluída

### Estimativa total Fase 0

**3-5 dias de trabalho** (distribuídos ao longo de ~1 semana calendário), dependendo de quando o email Gmail for criado e quando você quiser revisar os docs legais.

---

**Recomendação imediata:** começar o Sprint 0A — crie o email Gmail. Enquanto isso, posso começar os drafts dos documentos legais com placeholder `{DPO_EMAIL}`.
