import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Dummy credentials
  const validUsername = "admin";
  const validPassword = "admin123";

  const handleLogin = () => {
    if (username === "" || password === "") {
      setError("Please enter username and password.");
      return;
    }

    if (
      username === validUsername &&
      password === validPassword
    ) {
      setError("");
      navigate("/dashboard");
    } else {
      setError("Incorrect username or password.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚦 TrafficVision AI</h1>

        <p style={styles.subtitle}>
          Smart Traffic Prediction & Congestion Management
        </p>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        {error && (
          <p style={styles.error}>{error}</p>
        )}

        <button onClick={handleLogin} style={styles.button}>
          Login
        </button>

        <p style={styles.demo}>
          Demo Login<br />
          Username: <b>admin</b><br />
          Password: <b>admin123</b>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#eef2ff",
  },

  card: {
    width: "400px",
    background: "#fff",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 0 15px rgba(0,0,0,0.2)",
    textAlign: "center",
  },

  title: {
    color: "#1E3A8A",
    marginBottom: "10px",
  },

  subtitle: {
    color: "#666",
    marginBottom: "20px",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    boxSizing: "border-box",
    fontSize: "16px",
  },

  button: {
    width: "100%",
    padding: "12px",
    background: "#2563EB",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
  },

  error: {
    color: "red",
    marginBottom: "15px",
    fontWeight: "bold",
  },

  demo: {
    marginTop: "20px",
    color: "#555",
    fontSize: "14px",
  },
};

export default Login;