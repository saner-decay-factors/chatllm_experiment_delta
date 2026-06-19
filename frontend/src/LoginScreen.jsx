const { useState } = React;

function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "register"

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Preencha todos os campos.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      let result;
      if (mode === "login") {
        result = await loginUser(trimmedEmail, trimmedPassword);
      } else {
        result = await registerUser(trimmedEmail, trimmedPassword);
      }

      setToken(result.access_token);
      onLoginSuccess(result.access_token, result.email);
    } catch (err) {
      setError(err.message || "Falha na autenticacao.");
    } finally {
      setBusy(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError("");
  };

  return (
    <main className="login-screen">
      <div className="login-card">
        <h1 className="login-title">ChatLLM Lab</h1>
        <p className="login-subtitle">
          {mode === "login" ? "Acesse sua conta" : "Crie sua conta"}
        </p>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            autoFocus
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          <button type="submit" disabled={busy}>
            {busy
              ? "Aguarde..."
              : mode === "login"
              ? "Entrar"
              : "Cadastrar"}
          </button>
        </form>

        <p className="login-toggle">
          {mode === "login" ? (
            <>
              Nao tem conta?{" "}
              <button className="link-btn" onClick={toggleMode} disabled={busy}>
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              Ja tem conta?{" "}
              <button className="link-btn" onClick={toggleMode} disabled={busy}>
                Faca login
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}