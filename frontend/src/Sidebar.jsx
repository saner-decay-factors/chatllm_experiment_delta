const { useState } = React;

function Sidebar({ sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession, onLogout, userEmail, sidebarOpen }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = (event, sessionId) => {
    event.stopPropagation();
    setDeletingId(sessionId);
  };

  const confirmDelete = (sessionId) => {
    onDeleteSession(sessionId);
    setDeletingId(null);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar-header">
        <button className="sidebar-new-btn" onClick={onNewSession} title="Nova conversa">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
          Nova conversa
        </button>
      </div>

      <nav className="sidebar-list">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`sidebar-item ${s.id === activeSessionId ? "sidebar-item--active" : ""}`}
            onClick={() => onSelectSession(s.id)}
          >
            <div className="sidebar-item-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="sidebar-item-text">{s.title}</span>
            </div>

            {deletingId === s.id ? (
              <div className="sidebar-item-confirm">
                <button className="sidebar-confirm-yes" onClick={() => confirmDelete(s.id)} title="Confirmar exclusao">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button className="sidebar-confirm-no" onClick={cancelDelete} title="Cancelar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                className="sidebar-item-delete"
                onClick={(e) => handleDelete(e, s.id)}
                title="Excluir sessao"
                aria-label={`Excluir ${s.title}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">{userEmail}</div>
        <button className="sidebar-logout-btn" onClick={onLogout} title="Sair">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  );
}