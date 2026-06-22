# Strategic Blueprint

> Focus on the **what** and **why**. The code will follow.

**Hard rule**: AI agents must not edit this file and must not draft paste-ready content for it.

## The Problem
Atualmente a aplicação não tem nenhuma forma de autenticação, possivelmente misturando dados entre usuários diferentes. Quero implementar uma autenticação por email e senha, onde precisamos validar o email e guardar a senha no banco de dados encriptada, para que haja proteção dos dados do usuário. Precisamos de uma tela de login se ele já for cadastrado e uma tela de cadastro se ele nunca tiver se cadastrado na aplicação. Além disso precisamos permitir que o usuário possa se deslogar da aplicação. Precisamos salvar os dados de usuário na base de dados persistidos.

## Steps
- [ ] definir o modelo de dados (schema) de um usuário na aplicação, juntamente com seu email e senha.
- [ ] definir o modelo de dados da base de dados, de um usuário na aplicação, juntamente com seu email e senha.
- [ ] criar as rotas para login e registration e logout.
- [ ] protejer as rotas atuais para que só usuarios autenticados possam usar.
- [ ] para pegar os dados de chats de cada usuário utilizando o ID do próprio.
- [ ] Front - Criar um componente para registro e para login.
- [ ] Front - Adaptar as páginas atuais para indicar que há autenticcação de usuário
- [ ] Front - Botão para logout

## Success Looks Like
- [ ] Ao logar os chats da pessoa devem aparecer, apenas os criados por ele
- [ ] a rota de login deve retornar 200 e ter exito se o usuario passar login e senha corretos
- [ ] a rota de registration deve retornar 200 e ter exito se o usuario passar login e senha válidos (regex de email e senha com mais de 4 caracteres)
- [ ] a rota de logout deve retornar 200 se o usuário estiver autenticado e desejar dar logout.

## Notes
- [ ] Guarde a sessão nos cookies.

---
**⚠️ HUMAN ONLY**: This file is your strategic space. AI agents must not edit it.
