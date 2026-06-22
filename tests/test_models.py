from __future__ import annotations

from datetime import datetime, timezone

from backend.models import ChatMessage, ChatSession


class TestChatSession:
    def test_create_session_defaults(self, db_session):
        """Deve criar uma sessao com valores padrao."""
        session = ChatSession()
        db_session.add(session)
        db_session.commit()
        db_session.refresh(session)

        assert session.id is not None
        assert session.title is None
        assert isinstance(session.created_at, datetime)
        assert isinstance(session.updated_at, datetime)

    def test_session_title(self, db_session):
        """Deve criar uma sessao com titulo personalizado."""
        session = ChatSession(title="Minha Sessao")
        db_session.add(session)
        db_session.commit()
        db_session.refresh(session)

        assert session.title == "Minha Sessao"


class TestChatMessage:
    def _create_session(self, db_session) -> ChatSession:
        session = ChatSession()
        db_session.add(session)
        db_session.commit()
        db_session.refresh(session)
        return session

    def test_create_message_defaults(self, db_session):
        """Deve criar uma mensagem com valores padrao para model e created_at."""
        session = self._create_session(db_session)
        msg = ChatMessage(
            session_id=session.id,
            role="user",
            content="Ola, mundo!",
        )
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)

        assert msg.id is not None
        assert msg.session_id == session.id
        assert msg.role == "user"
        assert msg.content == "Ola, mundo!"
        assert msg.model == "google/gemma-4-31b-it"
        assert isinstance(msg.created_at, datetime)

    def test_create_message_custom_model(self, db_session):
        """Deve criar uma mensagem com modelo customizado."""
        session = self._create_session(db_session)
        msg = ChatMessage(
            session_id=session.id,
            role="user",
            content="Teste",
            model="openai/gpt-4o",
        )
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)

        assert msg.model == "openai/gpt-4o"

    def test_query_by_session_id(self, db_session):
        """Deve filtrar mensagens por session_id."""
        session1 = self._create_session(db_session)
        session2 = self._create_session(db_session)
        msg1 = ChatMessage(session_id=session1.id, role="user", content="a")
        msg2 = ChatMessage(session_id=session2.id, role="user", content="b")
        db_session.add_all([msg1, msg2])
        db_session.commit()

        results = (
            db_session.query(ChatMessage)
            .filter(ChatMessage.session_id == session1.id)
            .all()
        )
        assert len(results) == 1
        assert results[0].content == "a"

    def test_query_by_role(self, db_session):
        """Deve filtrar mensagens pelo campo role."""
        session = self._create_session(db_session)
        msg1 = ChatMessage(session_id=session.id, role="user", content="pergunta")
        msg2 = ChatMessage(session_id=session.id, role="assistant", content="resposta")
        db_session.add_all([msg1, msg2])
        db_session.commit()

        users = (
            db_session.query(ChatMessage)
            .filter(ChatMessage.role == "user")
            .all()
        )
        assistants = (
            db_session.query(ChatMessage)
            .filter(ChatMessage.role == "assistant")
            .all()
        )

        assert len(users) == 1
        assert len(assistants) == 1
        assert users[0].content == "pergunta"
        assert assistants[0].content == "resposta"

    def test_created_at_auto_set(self, db_session):
        """O campo created_at deve ser preenchido automaticamente com UTC now."""
        session = self._create_session(db_session)
        before = datetime.now(timezone.utc).replace(tzinfo=None)
        msg = ChatMessage(session_id=session.id, role="user", content="timestamp test")
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)
        after = datetime.now(timezone.utc).replace(tzinfo=None)

        assert before <= msg.created_at <= after

    def test_content_persists_long_text(self, db_session):
        """Deve persistir conteudos longos corretamente."""
        session = self._create_session(db_session)
        long_text = "Lorem ipsum " * 200
        msg = ChatMessage(session_id=session.id, role="user", content=long_text)
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)

        assert msg.content == long_text
