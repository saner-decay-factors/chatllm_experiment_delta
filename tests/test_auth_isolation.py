from __future__ import annotations

from fastapi.testclient import TestClient


def _register_user(client, email: str, password: str = "SenhaForte1"):
    return client.post(
        "/api/auth/register",
        json={
            "first_name": "Test",
            "last_name": "User",
            "email": email,
            "password": password,
        },
    ).json()


class TestSessionIsolation:
    def test_user_cannot_access_other_users_session(self, client: TestClient):
        """Usuario A nao pode enviar mensagem na sessao do usuario B."""
        user_a = _register_user(client, "alice@test.com")
        user_b = _register_user(client, "bob@test.com")

        # Usuario B cria uma sessao
        token_b = user_b["token"]
        session_b = client.post(
            "/api/sessions",
            json={},
            headers={"Authorization": f"Bearer {token_b}"},
        ).json()

        # Usuario A tenta usar a sessao do B
        token_a = user_a["token"]
        response = client.post(
            "/api/chat",
            json={"message": "Ola", "session_id": session_b["id"]},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert response.status_code == 403
        assert "nao pertence" in response.json()["detail"]

    def test_user_cannot_access_other_users_session_stream(self, client: TestClient):
        """Usuario A nao pode usar /chat/stream na sessao do usuario B."""
        user_a = _register_user(client, "carol@test.com")
        user_b = _register_user(client, "dave@test.com")

        token_b = user_b["token"]
        session_b = client.post(
            "/api/sessions",
            json={},
            headers={"Authorization": f"Bearer {token_b}"},
        ).json()

        token_a = user_a["token"]
        # For streaming, we just check the response status
        response = client.post(
            "/api/chat/stream",
            json={"message": "Ola", "session_id": session_b["id"]},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        # Should fail with 403 before any streaming
        assert response.status_code == 403

    def test_anonymous_user_can_use_own_sessions(self, client: TestClient):
        """Usuario anonimo pode usar sessoes sem user_id (legado)."""
        session = client.post("/api/sessions", json={}).json()
        response = client.post(
            "/api/chat",
            json={"message": "Ola", "session_id": session["id"]},
        )
        assert response.status_code in (200, 422, 503)