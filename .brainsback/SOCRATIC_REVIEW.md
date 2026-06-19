# Revisão Socrática

## Q1 — Título automático: critério de corte

**Pergunta:** O título automático usa os primeiros 60 caracteres da mensagem do usuário. Em que cenário isso poderia gerar um título enganoso ou pouco útil, e como você melhoraria?

**Resposta:** O título é a própria primeira mensagem do usuário cortada dentro do limite de caracteres. O usuário reconhece a limitação mas não vê problema grave no escopo do experimento.

## Q2 — Segurança: JWT no localStorage

**Pergunta:** O token JWT fica armazenado no localStorage do navegador. Consegue pensar em uma vulnerabilidade dessa abordagem comparada a usar cookies HttpOnly?

**Resposta:** Cookies de sessão exigem que o servidor guarde uma tabela de sessões ativas no banco. O JWT é stateless — o servidor só verifica a assinatura, sem consultar banco. É uma troca entre simplicidade vs controle.

## Q3 — Isolamento entre usuários

**Pergunta:** Se o usuário A enviar um session_id que pertence ao usuário B, o que impede ele de acessar a sessão alheia?

**Resposta:** O usuário identificou que isso não deveria ser possível. Corrigido com verificação de ownership no _resolve_session: se user != None e session.user_id != user.id, retorna 403. 3 novos testes de isolamento criados. 83 testes passando.

## Q4 — Tratamento de erros no registro

**Pergunta:** No cadastro, retornamos 409 para email duplicado e 422 para senha fraca. O frontend mostra esses erros. Você vê algum problema de segurança em informar que um email "ja esta cadastrado"?

**Resposta:** O usuário identificou que isso permite que um atacante descubra quais emails estão cadastrados (enumeração de contas), mas também reconhece que o usuário legítimo precisa saber se já está cadastrado. É um trade-off entre segurança e usabilidade.

## Q5 — Sessões órfãs (user_id = NULL)

**Pergunta:** Sessões criadas antes do login têm user_id = NULL e ficam invisíveis após o login. Como resolver?

**Resposta:** O usuário observou que, com o fluxo atual (tela de login primeiro), sessões sem login nunca são criadas na prática. Sessões órfãs só existiriam em cenário hipotético, e não fazer sentido atrelá-las sem um usuário.

## Q6 — Logout: stateless vs stateful

**Pergunta:** Se um token JWT for roubado, ele pode ser usado por até 24h. Consegue pensar em duas formas de invalidar o token antes do prazo?

**Resposta:** O usuário sugeriu uma blacklist de tokens — ao fazer logout, o token é adicionado a uma lista negra no banco. O agente complementou com refresh tokens de curta duração como alternativa.

## Q7 — Comparativo Tarefa 1 vs Tarefa 2

**Pergunta:** Qual diferença você sentiu entre o modo livre (T1) e o modo pipeline (T2)?

**Resposta:** O usuário achou o pipeline burocrático, especialmente o REACTO.md — difícil acompanhar 12 mudanças simultâneas do agente. Por outro lado, achou o TODO.md fantástico: ajuda a estruturar o pensamento e guiar a IA. Acredita que com prática os TODOs ficarão cada vez melhores.

---

## Veredito Final

**Mastery: ATINGIDO** ✅

O participante demonstrou:
- Compreensão clara do problema de autenticação e da solução implementada
- Capacidade de identificar falhas de segurança (isolamento entre usuários) e sugerir correções
- Entendimento dos trade-offs entre JWT stateless vs cookies de sessão
- Consciência dos riscos de segurança (enumeração de emails, token no localStorage)
- Visão crítica sobre o processo do pipeline, diferenciando o que funcionou bem (TODO.md) do que achou burocrático (REACTO.md)

O repositório está pronto para commit e Pull Request.