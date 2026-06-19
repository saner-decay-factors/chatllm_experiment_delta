const API_BASE = window.location.origin;

/* ───── Session management ───── */

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Erro ${response.status}`);
  }
  return response.json();
}

function listSessions() {
  return apiFetch("/api/sessions");
}

function createSession() {
  return apiFetch("/api/sessions", { method: "POST" });
}

function getSession(sessionId) {
  return apiFetch(`/api/sessions/${sessionId}`);
}

function updateSessionTitle(sessionId, title) {
  return apiFetch(`/api/sessions/${sessionId}/title`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
}

function deleteSession(sessionId) {
  return apiFetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
}

/* ───── Chat streaming ───── */

async function sendMessageStream({ message, history, sessionId, signal, onDelta }) {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, session_id: sessionId }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body?.detail || "Erro ao enviar mensagem para o servidor.";
    throw new Error(detail);
  }

  if (!response.body) {
    throw new Error("Streaming nao suportado no ambiente atual.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalSessionId = sessionId;
  let finalSessionTitle = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      const line = rawEvent
        .split("\n")
        .find((part) => part.startsWith("data:"));
      if (!line) continue;

      const payloadText = line.slice(5).trim();
      if (!payloadText) continue;

      let payload;
      try {
        payload = JSON.parse(payloadText);
      } catch {
        continue;
      }

      if (payload.error) {
        throw new Error(payload.error);
      }

      if (payload.delta) {
        onDelta(payload.delta);
      }

      if (payload.done) {
        finalSessionId = payload.session_id;
        finalSessionTitle = payload.session_title;
      }
    }
  }

  return { sessionId: finalSessionId, sessionTitle: finalSessionTitle };
}
