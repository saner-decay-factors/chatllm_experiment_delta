# Implementation Report

> A concise summary for the reviewer.

**Reviewer note**: If a PR modifies `.brainsback/<task-folder>/TODO.md` or `.brainsback/<task-folder>/REACTO.md`, assume this is expected and that those files were modified by the human developer.
If present, use `.github/skills/brainsback-reviewer/SKILL.md` as the review rubric.

## Snapshot
- **Change**: Implementação completa de login/logout com email e senha
- **Status**: Concluído

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `backend/models.py` | Nova classe `User` (id, email, hashed_password, created_at). `ChatSession.user_id` adicionado |
| `backend/schemas/auth.py` | Schemas `RegisterRequest`, `LoginRequest`, `AuthResponse`, `UserOut` |
| `backend/services/auth.py` | `hash_password()`, `verify_password()`, `create_access_token()`, `decode_access_token()`, `get_current_user()` |
| `backend/routers/auth.py` | Endpoints `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| `frontend/src/LoginScreen.jsx` | Tela de login/registro com toggle entre modos |
| `frontend/src/api.js` | Funções `registerUser()`, `loginUser()`, `fetchMe()`, `logoutUser()`, `getToken()`, gestão de token no localStorage |

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `backend/config.py` | Adicionados `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRATION_MINUTES` |
| `backend/main.py` | Router de auth registrado |
| `backend/routers/chat.py` | Endpoints protegidos com `Depends(get_current_user)`; `_resolve_session` usa `user_id` |
| `backend/routers/sessions.py` | Endpoints protegidos; filtro por `user_id`; helper `_get_session_or_404` |
| `frontend/src/App.jsx` | Fluxo de auth: estado `user` (null/loading, false/login, objeto/logado), guard condicional, botão Sair |
| `frontend/index.html` | CSS do LoginScreen, botão Sair, loading screen |
| `tests/conftest.py` | Fixtures `test_user`, `auth_token`, `auth_headers` |
| `tests/test_chat.py` | Testes atualizados para usar autenticação |

## Core logic

- **Hash**: bcrypt via passlib (senhas nunca armazenadas em texto puro)
- **Token**: JWT (HS256, 24h de expiração) armazenado no `localStorage`
- **Proteção**: Todos os endpoints de chat e sessões exigem `Authorization: Bearer <token>`
- **Frontend**: Tela de login exibida se não há token ou token inválido. Logout limpa token e volta à tela de login
- **Email duplicado**: retorna 409 Conflict
- **Senha errada**: retorna 401 Unauthorized (sem revelar qual campo está errado)

## Dependências adicionadas

- `passlib[bcrypt]` — hash de senha
- `python-jose[cryptography]` — JWT
- `bcrypt<5.0` — compatibilidade com passlib

## Testes

- **43/43 testes passando** (2 novos testes de auth + 4 atualizados para usar auth)
- Cobertura: health, root, chat (protegido), stream (protegido), CORS, models, schemas, openrouter

## Limitações conhecidas

- O token JWT é armazenado em `localStorage` (vulnerável a XSS — aceitável para experimento)
- Race condition em `_resolve_session` (criação duplicada de sessão) não resolvida
- Streaming (`event_generator`) compartilha a mesma Session SQLAlchemy — risco potencial 

## The Changes
- [ ] 

## Testing Strategy
_How we ensured it works._

## Risks & Follow-up
- [ ] 

---
**Note**: Usually filled by the AI.
