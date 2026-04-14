# Security — DietPLAN

Documento vivo sobre o modelo de segurança do app. Cobre os itens 21 e 22 do roadmap.

---

## 1) Firestore Security Rules (Item 21)

### Estrutura de dados no Firestore

O app organiza dados por usuário em uma subcoleção `data`:

```
users/
  {uid}/                     ← UID do Firebase Auth (Google OAuth ou email/senha)
    data/
      marmita_plan           ← { value: {A:3, B:2, ...}, updated: Timestamp }
      dinner_plan            ← { value: {O:1, T:2, ...}, updated: Timestamp }
      user_profile           ← { value: {nome, peso, altura, ...}, updated: ... }
      weight_log             ← { value: [{date, peso}, ...], updated: ... }
      marmita_history        ← { value: {WK-YYYY-WW: {...}}, updated: ... }
      workouts               ← ...
      cardio_log             ← ...
      cal_log                ← ...
      shop_checks            ← ...
      shop_subs              ← ...
      shop_subs_log          ← ...
      home_stock             ← ...
      gen_last_applied_marmita  ← ...
      gen_last_applied_dinner   ← ...
      marmita_current_week   ← ...
      marmita_consumed       ← ...
      dinner_consumed        ← ...
```

Cada documento dentro de `data` é identificado pela chave `STORAGE_KEYS` (ver `data.js`). O valor é armazenado no campo `value` + um timestamp `updated` para resolver conflitos de sync.

### Rules v1 (pronto pra colar no Firebase Console)

**Acesso:** Firebase Console → seu projeto → **Firestore Database** → aba **Rules** → substituir o conteúdo → **Publish**.

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // DietPLAN — cada usuário só acessa sua própria subcoleção data
    match /users/{userId}/data/{docId=**} {
      allow read, write: if request.auth != null
                          && request.auth.uid == userId;
    }

    // Default deny: qualquer outra coleção ou path fica bloqueado
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### O que essas rules garantem

- **Autenticação obrigatória** — `request.auth != null` bloqueia qualquer acesso não autenticado (usuários "Sem conta" nunca tocam o Firestore porque não fazem login; eles operam 100% em localStorage).
- **Isolamento por usuário** — `request.auth.uid == userId` impede que um usuário autenticado leia/escreva nos dados de outro, mesmo conhecendo o UID alheio.
- **Default deny everything else** — o segundo bloco `match /{document=**}` fecha qualquer rota alternativa (ex: alguém tentando criar uma coleção paralela).

### Como testar (opcional, recomendado)

Firebase Console → Firestore → aba **Rules** → botão **"Rules Playground"**:

| Cenário | Auth | Location | Expected |
|---|---|---|---|
| Ler próprios dados | `uid=ABC123` | `/users/ABC123/data/user_profile` | ✅ allow |
| Ler dados de outro | `uid=ABC123` | `/users/XYZ789/data/user_profile` | ❌ deny |
| Ler sem auth | (none) | `/users/ABC123/data/user_profile` | ❌ deny |
| Escrever sem auth | (none) | `/users/ABC123/data/user_profile` | ❌ deny |
| Acessar coleção fora | `uid=ABC123` | `/admin/settings` | ❌ deny (default) |

Se todos os cenários derem o resultado esperado, as rules estão corretas.

### Histórico

- **v1 (2026-04-13, este doc)** — rules iniciais. Isolamento por uid na subcoleção `data`.

---

## 2) Criptografia de dados de saúde (Item 22)

### Pergunta

Dados de saúde (peso, altura, sexo, idade, BF%, meta, plano alimentar, histórico de peso, registro de treino) devem ser criptografados no Firestore, ou a proteção padrão é suficiente?

### Análise

**Modelo de ameaça (threat model):**

