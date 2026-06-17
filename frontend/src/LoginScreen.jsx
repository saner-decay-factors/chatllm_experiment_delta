const { useState } = React;

function LoginScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanedEmail = email.trim();
    if (!cleanedEmail || !password) {
      setError("Preencha email e senha");
      return;
    }

    setLoading(true);
    try {
      if (mode === "register") {
        await registerUser(cleanedEmail, password);
      } else {
        await loginUser(cleanedEmail, password);
      }
      onAuthSuccess();
    } catch (err) {
      setError(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-brand">ChatLLM Lab</div>
        <h2 className="login-title">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoFocus
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
          {error && <div className="login-error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="login-toggle">
          {mode === "login" ? (
            <>Nao tem conta? <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }}>Cadastre-se</a></>
          ) : (
            <>Ja tem conta? <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }}>Entrar</a></>
          )}
        </p>
      </div>
    </div>
  );
}