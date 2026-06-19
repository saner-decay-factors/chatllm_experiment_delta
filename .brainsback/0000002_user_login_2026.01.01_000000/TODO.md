# Strategic Blueprint

> Focus on the **what** and **why**. The code will follow.

**Hard rule**: AI agents must not edit this file and must not draft paste-ready content for it.

## The Problem
_State clearly what you are trying to achieve and the architectural constraints, avoiding implementation specifics of HOW to do it. Focus on WHAT and WHY._

My Statement:
Our chatbot in its current version, lacks security login features. This results in a lack of security, user history and various other issues. We must remedy that by making an OPEN-AI inspired login feature, with email-password.

## Steps
- [ ] _Decompose the problem into actionable logical steps._
- [ ] _Each step should represent a verifiable piece of work._

-1° Criar uma tela inicial, onde o usuario pode escolher ou se cadastrar ou fazer Login
-2° Ao selecionar Cadastro, Iremos pedir: Nome, Sobrenome, Email, Senha]
-3° Creio que podemos usar um id numérico como PK, este sempre único para todo novo usuario cadastrado.
-4° salvar os dados que o usuario forneceu num banco de dados, que terá os dados dele, e onde iremos também atrelar suas sessoes com o chatbot
-5° Ao selecionar Login, o usuario deve colocar o email e senha que ele cadastrou, sem erros. Caso seja bem sucedido, ele é redirecionado para uma guia de nova sessão do chat bot, com a janela aberta para ele poder selecionar qualquer um de seus antigos chats. 
-6° cada passo tem sua própria tela, ou seja: 1 tela inicial de seleção entre cadastro/login, uma tela de cadastro, uma de login.
-7° Opção de logout no canto inferior esquerdo, Iremos criar como se fosse um Icone de usuario, utilizando como simbolo o primeiro caractere do email dele, ou seja: Canto inferior esquerdo terá um circulo com caracter(similar ao que tem o google) ao clicar, o usuario pode clicar numa opção de janela flutuante de deslogar, onde iremos apenas retornar para a pagina inicial de cadastro/login
## Success Looks Like
- [ ] _Define rigorous, observable criteria for success. E.g., The endpoint returns 200 OK with the user object, NOT Code compiles_

-Iniciar o programa automaticamente te leva para a tela de cadastro/login
-cadastrar manda o email com sucesso
-senha com ao menos 1 numero e uma letra maiuscula é sucesso
-salvar os dados do usuario no banco com sucesso
-login precisa bater com algum cadastro salvo no banco
-carregar os dados do usuario logado, iniciando na nova sessão, carregando seu historico de conversas, é sucesso máximo.
-garantir que estamos salvando tudo do usuario ao fazer logout, e que, no proximo login, de um diferente usuario, ele nao traga as coisas do usuario anterior para o novo

## Notes
- [ ] _Any specific edge cases, libraries to consider, or potential pitfalls._

-cuidado com carregar os dados do usuario logado, precismos ter certeza que vamos trazer apenas os chats desse usuario.
-cuidado para nao permitir que o mesmo email seja cadastrado 2 vezes. Precisamos de uma mensagem de erro para o usuario saber que este email já foi previamente cadastrado
-garantir que estamos salvando tudo do usuario ao fazer logout, e que, no proximo login, de um diferente usuario, ele nao traga as coisas do usuario anterior para o novo
-A senha obrigatoriamente deve conter uma letra maiuscula e pelo menos 1 numero


---
**⚠️ HUMAN ONLY**: This file is your strategic space. AI agents must not edit it.