| Ator | Acesso possível | Mitigação atual |
|---|---|---|
| Usuário random na internet | Tentar ler dados via SDK sem auth | ❌ Firestore Rules bloqueiam (Item 21) |
| Usuário autenticado no app (outro Diego) | Tentar ler dados de outro usuário | ❌ Rules bloqueiam (`uid == request.auth.uid`) |
| Ataque MITM durante trânsito | Interceptar dados HTTP | ❌ Firebase força TLS em todas as conexões |
| Google engineer com acesso interno | Dump de dados raw do Firestore | ⚠ Encryption at rest (AES-256) pelo Google + GDPR DPA |
| Pessoa com acesso físico ao celular desbloqueado | Abrir o app instalado | ⚠ localStorage é acessível, E2E não ajuda aqui |
| Pessoa com acesso físico ao celular bloqueado | Extração via unlock OS | ⚠ depende do OS + iCloud Keychain / Keystore |
| Membro da família com login legítimo | Usar o app normalmente | N/A (acesso autorizado) |

**Custos de implementar E2E encryption (cliente):**

- Gerenciar chaves de criptografia no navegador (IndexedDB + Web Crypto API)
- Problema de loss/recovery: se o usuário perde o device e não tem backup da chave, **perde todos os dados** do Firestore (irrecuperáveis, porque backup do Firestore só teria ciphertext)
- Problema de sync multi-device: key distribution via email de convite ou device pairing — complexidade grande
- Firestore queries (listen/sync) perdem funcionalidades de busca — só igualdade exata em ciphertext
- ~500-800 linhas de código adicional só pra crypto (encryption/decryption wrappers, key derivation, key storage)

**Benefício real para este caso de uso:**

O app é **pessoal/familiar**, dados são **fitness tracking** (não são dados médicos legalmente protegidos no Brasil — não são diagnósticos, receitas médicas, histórico de doenças). Os únicos dados minimamente sensíveis são peso/altura/BF%, que:
- Não são confidenciais por natureza (visível a quem vê a pessoa)
- Não têm valor financeiro
- Não são alvo típico de atacantes

O atacante realista que poderia extrair dados via Google infra teria que ser um insider com acesso privilegiado, o que já é coberto por políticas internas do Google + DPA + encryption at rest deles.

### Decisão

**Não implementar criptografia client-side (E2E).**

Justificativa:
1. Firebase já provê defense-in-depth: Auth + Rules + TLS + encryption at rest do Google
2. Dados são fitness pessoal, não médicos legalmente protegidos, não confidenciais por natureza
3. O custo de implementação (key management, risco de data loss, ~800 LOC) é desproporcional ao benefício
4. Threat model relevante (random atacante) já está mitigado pelas Rules do Item 21
5. Usuário "Sem conta" já tem full localStorage isolation — Firestore nem é tocado

### Quando revisitar

Esta decisão deve ser reavaliada se:
- O app passar a armazenar dados realmente sensíveis (diagnósticos médicos, laudos, receitas)
- A base de usuários expandir pra fora do círculo familiar (risco regulatório — LGPD com dados de saúde de terceiros)
- Firebase / Google mudarem a política de encryption at rest
- Incidente de segurança real (próprio ou de terceiros) indicar necessidade

### Data da decisão

2026-04-13 (v2.1.69).

---

## Outras medidas de segurança já em vigor

- **Firebase Auth:** Google OAuth e Email/Password (provider enablement manual, enabled ~v2.1.52)
- **Senha mínima:** 6 caracteres (validação client-side + Firebase minimum de 6)
- **Password reset:** `sendPasswordResetEmail` via Firebase (link por email, expira 1h)
- **Logout:** `auth.signOut()` + `location.reload()` pra limpar state em memória (v2.1.53)
- **Firestore sync:** snapshots em tempo real, updates apenas pelo próprio usuário autenticado
- **Backup em export:** o usuário pode exportar seus dados como JSON via "Exportar meus dados" no profile view (v2.1.70+)
- **Account deletion:** exclusão real da conta Firebase + Firestore com re-auth obrigatório (v2.1.70+)
- **Error messages:** mapeadas pra PT-BR mas não expõem stack traces ou informações sensíveis

---

## 3) Infraestrutura e Billing (Sprint 0E)

### Por que habilitar Blaze plan

O Firebase tem dois níveis de billing:

