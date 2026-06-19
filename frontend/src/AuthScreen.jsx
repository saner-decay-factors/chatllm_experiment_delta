const { useState } = React;

function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "register") {
        result = await registerUser({ first_name: firstName, last_name: lastName, email, password });
      } else {
        result = await loginUser({ email, password });
      }
      localStorage.setItem("chatllm_token", result.token);
      localStorage.setItem("chatllm_user", JSON.stringify(result));
      onAuthSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">ChatLLM Lab</h1>
        <h2 className="auth-subtitle">{mode === "login" ? "Entrar" : "Criar conta"}</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="auth-row">
              <input
                className="auth-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nome"
                required
                maxLength={100}
              />
              <input
                className="auth-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sobrenome"
                required
                maxLength={100}
              />
            </div>
          )}

          <input
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />

          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            required
            minLength={8}
            maxLength={128}
          />

          {mode === "register" && (
            <small className="auth-hint">A senha deve conter pelo menos 1 letra maiuscula e 1 numero</small>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="auth-footer">
          {mode === "login" ? (
            <span>
              Nao tem conta?{" "}
              <button className="auth-link" onClick={switchMode}>Cadastre-se</button>
            </span>
          ) : (
            <span>
              Ja tem conta?{" "}
              <button className="auth-link" onClick={switchMode}>Entrar</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}