const { useEffect, useMemo, useRef, useState } = React;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadSessionMessages(sessionId, sessionsList, setMessagesFn, setActiveFn) {
  try {
    const msgs = await fetchSessionMessages(sessionId);
    setMessagesFn(
      msgs.length > 0
        ? msgs.map((m) => ({ id: createMessageId(), ...m }))
        : [
            {
              id: createMessageId(),
              role: "assistant",
              content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
            },
          ]
    );
    setActiveFn(sessionId);
  } catch (err) {
    console.error(err);
  }
}

function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authPage, setAuthPage] = useState("login"); // "login" | "register"

  // Chat state
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Check auth on mount
  useEffect(() => {
    (async () => {
      try {
        const u = await checkAuth();
        setUser(u);
      } catch {} finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // Load sessions when user changes
  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const list = await fetchSessions();
        setSessions(list);
        if (list.length > 0) {
          await loadSessionMessages(list[0].id, list, setMessages, setActiveSessionId);
        } else {
          const session = await createSession();
          setSessions([session]);
          setActiveSessionId(session.id);
          setMessages([
            {
              id: createMessageId(),
              role: "assistant",
              content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
            },
          ]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

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

    try {
      const list = await fetchSessions();
      setSessions(list);
    } catch {}
  };

  const handleNewSession = async () => {
    try {
      const session = await createSession();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([
        {
          id: createMessageId(),
          role: "assistant",
          content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
        },
      ]);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectSession = async (sessionId) => {
    if (busy) return;
    abortControllerRef.current?.abort();
    setBusy(false);
    setError("");

    try {
      const msgs = await fetchSessionMessages(sessionId);
      setMessages(
        msgs.length > 0
          ? msgs.map((m) => ({ id: createMessageId(), ...m }))
          : [
              {
                id: createMessageId(),
                role: "assistant",
                content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
              },
            ]
      );
      setActiveSessionId(sessionId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (busy) return;
    if (sessions.length <= 1) {
      setError("Nao e possivel excluir a unica sessao.");
      return;
    }

    try {
      await deleteSession(sessionId);
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);

      if (activeSessionId === sessionId) {
        const next = updated[0];
        await handleSelectSession(next.id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setError("");
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    setError("");
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setSessions([]);
      setMessages([]);
      setActiveSessionId(null);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  // ---- Auth pages ----
  if (authLoading) {
    return <main className="app-shell"><div className="loading">Carregando...</div></main>;
  }

  if (!user) {
    if (authPage === "register") {
      return (
        <RegisterPage
          onRegisterSuccess={handleRegisterSuccess}
          onGoToLogin={() => setAuthPage("login")}
        />
      );
    }
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onGoToRegister={() => setAuthPage("register")}
      />
    );
  }

  // ---- Main app ----
  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={() => {}}
          onNew={() => {}}
          onDelete={() => {}}
          user={user}
          onLogout={handleLogout}
        />
        <main className="app-main">
          <div className="loading">Carregando...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={handleSelectSession}
        onNew={handleNewSession}
        onDelete={handleDeleteSession}
        user={user}
        onLogout={handleLogout}
      />

      <main className="app-main">
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

