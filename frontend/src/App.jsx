const { useEffect, useMemo, useRef, useState } = React;

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
  const [initializing, setInitializing] = useState(true);
  const messagesRef = useRef(null);
  const abortControllerRef = useRef(null);

  const chatHistory = useMemo(
    () => messages.filter((msg) => msg.role === "user" || msg.role === "assistant"),
    [messages]
  );

  /* ─── Scroll ao fim ─── */
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  /* ─── Cleanup ─── */
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /* ─── Carregar sessoes ao iniciar ─── */
  useEffect(() => {
    (async () => {
      try {
        let list = await listSessions();
        if (list.length === 0) {
          const newSession = await createSession();
          list = [newSession];
        }
        setSessions(list);
        const targetId = list[0].id;
        setActiveSessionId(targetId);
        loadSessionMessages(targetId);
      } catch (err) {
        console.error("Falha ao carregar sessoes:", err);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  /* ─── Carregar mensagens de uma sessao ─── */
  async function loadSessionMessages(sessionId) {
    try {
      const sessionData = await getSession(sessionId);
      if (sessionData.messages.length === 0) {
        setMessages([WELCOME_MESSAGE]);
      } else {
        setMessages(
          sessionData.messages.map((m) => ({
            id: `msg-${m.id}`,
            role: m.role,
            content: m.content,
          }))
        );
      }
    } catch (err) {
      console.error("Falha ao carregar mensagens:", err);
      setMessages([WELCOME_MESSAGE]);
    }
  }

  /* ─── Selecionar sessao ─── */
  function handleSelectSession(sessionId) {
    if (busy) return;
    abortControllerRef.current?.abort();
    setActiveSessionId(sessionId);
    loadSessionMessages(sessionId);
    setError("");
  }

  /* ─── Nova sessao ─── */
  async function handleNewSession() {
    if (busy) return;
    try {
      const newSession = await createSession();
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([WELCOME_MESSAGE]);
      setError("");
    } catch (err) {
      setError("Falha ao criar nova sessao.");
    }
  }

  /* ─── Excluir sessao ─── */
  async function handleDeleteSession(sessionId) {
    if (busy) return;
    try {
      await deleteSession(sessionId);
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      if (activeSessionId === sessionId) {
        if (updated.length > 0) {
          const nextId = updated[0].id;
          setActiveSessionId(nextId);
          loadSessionMessages(nextId);
        } else {
          const newSession = await createSession();
          setSessions([newSession]);
          setActiveSessionId(newSession.id);
          setMessages([WELCOME_MESSAGE]);
        }
      }
    } catch (err) {
      setError("Falha ao excluir sessao.");
    }
  }

  /* ─── Atualizar titulo na lista ─── */
  function updateSessionTitleInList(sessionId, title) {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
    );
  }

  /* ─── Parar ─── */
  const onStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setBusy(false);
  };

  /* ─── Enviar mensagem ─── */
  const onSubmit = async (event, inputRef) => {
    event.preventDefault();
    const cleaned = text.trim();
    if (!cleaned || busy) return;

    setError("");
    const userMessage = { id: createMessageId(), role: "user", content: cleaned };
    const assistantMessageId = createMessageId();
    const currentSessionId = activeSessionId;

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
      const result = await sendMessageStream({
        message: cleaned,
        history: chatHistory,
        sessionId: currentSessionId,
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

      // Update active session ID if a new one was created server-side
      if (result.sessionId && result.sessionId !== currentSessionId) {
        setActiveSessionId(result.sessionId);
      }

      // Update title if generated
      if (result.sessionTitle && result.sessionTitle !== "Nova conversa") {
        updateSessionTitleInList(result.sessionId || currentSessionId, result.sessionTitle);
        // Also refresh the sessions list to get accurate titles
        try {
          const list = await listSessions();
          setSessions(list);
        } catch { /* ignore */ }
      }

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
              ? {
                  ...msg,
                  content: msg.content.trim()
                    ? msg.content
                    : "Nao foi possivel obter resposta do modelo agora.",
                }
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

  if (initializing) {
    return (
      <main className="app-shell">
        <div className="loading-screen">Carregando...</div>
      </main>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        sidebarOpen={sidebarOpen}
      />

      <main className="app-shell">
        <header className="app-header">
          <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Alternar sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
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

        <div className="warning-banner">
          Lembre-se, voce precisa focar no experimento!!!
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

