# Política de Privacidade — DietPLAN

**Última atualização:** 2026-04-13
**Versão:** 1.1

---

## 1. Quem somos

DietPLAN é um aplicativo web progressivo (PWA) gratuito para planejamento alimentar e acompanhamento de composição corporal, desenvolvido e mantido de forma independente, sem fins comerciais.

Esta Política de Privacidade descreve como tratamos os dados pessoais dos usuários do DietPLAN, em conformidade com a **Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018)**.

**Contato do Encarregado (DPO):** sac.dietplan@gmail.com
**Tempo de resposta:** até 15 dias corridos (conforme Art. 18, §3º da LGPD)

---

## 2. Modos de uso e dados coletados

O DietPLAN oferece três modos de uso, com diferentes níveis de coleta:

### 2.1. Modo "Sem conta" (100% local)

- **Dados coletados pelo servidor:** nenhum
- **Onde ficam os dados:** apenas no armazenamento local do seu navegador (`localStorage`)
- **Sincronização:** não há. Trocar de dispositivo = recomeçar do zero
- **Backup:** não há. Limpar cache do navegador = perda de dados

Neste modo, o DietPLAN não coleta, armazena ou processa nenhum dado em servidores externos. Nenhum dado sai do seu dispositivo.

### 2.2. Modo "Conta com email e senha"

Além dos dados locais, coletamos e armazenamos no Firebase (Google Cloud):

- **Dados de autenticação:**
  - Email
  - Identificador único (UID) gerado pelo Firebase
  - **Senha:** o DietPLAN **nunca recebe, vê, processa, armazena ou transmite sua senha em texto puro**. A senha é enviada diretamente do seu navegador para o Firebase Authentication (Google), que a processa com hashing criptográfico no lado deles. O código do DietPLAN apenas repassa a senha do campo do formulário para o SDK oficial do Firebase — o valor nunca passa por nenhum servidor nosso (aliás, não temos servidor próprio).

- **Dados de perfil cadastral:**
  - Nome, sobrenome
  - Sexo, idade, altura (cm)
  - Peso atual, meta de peso
  - Percentual de gordura corporal (BF%)
  - Massa magra (LBM, calculada ou informada)
  - Fator de atividade (sedentário a atleta)
  - Meta calórica / nível de déficit ou superávit
  - Modo de cardápio (1 ou 2 pessoas)

- **Dados de uso e planejamento:**
  - Plano semanal de marmitas (quais pratos, quantos dias)
  - Plano semanal de jantares
  - Semana atual do cardápio em execução
  - Marmitas e jantares marcados como consumidos
  - Histórico de cardápios de semanas passadas
  - Refeições do dia marcadas como feitas (organizadas por data)
  - Rascunho atual do gerador de cardápio e o último snapshot aplicado (para permitir re-geração idempotente)
  - Registro diário de treino (musculação)
  - Registro diário de cardio
  - Registro de calorias avulsas
  - Histórico de peso (peso, data)
  - Checklist de compras da semana
  - Substituições customizadas de ingredientes (texto livre) e o histórico dessas substituições
  - Estoque de itens em casa

### 2.3. Modo "Conta Google"

**Inclui todos os dados do modo 2.2** (os mesmos dados de perfil cadastral, de uso e de planejamento listados acima são coletados e armazenados igualmente quando você preenche o perfil, independente de ter entrado via email+senha ou via Google).

Adicionalmente, coletamos do seu perfil Google, apenas no momento do login:

- **Dados do perfil Google:** nome de exibição, email, foto de perfil (URL), identificador único (UID Firebase atrelado à conta Google)

**Escopos Google solicitados:** apenas `openid`, `email` e `profile` (básicos do OAuth). O DietPLAN **não** acessa Drive, Gmail, Contatos, Agenda, Fotos, YouTube, localização, nem qualquer outro dado ou serviço da sua conta Google além dos três campos acima.

Neste modo, **você também não digita senha** no DietPLAN: a autenticação é delegada integralmente ao Google via fluxo OAuth 2.0 no popup oficial da Google. O DietPLAN nunca vê credenciais da sua conta Google.

---

## 3. Finalidade do tratamento

Os dados coletados são usados exclusivamente para:

1. **Autenticar** o acesso à sua conta
2. **Sincronizar** seus dados entre dispositivos (celular, desktop, tablet)
3. **Calcular** suas necessidades calóricas, macros e progresso
4. **Gerar** sugestões de cardápio com base no seu perfil
5. **Gerenciar** sua lista de compras (geração automática a partir do cardápio, checklist, substituições customizadas e controle do estoque em casa)
6. **Exibir** seu histórico de peso, treino e cardápio
7. **Permitir** que você exporte ou apague seus dados a qualquer momento