| Plano | Custo | Limites | Problema |
|---|---|---|---|
| **Spark (free)** | R$ 0 | Firestore: 50k reads/dia, 20k writes/dia, 1 GB storage. Auth: 50k usuários. | **Bloqueia** ao exceder — app fica offline até reset diário |
| **Blaze (pay-as-you-go)** | Pay-as-you-go | Mesmas quotas gratuitas, só cobra o excesso | Nada bloqueia. Até 50k usuários ativos/mês, geralmente fica em R$ 0 |

**Recomendação pra expansão:** migrar pra **Blaze** antes de abrir o app pro público, por dois motivos:

1. **Continuidade:** se o Spark limite for atingido em um dia de pico, o app fica fora do ar até meia-noite UTC. Blaze evita isso.
2. **Confiabilidade:** a maioria das features avançadas do Firebase (Cloud Functions, backups automáticos, analytics granular) exige Blaze.

**Custo real esperado** (projeto DietPLAN em `southamerica-east1`):

- **0-50 usuários ativos:** R$ 0/mês (dentro do free tier do Blaze)
- **50-200 usuários ativos:** R$ 0-5/mês
- **200-1000 usuários ativos:** R$ 5-30/mês
- **1000+ usuários ativos:** depende do uso — configurar budget alerts

### Como migrar pra Blaze (passo a passo)

1. Abrir https://console.firebase.google.com/project/peitudasnow/usage/details
2. Clicar em **"Upgrade"** ou **"Modify plan"** no canto inferior esquerdo
3. Selecionar **"Blaze (Pay as you go)"**
4. Vincular uma **conta de pagamento do Google Cloud**:
   - Se não tiver, criar nova em https://console.cloud.google.com/billing/create
   - Cartão de crédito necessário — não cobra nada até exceder o free tier
5. Confirmar upgrade
6. Aguardar ~30s pra propagação

**Após upgrade:** todas as features que exigem Blaze ficam disponíveis, e você pode configurar budget alerts (próxima seção).

### Budget Alerts (obrigatório antes de abrir ao público)

Mesmo com custo esperado baixo, você deve configurar alertas de gastos pra evitar surpresas:

1. Abrir https://console.cloud.google.com/billing → selecionar a conta de billing
2. Menu lateral → **Budgets & alerts** → **Create budget**
3. Nome: `DietPLAN — limite mensal`
4. Período: **Mensal**
5. Scope: selecionar o projeto **DietPLAN**
6. Budget amount: **R$ 50,00** (ou valor confortável pra você)
7. Threshold rules:
   - 50% → email apenas
   - 80% → email + pausar novos signups (manual)
   - 100% → email + revisar Firestore Rules pra bloquear escritas
8. Destinatários: seu email pessoal + `sac.dietplan@gmail.com`
9. **Save**

**Ação em caso de alerta em 80%:**
- Investigar causa (acesso normal crescendo? bug de loop? ataque?)
- Se for ataque, bloquear via Firestore Rules temporariamente
- Considerar subir o budget ou otimizar queries

### Monitoramento contínuo

- **Firebase Console → Usage:** quantos reads/writes por dia, por coleção
- **Firebase Console → Authentication → Users:** contagem total de usuários
- **Cloud Console → Billing → Reports:** gasto real do mês, por serviço
- **Rotina recomendada:** revisar semanalmente durante a fase 1-2 (soft launch), depois quinzenal

### Backups do Firestore

A partir do Blaze, você pode habilitar **backups automáticos** do Firestore:

1. https://console.cloud.google.com/firestore/backups → selecionar database
2. **Create backup schedule** → diário, retenção 7 dias
3. Custo: ~R$ 0,01 por GB por dia (pra uma base pequena, centavos/mês)

Isso protege contra:
- Bugs no app que corrompem dados
- Exclusão acidental
- Ransomware (improvável mas possível)

### Histórico

- **v1 (2026-04-13)** — projeto no plano Spark (free)
- **v2 (2026-04-14, Sprint 0E)** — **migração pra Blaze pendente**, docs preparados
