from __future__ import annotations

from datetime import datetime

import pytest
from pydantic import ValidationError

from backend.schemas.session import SessionCreate, SessionOut, SessionTitleUpdate, SessionMessageOut


class TestSessionCreate:
    def test_create_valid(self):
        """SessionCreate aceita corpo vazio (sem campos obrigatorios)."""
        obj = SessionCreate()
        assert isinstance(obj, SessionCreate)


class TestSessionOut:
    def test_valid_output(self):
        """SessionOut aceita campos tipados corretamente."""
        now = datetime.now()
        obj = SessionOut(
            id=1,
            title="Minha sessao",
            created_at=now,
            updated_at=now,
        )
        assert obj.id == 1
        assert obj.title == "Minha sessao"

    def test_title_default_empty(self):
        """SessionOut com title padrao deve ser string vazia."""
        now = datetime.now()
        obj = SessionOut(
            id=2,
            title="",
            created_at=now,
            updated_at=now,
        )
        assert obj.title == ""

    def test_from_attributes_config(self):
        """SessionOut deve ter from_attributes=True."""
        assert SessionOut.model_config["from_attributes"] is True


class TestSessionTitleUpdate:
    def test_valid_title(self):
        """Deve aceitar titulo valido."""
        obj = SessionTitleUpdate(title="Novo titulo")
        assert obj.title == "Novo titulo"

    def test_empty_title_rejected(self):
        """Titulo vazio deve ser rejeitado."""
        with pytest.raises(ValidationError):
            SessionTitleUpdate(title="")

    def test_title_too_long(self):
        """Titulo com mais de 255 chars deve ser rejeitado."""
        with pytest.raises(ValidationError):
            SessionTitleUpdate(title="x" * 256)


class TestSessionMessageOut:
    def test_valid_message(self):
        """SessionMessageOut aceita campos tipados corretamente."""
        now = datetime.now()
        obj = SessionMessageOut(
            id=10,
            role="user",
            content="Ola",
            model="google/gemma-4-31b-it",
            created_at=now,
        )
        assert obj.id == 10
        assert obj.role == "user"
        assert obj.content == "Ola"

    def test_from_attributes_config(self):
        """SessionMessageOut deve ter from_attributes=True."""
        assert SessionMessageOut.model_config["from_attributes"] is True