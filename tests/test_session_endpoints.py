from __future__ import annotations

from fastapi.testclient import TestClient


class TestSessionEndpoints:
    def test_list_sessions_empty(self, client: TestClient):
        """Listar sessoes com banco vazio retorna lista vazia."""
        response = client.get("/api/sessions")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_session(self, client: TestClient):
        """Criar sessao retorna 201 com id e timestamps."""
        response = client.post("/api/sessions", json={})
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["title"] == ""
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_and_list(self, client: TestClient):
        """Apos criar, a sessao deve aparecer na lista."""
        created = client.post("/api/sessions", json={}).json()
        response = client.get("/api/sessions")
        assert response.status_code == 200
        ids = [s["id"] for s in response.json()]
        assert created["id"] in ids

    def test_get_session_by_id(self, client: TestClient):
        """Buscar sessao por id retorna a sessao correta."""
        created = client.post("/api/sessions", json={}).json()
        response = client.get(f"/api/sessions/{created['id']}")
        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

    def test_get_session_not_found(self, client: TestClient):
        """Buscar sessao inexistente retorna 404."""
        response = client.get("/api/sessions/99999")
        assert response.status_code == 404
        assert "nao encontrada" in response.json()["detail"]

    def test_delete_session(self, client: TestClient):
        """Deletar sessao retorna 204 e a sessao some da lista."""
        created = client.post("/api/sessions", json={}).json()
        delete_resp = client.delete(f"/api/sessions/{created['id']}")
        assert delete_resp.status_code == 204

        get_resp = client.get(f"/api/sessions/{created['id']}")
        assert get_resp.status_code == 404

    def test_delete_session_not_found(self, client: TestClient):
        """Deletar sessao inexistente retorna 404."""
        response = client.delete("/api/sessions/99999")
        assert response.status_code == 404

    def test_get_session_messages_empty(self, client: TestClient):
        """Listar mensagens de sessao vazia retorna []."""
        created = client.post("/api/sessions", json={}).json()
        response = client.get(f"/api/sessions/{created['id']}/messages")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_session_messages_not_found(self, client: TestClient):
        """Listar mensagens de sessao inexistente retorna 404."""
        response = client.get("/api/sessions/99999/messages")
        assert response.status_code == 404

    def test_create_multiple_sessions_ordering(self, client: TestClient):
        """Sessoes sao listadas em ordem decrescente de updated_at."""
        s1 = client.post("/api/sessions", json={}).json()
        s2 = client.post("/api/sessions", json={}).json()
        response = client.get("/api/sessions")
        data = response.json()
        # A mais recente vem primeiro
        assert data[0]["id"] == s2["id"]
        assert data[1]["id"] == s1["id"]

    def test_chat_auto_creates_session(self, client: TestClient):
        """Enviar mensagem sem session_id cria nova sessao automaticamente."""
        response = client.post(
            "/api/chat",
            json={"message": "Ola"},
        )
        # Espera 503 por falta de API key, mas nao 404 ou 422 de sessao
        assert response.status_code in (200, 422, 503)

        # Verifica que uma sessao foi criada
        sessions = client.get("/api/sessions").json()
        assert len(sessions) >= 1

    def test_chat_with_valid_session_id(self, client: TestClient):
        """Enviar mensagem com session_id valido usa a sessao existente."""
        session = client.post("/api/sessions", json={}).json()
        response = client.post(
            "/api/chat",
            json={"message": "Ola", "session_id": session["id"]},
        )
        assert response.status_code in (200, 422, 503)

        # Mensagem deve ter sido associada a sessao
        msgs = client.get(f"/api/sessions/{session['id']}/messages").json()
        # Se o chat falhou por API key, nao ha mensagens
        if response.status_code == 200:
            assert len(msgs) > 0

    def test_chat_with_invalid_session_id(self, client: TestClient):
        """Enviar mensagem com session_id inexistente retorna 404."""
        response = client.post(
            "/api/chat",
            json={"message": "Ola", "session_id": 99999},
        )
        assert response.status_code == 404
        assert "nao encontrada" in response.json()["detail"]