**Não usamos seus dados para:**
- Publicidade, remarketing ou venda a terceiros
- Treinamento de modelos de inteligência artificial
- Pesquisa de mercado ou análise comportamental comercial
- Qualquer finalidade secundária além das descritas acima

---

## 4. Base legal (LGPD Art. 6º, 7º e 11)

### 4.1. Princípios aplicáveis (Art. 6º)

O tratamento dos seus dados pelo DietPLAN observa os princípios da LGPD:

- **Finalidade:** dados usados apenas para os fins declarados na seção 3
- **Adequação:** compatibilidade do tratamento com os fins informados ao titular
- **Necessidade:** coletamos o mínimo indispensável pra o funcionamento do app (campos como BF% e LBM informado são opcionais)
- **Livre acesso:** você pode consultar seus dados a qualquer momento via profile view ou exportação JSON
- **Qualidade:** você pode editar e corrigir seus dados a qualquer momento
- **Transparência:** esta Política explica todo o ciclo de tratamento
- **Segurança:** medidas técnicas descritas na seção 8
- **Prevenção:** uso de Firestore Rules, TLS, isolamento por UID
- **Não discriminação:** nenhum dado é usado pra discriminação ilícita ou abusiva
- **Responsabilização:** DPO identificado e disponível em `sac.dietplan@gmail.com`

### 4.2. Bases legais por categoria de dado

| Dado | Base legal | Artigo LGPD |
|---|---|---|
| Email, UID Firebase | Execução de contrato | Art. 7º, V |
| Nome de exibição, foto de perfil (modo Google OAuth) | Execução de contrato | Art. 7º, V |
| Nome, sobrenome (modo email) | Execução de contrato | Art. 7º, V |
| **Peso, altura, idade, sexo, BF%, LBM, meta calórica, histórico de peso** | **Consentimento específico** | **Art. 11, I** |
| **Registro de treino, cardio, calorias avulsas, refeições consumidas** | **Consentimento específico** | **Art. 11, I** |
| Plano alimentar semanal (marmitas, jantares escolhidos) | Execução de contrato | Art. 7º, V |
| Checklist de compras, substituições customizadas, estoque em casa | Execução de contrato | Art. 7º, V |
| Cookies de sessão Firebase Auth, `localStorage` (tema, preferências) | Legítimo interesse | Art. 7º, IX |
| Registros de solicitações LGPD (exportação, exclusão) | Cumprimento de obrigação legal | Art. 7º, II |

**Observação sobre senha:** a senha que você cadastra no modo email **não é tratada pelo DietPLAN**. Ela é repassada diretamente ao Firebase Authentication (Google), que atua como controlador autônomo desse dado sob seu próprio DPA. Por isso, a senha não aparece nesta tabela — o dado não está sob nossa responsabilidade direta.

### 4.3. Consentimento específico para dados sensíveis (Art. 11, §1º)

Por determinação legal, o consentimento para tratamento de dados de saúde deve ser **específico e destacado**, diferente do aceite geral dos Termos. No DietPLAN, isso é implementado no cadastro através de **dois checkboxes separados e obrigatórios**:

1. ☐ Li e aceito os [Termos de Uso] e a [Política de Privacidade]
2. ☐ Autorizo o tratamento dos meus dados de saúde (peso, altura, composição corporal, metas, histórico alimentar e de exercícios) para as finalidades descritas na Política de Privacidade

O botão "Criar conta" só é habilitado após ambos serem marcados. A data e hora do aceite, junto com a versão desta Política, ficam registradas no seu perfil.

### 4.4. Revogação do consentimento (Art. 8º, §5º)

Você pode **revogar o consentimento a qualquer momento**, sem justificativa, de forma gratuita e simplificada, via:

- Botão **"Apagar minha conta"** no profile view modal do app
- Solicitação por email para sac.dietplan@gmail.com

A revogação não afeta a licitude do tratamento realizado anteriormente com base no consentimento. Dados tratados com outras bases legais (execução de contrato, obrigação legal) podem ser mantidos pelo tempo necessário ao cumprimento dessas bases, mesmo após revogação do consentimento pra dados de saúde.

### 4.5. Minimização de dados

O DietPLAN segue a diretriz de coletar apenas o estritamente necessário:

