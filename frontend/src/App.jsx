const { useEffect, useMemo, useRef, useState, useCallback } = React;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const WELCOME_MESSAGE = {
  id: createMessageId(),
  role: "assistant",
  content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
};

function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesRef = useRef(null);
  const abortControllerRef = useRef(null);

  const chatHistory = useMemo(
    () => messages.filter((msg) => msg.role === "user" || msg.role === "assistant"),
    [messages]
  );

  /* ─── Load sessions on mount ─── */
  useEffect(() => {
    (async () => {
      try {
        const data = await listSessions();
        setSessions(data);
        if (data.length > 0) {
          setActiveSessionId(data[0].id);
          const msgs = await getSessionMessages(data[0].id);
          if (msgs.length > 0) {
            setMessages(
              msgs.map((m) => ({
                id: createMessageId(),
                role: m.role,
                content: m.content,
              }))
            );
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoadingSessions(false);
      }
    })();
  }, []);

  async function loadSessions() {
    // Only refresh the sessions list — does NOT clear messages or switch
    try {
      const data = await listSessions();
      setSessions(data);
      return data;
    } catch {
      return [];
    }
  }

  async function switchSession(sessionId) {
    if (busy) return;
    setActiveSessionId(sessionId);
    setMessages([WELCOME_MESSAGE]);
    setError("");
    try {
      const msgs = await getSessionMessages(sessionId);
      if (msgs.length > 0) {
        setMessages(
          msgs.map((m) => ({
            id: createMessageId(),
            role: m.role,
            content: m.content,
          }))
        );
      }
    } catch {
      // keep welcome message
    }
  }

  async function handleNewSession() {
    if (busy) return;
    try {
      const session = await createSession();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([WELCOME_MESSAGE]);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteSession(sessionId) {
    if (busy) return;
    try {
      await deleteSession(sessionId);
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      if (activeSessionId === sessionId) {
        if (updated.length > 0) {
          switchSession(updated[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([WELCOME_MESSAGE]);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function formatTitle(session) {
    let title = session.title || "Nova sessao";
    if (title.length > 30) title = title.slice(0, 27) + "...";
    return title;
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const onStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setBusy(false);
  };

  const onSubmit = async (event, inputRef) => {
    event.preventDefault();
    const cleaned = text.trim();
    if (!cleaned || busy) return;

    setError("");
    const userMessage = { id: createMessageId(), role: "user", content: cleaned };
    const assistantMessageId = createMessageId();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);
    setText("");
    setBusy(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await sendMessageStream({
        message: cleaned,
        sessionId: activeSessionId, // null if none active → backend creates one
        history: chatHistory,
        signal: abortController.signal,
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: `${msg.content}${delta}` }
                : msg
            )
          );
        },
      });

      // Update sidebar without touching messages
      const updatedSessions = await listSessions();
      setSessions(updatedSessions);

      // If we created a new session, track its id
      if (!activeSessionId && updatedSessions.length > 0) {
        setActiveSessionId(updatedSessions[0].id);
      }

      // If response is empty, show fallback
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId && !msg.content.trim()
            ? { ...msg, content: "Nao foi possivel obter resposta do modelo agora." }
            : msg
        )
      );
    } catch (err) {
      const aborted = err?.name === "AbortError";
      if (!aborted) {
        setError(err.message || "Falha inesperada ao gerar resposta.");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content.trim() ? msg.content : "Nao foi possivel obter resposta do modelo agora." }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId && !msg.content.trim()
              ? { ...msg, content: "Resposta interrompida." }
              : msg
          )
        );
      }
    } finally {
      abortControllerRef.current = null;
      setBusy(false);
    }
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <button className="sidebar-new-btn" onClick={handleNewSession} disabled={busy}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="8" y1="2" x2="8" y2="14" />
              <line x1="2" y1="8" x2="14" y2="8" />
            </svg>
            Nova sessao
          </button>
          <button className="sidebar-toggle-open" onClick={toggleSidebar} title="Fechar sidebar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </svg>
          </button>
        </div>
        <div className="sidebar-list">
          {loadingSessions ? (
            <div className="sidebar-loading">Carregando...</div>
          ) : sessions.length === 0 ? (
            <div className="sidebar-empty">Nenhuma sessao ainda</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`sidebar-item ${session.id === activeSessionId ? "active" : ""}`}
                onClick={() => switchSession(session.id)}
              >
                <div className="sidebar-item-title">{formatTitle(session)}</div>
                <div className="sidebar-item-meta">
                  <span>{timeAgo(session.updated_at)}</span>
                  <button
                    className="sidebar-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    disabled={busy}
                    title="Excluir sessao"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <line x1="2" y1="2" x2="10" y2="10" />
                      <line x1="10" y1="2" x2="2" y2="10" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Toggle button (visible when sidebar closed) */}
      {!sidebarOpen && (
        <button className="sidebar-toggle-closed" onClick={toggleSidebar} title="Abrir sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="4" x2="17" y2="4" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="16" x2="17" y2="16" />
          </svg>
        </button>
      )}

      {/* Main area */}
      <main className="app-shell">
        <header className="app-header">
          <div className="brand">ChatLLM Lab</div>
        </header>

        <section className="messages" aria-live="polite" ref={messagesRef}>
          <div className="messages-inner">
            {messages.map((msg) => (
              <article key={msg.id} className={`bubble ${msg.role}`}>
                <MessageContent content={msg.content} />
              </article>
            ))}
          </div>
        </section>

        <Composer
          text={text}
          busy={busy}
          error={error}
          onChangeText={setText}
          onSubmit={onSubmit}
          onStop={onStop}
        />

        <div className="warning-banner">Lembre-se, voce precisa focar no experimento!!!</div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

