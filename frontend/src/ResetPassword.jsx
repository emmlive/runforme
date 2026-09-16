import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

const PASSWORD_GUIDANCE =
  "Password must be between 12 and 128 characters.";

const INVALID_LINK_COPY = "Invalid or expired reset link";

const SUCCESS_COPY =
  "Password reset successfully. Please sign in again.";

export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : INVALID_LINK_COPY);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async () => {
    setMessage("");
    setError("");

    if (!token) {
      setError(INVALID_LINK_COPY);
      return;
    }

    if (
      newPassword.length < PASSWORD_MIN_LENGTH ||
      newPassword.length > PASSWORD_MAX_LENGTH
    ) {
      setError(PASSWORD_GUIDANCE);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword,
      });

      setCompleted(true);
      setMessage(SUCCESS_COPY);
    } catch {
      setError(INVALID_LINK_COPY);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Reset Password</h2>

      {!token ? (
        <>
          <p>{INVALID_LINK_COPY}</p>
          <p>
            <a href="/">Back to login</a>
          </p>
        </>
      ) : completed ? (
        <>
          <p>{message}</p>
          <p>
            <a href="/">Return to login</a>
          </p>
        </>
      ) : (
        <>
          <p>{PASSWORD_GUIDANCE}</p>

          <input
            placeholder="New password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
          />

          <br /><br />

          <input
            placeholder="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
          />

          <br /><br />

          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              !newPassword ||
              !confirmPassword
            }
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>

          {error ? <p>{error}</p> : null}
        </>
      )}
    </div>
  );
}