- **Campos opcionais** (BF%, LBM informado manualmente, fator de atividade customizado) podem ficar em branco — o app usa fórmulas alternativas quando ausentes
- **Nenhum dado é pré-selecionado** ou assumido sem informação do usuário
- **Nenhum dado de terceiros** é solicitado (ex: não perguntamos sobre familiares, médicos, convênio, plano de saúde, medicamentos)
- **Nenhum dado de contato secundário** (telefone, endereço residencial, CPF, RG, CEP) é solicitado ou armazenado

---

## 5. Compartilhamento com terceiros

Os dados do modo "Com conta" são armazenados na infraestrutura do **Firebase** (propriedade da **Google LLC**), que atua como **operador de dados** (LGPD Art. 5º, VII) sob as instruções do DietPLAN como **controlador** (Art. 5º, VI).

**Papéis definidos:**
- **Controlador:** DietPLAN (responsável pelas decisões sobre o tratamento dos dados — o que coletar, pra que usar, quando apagar)
- **Operador:** Google LLC / Firebase (executa o armazenamento, autenticação e sincronização segundo nossas instruções técnicas)

**Condições do compartilhamento com o Firebase/Google:**
- **🇧🇷 Localização primária dos dados: São Paulo, Brasil** (região `southamerica-east1` do Google Cloud). Os dados do Firestore do DietPLAN ficam armazenados em data centers físicos do Google localizados no território brasileiro. **Não há transferência internacional para fins de armazenamento principal.**
- **Acesso eventual por equipes do Google fora do Brasil:** embora os dados residam em SP, o Google LLC (empresa sediada nos EUA) pode acessar metadados e dados, excepcionalmente, para fins de suporte técnico, manutenção de infraestrutura, auditorias internas de segurança e cumprimento de obrigações legais. Esses acessos, quando ocorrem, são regidos pelo *Data Processing Addendum* (DPA) do Google Cloud, que vincula todas as equipes do Google ao cumprimento de obrigações equivalentes à LGPD (**Art. 33, IX**) — incluindo cláusulas contratuais padrão de proteção.
- **Firebase Authentication (email+senha e Google OAuth):** diferente do Firestore, o serviço de autenticação do Firebase é oferecido como **serviço global** pelo Google, sem opção de limitar a região. Dados mínimos de autenticação (email, UID, hash de senha, timestamps de login) podem ser processados em infraestrutura global do Google. Esse é o único ponto onde há processamento fora da região `southamerica-east1`, e está amparado pelo mesmo DPA citado acima.
- **Certificações do Google relevantes:** ISO/IEC 27001, ISO/IEC 27017, ISO/IEC 27018, SOC 1/2/3
- **Política de privacidade do Google:** https://policies.google.com/privacy
- **Termos de serviço do Firebase:** https://firebase.google.com/terms
- **DPA do Firebase:** https://firebase.google.com/terms/data-processing-terms
- **Criptografia em trânsito:** TLS 1.2+ obrigatório em todas as conexões cliente-servidor
- **Criptografia em repouso:** AES-256 por padrão para todos os dados armazenados no Firestore e no Firebase Authentication

**Não compartilhamos dados com nenhum outro terceiro.** Em especial, o DietPLAN **não** tem integração com:

- Plataformas de redes sociais (Facebook, Instagram, TikTok, X/Twitter)
- Sistemas de analytics (Google Analytics, Plausible, Mixpanel, Amplitude)
- Pixels de rastreamento ou tags de remarketing
- Ferramentas de anúncios ou publicidade programática
- Plataformas de email marketing (Mailchimp, SendGrid, etc.)
- Planos de saúde, seguradoras, clínicas, laboratórios ou convênios
- Órgãos públicos (exceto mediante ordem judicial ou requisição legal específica, conforme Art. 11, §2º, III da LGPD)
- Terceirizados de marketing, pesquisa de mercado ou corretagem de dados

---

## 6. Retenção e descarte

**Regra geral:** mantemos seus dados pelo **menor tempo possível** necessário pras finalidades declaradas.

| Categoria de dado | Tempo de retenção | Base |
|---|---|---|
| Perfil, plano alimentar, histórico de uso | Enquanto a conta existir | Execução de contrato |
| Histórico de peso, treino, cardio (dados sensíveis) | Enquanto a conta existir ou até revogação do consentimento | Consentimento |
| Dados locais do modo "Sem conta" | Enquanto o usuário não limpar o cache do navegador | Não há tratamento por nós |
| Logs operacionais do Firebase (acessos, erros) | 30-60 dias | Definido pelo Google Cloud |
| Registros de solicitações LGPD (pedidos de exportação/exclusão) | 5 anos após atendimento | Cumprimento de obrigação legal (prestação de contas à ANPD) |

