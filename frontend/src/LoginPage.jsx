function LoginPage({ onLoginSuccess, onGoToRegister }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await loginUser(email, password);
      onLoginSuccess(data.user);
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
        <h2 className="auth-subtitle">Entrar</h2>
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
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
          />
          <button type="submit" disabled={busy || !email || !password}>
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="auth-link">
          Nao tem conta?{" "}
          <button className="link-btn" onClick={onGoToRegister}>
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
}