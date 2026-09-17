import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
const NEUTRAL_MESSAGE =
  "If an account exists for that email and recovery is available, instructions will be sent.";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!email) {
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setMessage(NEUTRAL_MESSAGE);
    } catch {
      setMessage(NEUTRAL_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Forgot Password</h2>
      <p>
        Enter the email address associated with your account.
      </p>

      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <br /><br />

      <button onClick={handleSubmit} disabled={loading || !email}>
        {loading ? "Sending..." : "Send reset instructions"}
      </button>

      {message ? (
        <p>{message}</p>
      ) : null}

      <p>
        <a href="/">Back to login</a>
      </p>
    </div>
  );
}