**Após exclusão da conta (exclusão imediata):**
- Todos os documentos em `users/{uid}/data/*` são apagados do Firestore
- A conta no Firebase Authentication é deletada via `auth.currentUser.delete()`
- Nenhum backup oculto é mantido pelo DietPLAN
- Os logs operacionais do Firebase podem conter resíduos (UID, timestamps) por até 60 dias antes do expurgo automático do Google, mas sem acesso a conteúdo de perfil

**Sem backup paralelo:** o DietPLAN não mantém cópias, arquivos, exports internos ou qualquer outra forma de armazenamento dos seus dados fora do Firestore.

---

## 7. Seus direitos (LGPD Art. 18)

Você tem direito a:

1. **Confirmação** da existência de tratamento dos seus dados
2. **Acesso** aos seus dados — disponível no próprio app via botão "Exportar meus dados" (gera um arquivo JSON completo)
3. **Correção** de dados incompletos, inexatos ou desatualizados — edite no seu perfil dentro do app a qualquer momento
4. **Anonimização, bloqueio ou eliminação** de dados desnecessários ou tratados em desconformidade
5. **Portabilidade** dos dados — o export em JSON cobre este direito
6. **Eliminação** dos dados tratados com consentimento — disponível no app via botão "Apagar minha conta"
7. **Informação** sobre com quem compartilhamos seus dados — respondida nesta Política (seção 5)
8. **Informação** sobre a possibilidade de não fornecer consentimento e suas consequências — você pode usar o modo "Sem conta" sem fornecer nenhum dado
9. **Revogação do consentimento** a qualquer momento, mediante apagamento da conta

Para exercer qualquer desses direitos, você pode:
- Usar os botões no próprio app (profile view modal): **"Exportar meus dados"** e **"Apagar minha conta"**
- Ou contatar o Encarregado: **sac.dietplan@gmail.com**

**Gratuidade (Art. 18, §5º):** o exercício de qualquer dos direitos listados acima é **gratuito**, sem necessidade de justificativa e sem cobrança de qualquer taxa, custo administrativo ou valor, independente da frequência com que você exerça esses direitos.

**Prazo de resposta (Art. 18, §3º):** solicitações enviadas por email ao Encarregado serão respondidas em até **15 dias corridos**, contados da data de recebimento do pedido. Em casos excepcionais de complexidade que exijam prazo maior, você será informado por email com a justificativa e o novo prazo estimado.

**Solicitações via app são automáticas e imediatas:**
- "Exportar meus dados" gera o JSON na hora, sem fila de atendimento
- "Apagar minha conta" executa a exclusão imediatamente após confirmação

---

## 8. Segurança

Medidas técnicas e administrativas em vigor:

- **Autenticação obrigatória** via Firebase Auth (email+senha ou Google OAuth)
- **Isolamento por usuário** via Firestore Security Rules: cada conta só acessa seus próprios dados, mesmo conhecendo UID de terceiros
- **Transmissão criptografada** (TLS 1.2+) em todas as comunicações cliente-servidor
- **Armazenamento criptografado** em repouso (AES-256) no Firebase
- **Default deny** em Firestore: qualquer coleção fora do escopo `users/{uid}/data/` é bloqueada
- **Senhas nunca armazenadas em texto puro** — hash gerenciado pelo Firebase Auth
- **Minimização de superfície:** sem servidor próprio, sem APIs intermediárias, sem banco de dados secundário — toda a persistência fica no Firebase diretamente
- **Testes das regras de acesso:** Firestore Security Rules validadas manualmente via *Rules Playground* do Firebase Console, cobrindo cenários de acesso autorizado, negado e cross-user (ver `SECURITY.md` seção 1 para o histórico de testes)

Mais detalhes técnicos em `SECURITY.md`.

**Reconhecimento honesto:** apesar das medidas acima seguirem boas práticas da indústria, **nenhum sistema de informação é 100% invulnerável**. Caso ocorra qualquer incidente que possa afetar seus dados, o DietPLAN se compromete a comunicar tempestivamente a ANPD e os titulares conforme procedimento detalhado na seção 9 abaixo. Você também pode — e deve — adotar medidas pessoais de proteção (senha forte e exclusiva, não compartilhar credenciais, manter seu dispositivo atualizado, fazer logout em dispositivos compartilhados).

---

## 9. Comunicação de incidentes de segurança (LGPD Art. 48)

### 9.1. O que consideramos um incidente comunicável

