const API_BASE = window.location.origin;

/* ---------- Token ---------- */

function getToken() {
  return localStorage.getItem("chatllm_token");
}

function setToken(token) {
  localStorage.setItem("chatllm_token", token);
}

function clearToken() {
  localStorage.removeItem("chatllm_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

/* ---------- Auth API ---------- */

async function registerUser(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(data.detail) ? data.detail[0]?.msg || "Erro de validação" : data.detail || "Erro ao cadastrar";
    throw new Error(msg);
  }
  setToken(data.access_token);
  return data;
}

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(data.detail) ? data.detail[0]?.msg || "Erro de validação" : data.detail || "Erro ao entrar";
    throw new Error(msg);
  }
  setToken(data.access_token);
  return data;
}

async function fetchMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

function logoutUser() {
  clearToken();
}

/* ---------- Sessions API ---------- */

async function listSessions() {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao listar sessoes");
  const data = await res.json();
  return data.sessions;
}

async function createSession() {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Erro ao criar sessao");
  return res.json();
}

async function deleteSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao excluir sessao");
}

async function getSessionMessages(sessionId) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao carregar mensagens da sessao");
  return res.json();
}

/* ---------- Chat API ---------- */

async function sendMessageStream({ message, history, sessionId, onDelta, signal }) {
  const body = { message, history };
  if (sessionId != null) body.session_id = sessionId;

  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
    }
  }
}
