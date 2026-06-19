from __future__ import annotations

from fastapi.testclient import TestClient


class TestRegisterEndpoint:
    def test_register_success(self, client: TestClient):
        """Cadastro com dados validos retorna 201 e token."""
        response = client.post(
            "/api/auth/register",
            json={
                "first_name": "Joao",
                "last_name": "Silva",
                "email": "joao@teste.com",
                "password": "SenhaForte1",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert data["email"] == "joao@teste.com"
        assert data["first_name"] == "Joao"

    def test_register_duplicate_email(self, client: TestClient):
        """Email duplicado retorna 409."""
        client.post(
            "/api/auth/register",
            json={
                "first_name": "Joao",
                "last_name": "Silva",
                "email": "dupe@teste.com",
                "password": "SenhaForte1",
            },
        )
        response = client.post(
            "/api/auth/register",
            json={
                "first_name": "Maria",
                "last_name": "Souza",
                "email": "dupe@teste.com",
                "password": "OutraSenha1",
            },
        )
        assert response.status_code == 409

    def test_register_weak_password(self, client: TestClient):
        """Senha sem maiuscula ou numero retorna 422."""
        response = client.post(
            "/api/auth/register",
            json={
                "first_name": "Joao",
                "last_name": "Silva",
                "email": "fraca@teste.com",
                "password": "senhafraca",
            },
        )
        assert response.status_code == 422

    def test_register_short_password(self, client: TestClient):
        """Senha com menos de 8 caracteres retorna 422."""
        response = client.post(
            "/api/auth/register",
            json={
                "first_name": "Joao",
                "last_name": "Silva",
                "email": "curta@teste.com",
                "password": "Ab1",
            },
        )
        assert response.status_code == 422


class TestLoginEndpoint:
    def test_login_success(self, client: TestClient):
        """Login com credenciais validas retorna 200 e token."""
        client.post(
            "/api/auth/register",
            json={
                "first_name": "Joao",
                "last_name": "Silva",
                "email": "logintest@teste.com",
                "password": "SenhaForte1",
            },
        )
        response = client.post(
            "/api/auth/login",
            json={"email": "logintest@teste.com", "password": "SenhaForte1"},
        )
        assert response.status_code == 200
        assert "token" in response.json()

    def test_login_wrong_password(self, client: TestClient):
        """Senha incorreta retorna 401."""
        client.post(
            "/api/auth/register",
            json={
                "first_name": "Joao",
                "last_name": "Silva",
                "email": "wrongpw@teste.com",
                "password": "SenhaForte1",
            },
        )
        response = client.post(
            "/api/auth/login",
            json={"email": "wrongpw@teste.com", "password": "SenhaErrada2"},
        )
        assert response.status_code == 401

    def test_login_nonexistent_email(self, client: TestClient):
        """Email nao cadastrado retorna 401."""
        response = client.post(
            "/api/auth/login",
            json={"email": "naoexiste@teste.com", "password": "SenhaForte1"},
        )
        assert response.status_code == 401


class TestMeEndpoint:
    def test_me_authenticated(self, client: TestClient):
        """GET /api/auth/me com token valido retorna dados do usuario."""
        reg = client.post(
            "/api/auth/register",
            json={
                "first_name": "Maria",
                "last_name": "Souza",
                "email": "me@teste.com",
                "password": "SenhaForte1",
            },
        ).json()
        token = reg["token"]
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["email"] == "me@teste.com"

    def test_me_unauthenticated(self, client: TestClient):
        """GET /api/auth/me sem token retorna 401."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401


class TestLogoutEndpoint:
    def test_logout_success(self, client: TestClient):
        """POST /api/auth/logout com token valido retorna 200."""
        reg = client.post(
            "/api/auth/register",
            json={
                "first_name": "Joao",
                "last_name": "Silva",
                "email": "logout@teste.com",
                "password": "SenhaForte1",
            },
        ).json()
        response = client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {reg['token']}"},
        )
        assert response.status_code == 200

    def test_logout_unauthenticated(self, client: TestClient):
        """POST /api/auth/logout sem token retorna 401."""
        response = client.post("/api/auth/logout")
        assert response.status_code == 401


class TestPasswordValidation:
    def test_password_no_uppercase(self, client: TestClient):
        """Senha sem letra maiuscula e rejeitada."""
        response = client.post(
            "/api/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "noupper@teste.com",
                "password": "senha123",
            },
        )
        assert response.status_code == 422

    def test_password_no_digit(self, client: TestClient):
        """Senha sem numero e rejeitada."""
        response = client.post(
            "/api/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "nodigit@teste.com",
                "password": "SenhaForte",
            },
        )
        assert response.status_code == 422