Para fins desta Política, o DietPLAN considera **incidente comunicável** qualquer evento envolvendo dados pessoais dos usuários que apresente **risco ou dano relevante**, incluindo (mas não se limitando a):

- **Vazamento** (qualquer exposição indevida de dados de saúde, perfil ou autenticação)
- **Acesso não autorizado confirmado** (por terceiros, ex-colaboradores, agentes externos ou falha de controle de acesso)
- **Corrupção irreversível ou perda definitiva** de dados de usuários
- **Comprometimento** da integridade do banco de dados Firestore, incluindo alteração não autorizada de registros
- **Exposição acidental** da base de dados por erro de configuração (ex: regras do Firestore abertas por engano)
- **Incidente no Firebase / Google Cloud** que impacte especificamente os dados do DietPLAN e seja comunicado pela Google LLC

Eventos que **não** são considerados incidentes comunicáveis:
- Falhas pontuais de disponibilidade (downtime) sem exposição de dados
- Bugs de UI que não afetam persistência ou integridade
- Indisponibilidade temporária do Firebase amplamente divulgada pela Google
- Tentativas fracassadas de acesso bloqueadas pelas Firestore Security Rules

### 9.2. Procedimento e prazos

Os prazos abaixo seguem a **Resolução CD/ANPD nº 15, de 24 de abril de 2024**, que regulamenta o Art. 48 da LGPD:

1. **Notificar a ANPD** em até **2 dias úteis** após a ciência do incidente, pelo canal oficial da ANPD (peticionamento eletrônico)
2. **Notificar os titulares afetados** por email, em até **2 dias úteis** após a ciência do incidente, quando possível identificá-los
3. **Informar no comunicado** os seguintes itens obrigatórios do **Art. 48, §1º** da LGPD:
   - Descrição da natureza dos dados pessoais afetados
   - Informações sobre os titulares envolvidos
   - Indicação das medidas técnicas e de segurança utilizadas para a proteção dos dados, observados os segredos comercial e industrial
   - Riscos relacionados ao incidente
   - Motivos da demora, caso a comunicação não tenha sido imediata
   - Medidas que foram ou serão adotadas para reverter ou mitigar os efeitos do prejuízo

### 9.3. Canal de reporte pelo usuário

Se você identificar ou suspeitar de um incidente envolvendo o DietPLAN:

- **Email:** sac.dietplan@gmail.com
- **Assunto obrigatório:** `[INCIDENTE]` seguido de descrição curta
- **Tratamento:** prioridade máxima, resposta imediata mesmo fora dos prazos habituais de suporte

Reportes anônimos são aceitos. Confidencialidade do denunciante é garantida.

### 9.4. Histórico público de incidentes

Para transparência, caso algum incidente comunicável ocorra, ele será registrado em seção dedicada do arquivo `SECURITY.md` no repositório do app, contendo:

- Data e hora da ciência do incidente
- Natureza e escopo dos dados afetados
- Número aproximado de titulares envolvidos
- Medidas tomadas pra conter e mitigar
- Lições aprendidas e ajustes técnicos aplicados

**Até a data desta Política, nenhum incidente foi registrado.**

---

## 10. Cookies e tecnologias de armazenamento local

O DietPLAN usa **apenas tecnologias de armazenamento classificadas como técnicas ou estritamente necessárias** ao funcionamento do app. **Não usamos, em nenhuma hipótese**, cookies de rastreamento, pixels de analytics, tags publicitárias, fingerprinting ou qualquer tecnologia de profiling.

### 10.1. O que usamos

| Tecnologia | Finalidade | Classificação | Base legal |
|---|---|---|---|
| `localStorage` do navegador | Cache local dos dados do usuário (perfil, plano alimentar, checklist, etc.) e preferências de UI (tema claro/escuro/automático) | Técnica / essencial | Art. 7º, V ou IX |
| `IndexedDB` (via Firestore SDK) | Cache offline dos dados sincronizados, para permitir uso do app sem conexão. Ativado via `db.enablePersistence()` | Técnica / essencial | Art. 7º, V |
| Cookies de sessão do Firebase Authentication | Manter o login ativo entre recarregamentos de página e sessões do navegador | Técnica / essencial | Art. 7º, V |
| Cookies técnicos do Firebase Hosting | Roteamento e balanceamento de requisições entre data centers do Google | Técnica / essencial | Art. 7º, IX |

### 10.2. O que NÃO usamos

O DietPLAN **não** utiliza:

