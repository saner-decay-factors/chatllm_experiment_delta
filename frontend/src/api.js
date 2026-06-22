const API_BASE = window.location.origin;
// ---- Auth ----

async function checkAuth() {
  const response = await fetch(`${API_BASE}/api/auth/me`);
  if (!response.ok) return null;
  return response.json();
}

async function registerUser(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Erro ao cadastrar.");
  return data;
}

async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Erro ao fazer login.");
  return data;
}

async function logoutUser() {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Erro ao fazer logout.");
  return response.json();
}

// ---- Chat ----
async function sendMessageStream({ message, history, sessionId, onDelta, onDone, signal }) {
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
        if (onDone) onDone(payload.session_id, payload.title);
      }
    }
  }
}

async function fetchSessions() {
  const response = await fetch(`${API_BASE}/api/sessions`);
  if (!response.ok) throw new Error("Erro ao carregar sessoes.");
  return response.json();
}

async function createSession() {
  const response = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error("Erro ao criar sessao.");
  return response.json();
}

async function deleteSession(id) {
  const response = await fetch(`${API_BASE}/api/sessions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) throw new Error("Erro ao excluir sessao.");
}

async function fetchSessionMessages(sessionId) {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`);
  if (!response.ok) throw new Error("Erro ao carregar mensagens.");
  return response.json();
}
