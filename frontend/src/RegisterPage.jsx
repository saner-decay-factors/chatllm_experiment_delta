function RegisterPage({ onRegisterSuccess, onGoToLogin }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Senhas nao conferem.");
      return;
    }
    setBusy(true);
    try {
      const data = await registerUser(email, password);
      onRegisterSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">ChatLLM Lab</h1>
        <h2 className="auth-subtitle">Cadastro</h2>
        {error && <div className="note error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            type="password"
            placeholder="Senha (min. 4 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
          />
          <input
            type="password"
            placeholder="Confirmar senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={4}
          />
          <button type="submit" disabled={busy || !email || !password || !confirm}>
            {busy ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>
        <p className="auth-link">
          Ja tem conta?{" "}
          <button className="link-btn" onClick={onGoToLogin}>
            Fazer login
          </button>
        </p>
      </div>
    </div>
  );
}