import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("requester");
  const [loading, setLoading] = useState(false);

  /* =========================================
     🔐 AUTO REDIRECT IF ALREADY LOGGED IN
  ========================================= */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      console.log("🔁 Existing session found → redirecting");
      window.location.href = "/";
    }
  }, []);

  /* =========================================
     🔐 LOGIN HANDLER (HARDENED)
  ========================================= */
  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
        role,
      });

      if (!res.data?.token) {
        throw new Error("No token received");
      }

      /* ✅ STORE TOKEN (CRITICAL) */
      localStorage.setItem("token", res.data.token);

      console.log("✅ Login success");

      /* ✅ HARD RELOAD TO INITIALIZE APP STATE */
      window.location.href = "/";
    } catch (err) {
      console.error("❌ Login error:", err);
      alert("Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================
     UI
  ========================================= */

  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="requester">Requester</option>
        <option value="runner">Runner</option>
      </select>

      <br /><br />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}