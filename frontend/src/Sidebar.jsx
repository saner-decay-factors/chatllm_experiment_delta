const { useEffect, useRef } = React;

function Sidebar({ sessions, activeSessionId, onSelect, onNew, onDelete }) {
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [activeSessionId]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-brand">ChatLLM Lab</span>
      </div>

      <button className="sidebar-new-btn" onClick={onNew}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="8" y1="1" x2="8" y2="15" />
          <line x1="1" y1="8" x2="15" y2="8" />
        </svg>
        Nova conversa
      </button>

      <nav className="sidebar-list">
        {sessions.map((session) => (
          <div
            key={session.id}
            ref={session.id === activeSessionId ? activeRef : null}
            className={`sidebar-item ${session.id === activeSessionId ? "active" : ""}`}
            onClick={() => onSelect(session.id)}
          >
            <span className="sidebar-item-title">
              {session.title || "Nova conversa"}
            </span>
            <button
              className="sidebar-item-del"
              title="Excluir sessao"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <line x1="1" y1="1" x2="13" y2="13" />
                <line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}