- ❌ Cookies de terceiros (third-party cookies)
- ❌ Pixels de rastreamento (Facebook Pixel, Google Ads tag, TikTok Pixel)
- ❌ Ferramentas de analytics (Google Analytics, Plausible, Mixpanel, Amplitude)
- ❌ Ferramentas de heatmap ou gravação de sessão (Hotjar, FullStory, Clarity)
- ❌ Tags de remarketing ou publicidade programática
- ❌ Fingerprinting de dispositivo, navegador, canvas ou áudio
- ❌ Beacon de e-mail ou pixels em comunicações por email

### 10.3. Conteúdo armazenado localmente

No modo "Com conta", o `localStorage` e o `IndexedDB` funcionam como **cache local dos mesmos dados já armazenados no Firestore**, sincronizados em tempo real. Isso permite que o app funcione offline e com performance adequada. Quando você apaga sua conta, o cache local **também deve ser limpo** (pelo navegador ou por ação manual), mas a exclusão autoritativa acontece no Firestore.

No modo "Sem conta", **todos os dados ficam exclusivamente no `localStorage` do navegador**, sem cópia em servidor.

### 10.4. Banner de consentimento de cookies

Por usarmos **exclusivamente tecnologias essenciais ao funcionamento do serviço**, o DietPLAN **não exibe banner de consentimento de cookies**. Essa abordagem está amparada no Art. 7º, IX da LGPD (legítimo interesse para operação do serviço) e alinhada com as orientações da ANPD sobre tratamento de dados por cookies, que dispensam consentimento para cookies estritamente necessários.

Se, no futuro, o DietPLAN vier a integrar qualquer tecnologia de analytics ou publicidade, um **banner de consentimento específico, granular e prévio** será implementado — e esta Política será atualizada em conformidade.

### 10.5. Como você pode gerenciar

Você pode, a qualquer momento:

- **Limpar o `localStorage` e o `IndexedDB`** via configurações do seu navegador → "Limpar dados do site" → selecione o domínio do DietPLAN
- **Bloquear cookies** do DietPLAN via configurações do navegador (porém isso vai impedir o login e a sincronização — o app deixa de funcionar no modo "Com conta")
- **Usar navegação anônima/privada** — o localStorage e cookies são apagados ao fechar a aba, o que é equivalente a usar o app descartável

---

## 11. Crianças e adolescentes — uso restrito a maiores de 18 anos

### 11.1. Restrição de idade

O DietPLAN é **destinado exclusivamente a pessoas maiores de 18 anos**. **Não é permitido o uso do app por menores de 18 anos**, em nenhuma hipótese, nem mesmo com supervisão de responsável legal.

### 11.2. Motivação desta restrição

Esta é uma decisão de **princípio de precaução** tomada pelo desenvolvedor, baseada em três fatores:

1. **Natureza sensível do conteúdo:** o DietPLAN trabalha com metas calóricas, déficit energético, acompanhamento de peso, composição corporal e registro alimentar — todos tópicos reconhecidos pela literatura científica como **potencialmente gatilhadores ou agravantes de transtornos alimentares** (anorexia, bulimia, ortorexia, transtorno de compulsão alimentar) em adolescentes.

2. **Dados pessoais sensíveis de menores sob regime especial (LGPD Art. 14):** o tratamento de dados de saúde de crianças e adolescentes exige consentimento específico por pelo menos um dos pais ou responsável legal, com verificação, e sujeita o controlador a obrigações reforçadas de fiscalização e transparência. O DietPLAN, sendo operado por pessoa física sem estrutura jurídica empresarial, não tem condições operacionais de implementar e fiscalizar essa verificação com segurança adequada.

3. **Ausência de avaliação clínica:** conforme os Termos de Uso, o DietPLAN não substitui aconselhamento profissional. Adolescentes em fase de crescimento têm necessidades nutricionais específicas que **somente devem ser avaliadas por médico ou nutricionista registrado**, nunca por cálculos automáticos de um app genérico.

### 11.3. O que fazemos para reforçar a restrição

- **Aviso no cadastro:** o usuário declara expressamente, ao aceitar os Termos, que é maior de 18 anos
- **Aviso médico inicial:** a contraindicação para menores aparece no aviso médico visível antes do cadastro
- **Termos de Uso:** cláusula explícita na seção 1 (Aceitação dos termos)

### 11.4. O que fazer se uma conta de menor for identificada

Se você identificar que uma conta foi criada por uma pessoa menor de 18 anos — seja você o próprio menor, um familiar, educador, ou profissional de saúde — contate imediatamente:

