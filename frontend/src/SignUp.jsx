import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("requester");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API_URL}/api/auth/register`, {
        email: normalizedEmail,
        password,
        role,
      });

      alert("Account created. Please sign in.");
      window.location.href = "/";
    } catch (err) {
      if (err.response?.status === 409) {
        alert("An account with this email already exists.");
        return;
      }

      const message =
        err.response?.data?.error ||
        "Sign up failed. Please try again.";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Create account</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <br /><br />

      <select
        value={role}
        onChange={(event) => setRole(event.target.value)}
      >
        <option value="requester">Requester</option>
        <option value="runner">Runner</option>
      </select>

      <br /><br />

      <button onClick={handleSignUp} disabled={loading}>
        {loading ? "Creating account..." : "Sign up"}
      </button>

      <p>
        Already have an account? <a href="/">Sign in</a>
      </p>
    </div>
  );
}