const { useEffect, useMemo, useRef, useState, useCallback } = React;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function App() {
  const [user, setUser] = useState(null); // null = loading, false = not logged in, object = logged in
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Check auth on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(false);
      return;
    }
    fetchMe().then((userData) => {
      if (userData) {
        setUser(userData);
      } else {
        clearToken();
        setUser(false);
      }
    }).catch(() => {
      clearToken();
      setUser(false);
    });
  }, []);

  // Load sessions once authenticated
  useEffect(() => {
    if (!user) return;
    listSessions().then((sessionList) => {
      setSessions(sessionList);
      if (sessionList.length > 0) {
        setActiveSessionId(sessionList[0].id);
        loadSessionMessages(sessionList[0].id);
      }
    }).catch(() => {});
  }, [user]);

  const loadSessionMessages = useCallback(async (sessionId) => {
    try {
      const msgs = await getSessionMessages(sessionId);
      if (msgs.length === 0) {
        setMessages([{
          id: createMessageId(),
          role: "assistant",
          content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
        }]);
      } else {
        setMessages(msgs.map((m) => ({ id: `${sessionId}-${m.id}`, role: m.role, content: m.content })));
      }
    } catch {
      setMessages([{
        id: createMessageId(),
        role: "assistant",
        content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
      }]);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    const sessionList = await listSessions();
    setSessions(sessionList);
    return sessionList;
  }, []);

  const handleSelectSession = useCallback(async (sessionId) => {
    if (busy) {
      abortControllerRef.current?.abort();
      setBusy(false);
    }
    setActiveSessionId(sessionId);
    await loadSessionMessages(sessionId);
  }, [busy, loadSessionMessages]);

  const handleNewSession = useCallback(async () => {
    try {
      const session = await createSession();
      const sessionList = await refreshSessions();
      setActiveSessionId(session.id);
      setMessages([{
        id: createMessageId(),
        role: "assistant",
        content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
      }]);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [refreshSessions]);

  const handleDeleteSession = useCallback(async (sessionId) => {
    try {
      await deleteSession(sessionId);
      const sessionList = await refreshSessions();
      if (sessionId === activeSessionId) {
        if (sessionList.length > 0) {
          setActiveSessionId(sessionList[0].id);
          await loadSessionMessages(sessionList[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([{
            id: createMessageId(),
            role: "assistant",
            content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
          }]);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  }, [activeSessionId, refreshSessions, loadSessionMessages]);

  const handleLogout = () => {
    logoutUser();
    setUser(false);
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
    setBusy(false);
  };

  const chatHistory = useMemo(
    () => messages.filter((msg) => msg.role === "user" || msg.role === "assistant"),
    [messages]
  );

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
        history: chatHistory,
        sessionId: activeSessionId,
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

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId && !msg.content.trim()
            ? { ...msg, content: "Nao foi possivel obter resposta do modelo agora." }
            : msg
        )
      );

      await refreshSessions();
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

  // Auth guard: show login screen
  if (user === null) {
    return (
      <main className="app-shell">
        <div className="loading-screen">Carregando...</div>
      </main>
    );
  }

  if (user === false) {
    return <LoginScreen onAuthSuccess={() => {
      fetchMe().then(setUser);
    }} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        hidden={!sidebarOpen}
      />

      <main className="app-shell">
        <header className="app-header">
          <div className="header-left">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Alternar sidebar">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="4" x2="15" y2="4" />
                <line x1="3" y1="9" x2="15" y2="9" />
                <line x1="3" y1="14" x2="15" y2="14" />
              </svg>
            </button>
          </div>
          <div className="brand">ChatLLM Lab</div>
          <div className="header-right">
            <button className="logout-btn" onClick={handleLogout} title="Sair">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="2" x2="6" y2="8" />
                <line x1="10" y1="4" x2="10" y2="14" />
                <line x1="2" y1="8" x2="10" y2="8" />
                <polyline points="8,6 10,8 8,10" />
              </svg>
              Sair
            </button>
          </div>
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