- **Email:** sac.dietplan@gmail.com
- **Assunto:** `[CONTA] Menor de idade identificado`

O DietPLAN se compromete a:
1. **Suspender** o acesso à conta imediatamente após verificação mínima
2. **Excluir** todos os dados da conta em até 48h
3. **Não reter** nenhuma informação do menor após a exclusão
4. **Não solicitar** dados de responsáveis durante o processo

**Responsáveis legais** podem solicitar a exclusão de contas de menores sob sua tutela a qualquer momento, sem necessidade de comprovação documental além da declaração do vínculo.

---

## 12. Alterações nesta política

Esta Política pode ser atualizada periodicamente para refletir mudanças no app, na legislação ou nas práticas de tratamento de dados. O **campo "Última atualização" no topo** desta Política e o **número de versão** (também no topo) permitem identificar se houve mudança desde a última vez que você aceitou.

As mudanças são classificadas em **três níveis**, cada um com procedimento e prazo próprios:

### 12.1. Mudanças editoriais (nível 1)

**Exemplos:** correção ortográfica, reorganização de seções sem alteração de conteúdo, clareza redacional, atualização de link quebrado, correção de referência a artigo de lei.

**Procedimento:**
- Entram em vigor **imediatamente** na publicação
- **Não requerem aviso prévio** nem comunicação individual
- O número de versão é incrementado no campo decimal (ex: 1.1 → 1.2)

### 12.2. Mudanças relevantes (nível 2)

**Exemplos:** nova finalidade de tratamento compatível com as existentes, alteração de prazo de retenção, adição de nova categoria de dado não sensível, mudança de canal de contato do DPO, ajuste nas medidas técnicas de segurança.

**Procedimento:**
- Comunicação por **banner no app** na próxima abertura
- Comunicação por **email** para todos os usuários cadastrados com email verificado
- **Período mínimo de 15 dias** entre a publicação e a entrada em vigor
- Durante esse período, você pode revisar as mudanças e, se discordar, apagar sua conta antes da entrada em vigor
- Número de versão incrementado no campo principal (ex: 1.2 → 2.0)

### 12.3. Mudanças que exigem novo consentimento (nível 3)

**Exemplos:** nova finalidade **incompatível** com as declaradas (ex: uso dos dados para marketing, pesquisa, treinamento de IA), compartilhamento com terceiros não listados, coleta de novas categorias de **dados sensíveis**, alteração da base legal de tratamento, transferência internacional nova.

**Procedimento:**
- Comunicação por **banner no app + email + consentimento explícito renovado**
- **Período mínimo de 30 dias** entre publicação e entrada em vigor
- Ao próximo login após a entrada em vigor, você será apresentado a um **fluxo de re-consentimento** com checkboxes específicos para cada novo tipo de tratamento
- **Se você não aceitar**, sua conta permanece ativa mas o novo tratamento não se aplica a você (ou, se for incompatível com a continuidade do app, você será direcionado a exportar seus dados e apagar a conta)
- Número de versão incrementado no campo principal (ex: 2.0 → 3.0)

### 12.4. Histórico de versões

O histórico completo de versões desta Política, com data e resumo das mudanças, fica disponível no repositório público do app. Você pode consultar qualquer versão anterior a qualquer momento.

### 12.5. Como saber se a política mudou

Na próxima vez que você abrir o app após uma mudança de nível 2 ou 3:

- Um banner aparecerá informando que a Política foi atualizada
- Para mudanças de nível 3, o app bloqueará funcionalidades sensíveis até o re-consentimento ser registrado
- Você também pode verificar manualmente a qualquer momento abrindo esta Política e comparando o campo "Versão" com a versão que você aceitou no cadastro (registrada no seu perfil)

---

## 13. Jurisdição e legislação aplicável

### 13.1. Legislação aplicável

Esta Política é regida pelas leis da **República Federativa do Brasil**, aplicáveis independentemente da localização física dos servidores do Firebase, por força do **Art. 11 do Marco Civil da Internet (Lei nº 12.965/2014)**, que determina a aplicação da legislação brasileira a qualquer operação de coleta, armazenamento, guarda e tratamento de dados pessoais realizada em território nacional ou cujo resultado seja oferecido ao público brasileiro.

**Legislação diretamente aplicável:**

- **Lei nº 13.709/2018 (LGPD)** — Lei Geral de Proteção de Dados Pessoais
- **Lei nº 12.965/2014 (Marco Civil da Internet)** — direitos e garantias para o uso da internet no Brasil
- **Lei nº 10.406/2002 (Código Civil)** — obrigações, contratos, força maior, responsabilidade civil
- **Lei nº 8.078/1990 (Código de Defesa do Consumidor)** — no que for aplicável, observada a natureza gratuita e não profissional do serviço
- **Resolução CD/ANPD nº 15, de 24 de abril de 2024** — regulamento sobre comunicação de incidentes de segurança
- **Demais resoluções e guias orientativos** publicados pela Autoridade Nacional de Proteção de Dados (ANPD)

### 13.2. Foro

**Foro eleito:** comarca do **domicílio do usuário**, conforme Art. 101, I do Código de Defesa do Consumidor.

Esta regra de foro é **irrenunciável pelo usuário** e prevalece sobre qualquer outra cláusula eventualmente conflitante nestes Termos ou nesta Política.

### 13.3. Autoridade Nacional de Proteção de Dados (ANPD)

Caso você exerça algum dos direitos previstos na seção 7 desta Política e a resposta do DPO não seja satisfatória, ou não seja recebida no prazo de **15 dias corridos**, você pode formalizar reclamação direta à **Autoridade Nacional de Proteção de Dados (ANPD)**:

- **Site institucional:** https://www.gov.br/anpd/
- **Canal de atendimento ao cidadão:** https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao
- **Peticionamento eletrônico:** https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao/peticionamento

**Pré-requisito recomendado:** esgotar o contato direto com o DPO em sac.dietplan@gmail.com e aguardar o prazo de 15 dias antes de acionar a ANPD. Isso agiliza o atendimento da Autoridade, que prioriza casos onde o controlador foi previamente notificado.

### 13.4. Idioma oficial

Esta Política é redigida originalmente em **português do Brasil (PT-BR)**. Eventuais traduções futuras para outros idiomas serão fornecidas apenas por conveniência. **Em caso de divergência, conflito ou ambiguidade entre versões, a versão em PT-BR sempre prevalece** para todos os fins legais.

---

## 14. Contato

### 14.1. Encarregado pelo Tratamento de Dados Pessoais (Art. 41 LGPD)

O DietPLAN designa formalmente, nos termos do **Art. 41 da LGPD**, um Encarregado pelo Tratamento de Dados Pessoais (também conhecido como DPO — *Data Protection Officer*), responsável por:

- Receber e processar solicitações relacionadas a direitos do titular (seção 7)
- Receber e responder comunicações da ANPD
- Orientar o DietPLAN sobre práticas a serem adotadas em matéria de proteção de dados
- Executar as demais atribuições previstas no Art. 41, §2º da LGPD

### 14.2. Identificação do Encarregado

- **Identidade:** pessoa física mantenedora do DietPLAN (mesma pessoa responsável pelo desenvolvimento e operação do app)
- **Estrutura:** o DietPLAN é mantido de forma independente, sem pessoa jurídica constituída, por pessoa física atuando simultaneamente como desenvolvedor, controlador e Encarregado
- **Canal único de contato:** **sac.dietplan@gmail.com**
- **Tempo máximo de resposta:** 15 dias corridos (conforme Art. 18, §3º da LGPD), contados da data do recebimento da solicitação

### 14.3. Assuntos padronizados

Para acelerar a triagem, inclua no assunto do email um dos tags abaixo, seguido de descrição curta:

| Tag | Tipo de solicitação |
|---|---|
| `[LGPD]` | Exercício de direitos do titular (acesso, correção, portabilidade, exclusão, revogação de consentimento) |
| `[INCIDENTE]` | Reporte de incidente de segurança |
| `[CONTA]` | Problemas com acesso, recuperação ou exclusão de conta |
| `[SUPORTE]` | Dúvidas de uso do app |
| `[BUG]` | Reporte de erros e problemas técnicos |
| `[JURÍDICO]` | Notificações legais, ofícios, intimações |

Solicitações sem tag serão triadas manualmente e podem demorar mais pra receber resposta.

### 14.4. Canal único

**O email acima é o único canal oficial de contato** do DietPLAN. O DietPLAN **não opera** canais alternativos em redes sociais, mensageiros (WhatsApp, Telegram, Discord), SMS, ligações telefônicas ou qualquer outro meio. Se você for contatado por alguém se apresentando como "atendimento DietPLAN" por qualquer canal diferente do email oficial, **trate como tentativa de fraude** e reporte em `[INCIDENTE]`.

---

*DietPLAN é software livre, gratuito, sem garantias, mantido por pessoa física sem fins lucrativos. Este documento foi elaborado em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) e demais legislações brasileiras aplicáveis.*
