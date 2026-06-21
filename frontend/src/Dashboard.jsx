import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import PaymentModal from "./components/PaymentModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

function Dashboard({ user, onLogout, onStartPayment }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [role, setRole] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [ratings, setRatings] = useState({});
  const [ratingLoading, setRatingLoading] = useState(null);
  // 🔥 STRIPE STATE (NEW)
  const [clientSecret, setClientSecret] = useState(null);
  const [activeRunId, setActiveRunId] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  /* ================= NOTIFICATIONS ================= */

  const showSuccess = (msg) => {
    setNotification({ type: "success", message: msg });
    setTimeout(() => setNotification(null), 3000);
  };

  const showError = (msg) => {
    setNotification({ type: "error", message: msg });
    setTimeout(() => setNotification(null), 4000);
  };

  /* ================= FETCH RUNS ================= */

  const fetchRuns = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      setRuns(data.runs || []);
    } catch {
      showError("Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [token]);

  /* ================= AUTH ================= */

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      setRole(decoded.role);
      fetchRuns();
    } catch {
      localStorage.removeItem("token");
      navigate("/");
    }

    const interval = setInterval(fetchRuns, 8000);
    return () => clearInterval(interval);
  }, [fetchRuns, navigate, token]);

  /* ================= RUN ACTIONS ================= */

  const startRun = async (runId) => {
    try {
      setActionLoading(runId);

      const res = await fetch(`${API_URL}/api/runs/${runId}/start`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showSuccess("Run started");
      fetchRuns();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const completeRun = async (runId) => {
    try {
      setActionLoading(runId);

      const res = await fetch(`${API_URL}/api/runs/${runId}/complete`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showSuccess("Run completed. Payment captured");
      fetchRuns();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  /* ================= PAYMENT ACTION ================= */

  const handleStartPayment = async (runId) => {
  try {
    setActionLoading(runId);

    const res = await fetch(`${API_URL}/api/payments/create-intent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ runId }),
    });

    const data = await res.json();

    if (!data.clientSecret) {
      throw new Error("Failed to initialize payment");
    }

    setClientSecret(data.clientSecret);
    setActiveRunId(runId);
    setShowPayment(true);

  } catch (err) {
    showError(err?.message || "Failed to start payment");
    setActionLoading(null);
  }
};

  /* ================= RATING SUBMIT ================= */

  const submitRating = async (runId) => {
    const rating = ratings[runId];
    if (!rating?.score) return;

    try {
      setRatingLoading(runId);

      const res = await fetch(`${API_URL}/api/ratings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId,
          score: rating.score,
          comment: rating.comment || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showSuccess("Rating submitted");
      fetchRuns();
    } catch (err) {
      showError(err.message);
    } finally {
      setRatingLoading(null);
    }
  };

  /* ================= STAR SELECTOR ================= */

  const renderStars = (runId) => {
    const selected = ratings[runId]?.score || 0;

    return (
      <div
        style={{
          display: "flex",
          gap: "6px",
          fontSize: "22px",
          cursor: "pointer",
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() =>
              setRatings({
                ...ratings,
                [runId]: { ...ratings[runId], score: star },
              })
            }
            style={{
              color: star <= selected ? "#f5b301" : "#ddd",
              transition: "0.2s",
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  /* ================= RUNNER RATING BADGE ================= */

  const renderRunnerBadge = (runner) => {
    if (!runner || !runner.averageRating) return null;

    return (
      <div
        style={{
          marginTop: "6px",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "#555",
        }}
      >
        <span style={{ color: "#f5b301" }}>★</span>
        <span>
          {runner.averageRating.toFixed(1)} ({runner.totalRatings})
        </span>
      </div>
    );
  };

  /* ================= DERIVED ================= */

  const activeRuns = runs.filter((r) => r.status !== "completed");
  const completedRuns = runs.filter((r) => r.status === "completed");

  /* ================= UI ================= */

  return (
  <>
    <div
      style={{
        padding: "50px",
        fontFamily: "Inter, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "auto" }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "30px",
          }}
        >
          <h1 style={{ fontWeight: 600 }}>RunForMe</h1>

          <button
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else {
                localStorage.removeItem("token");
                navigate("/");
              }
            }}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#111",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        {/* NOTIFICATIONS */}
        {notification && (
          <div
            style={{
              background:
                notification.type === "success" ? "#d1fae5" : "#fee2e2",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {notification.message}
          </div>
        )}

        {/* ACTIVE RUNS */}
        <h3 style={{ marginBottom: "15px" }}>Active Runs</h3>

        {loading ? (
          <p>Loading...</p>
        ) : activeRuns.length === 0 ? (
          <p>No active runs.</p>
        ) : (
          activeRuns.map((run) => (
            <div
              key={run.id}
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "16px",
                marginBottom: "18px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              }}
            >
              <strong>{run.location}</strong>
              <p>{run.item}</p>

              {/* ⭐ Rating Badge */}
              {renderRunnerBadge(run.assignedRunner)}

              <p>Payout: ${run.payout}</p>

              {role === "requester" && run.status === "assigned" && (
                <button
                  disabled={actionLoading === run.id}
                  onClick={() => handleStartPayment(run.id)}
                  style={{
                    marginTop: "10px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "#111",
                    color: "white",
                    border: "none",
                    cursor:
                      actionLoading === run.id ? "not-allowed" : "pointer",
                    opacity: actionLoading === run.id ? 0.7 : 1,
                  }}
                >
                  {actionLoading === run.id
                    ? "Opening Payment..."
                    : "Pay & Start Run"}
                </button>
              )}

              {role === "runner" && run.status === "assigned" && (
                <button
                  disabled={actionLoading === run.id}
                  onClick={() => startRun(run.id)}
                  style={{
                    marginTop: "10px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "#111",
                    color: "white",
                    border: "none",
                    cursor:
                      actionLoading === run.id ? "not-allowed" : "pointer",
                    opacity: actionLoading === run.id ? 0.7 : 1,
                  }}
                >
                  {actionLoading === run.id ? "Starting..." : "Start Run"}
                </button>
              )}

              {role === "requester" && run.status === "in_progress" && (
                <button
                  disabled={actionLoading === run.id}
                  onClick={() => completeRun(run.id)}
                  style={{
                    marginTop: "10px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "#111",
                    color: "white",
                    border: "none",
                    cursor:
                      actionLoading === run.id ? "not-allowed" : "pointer",
                    opacity: actionLoading === run.id ? 0.7 : 1,
                  }}
                >
                  {actionLoading === run.id ? "Completing..." : "Complete Run"}
                </button>
              )}
            </div>
          ))
        )}

        {/* COMPLETED RUNS */}
        <h3 style={{ margin: "30px 0 15px" }}>Completed Runs</h3>

        {completedRuns.length === 0 ? (
          <p>No completed runs yet.</p>
        ) : (
          completedRuns.map((run) => (
            <div
              key={run.id}
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "16px",
                marginBottom: "18px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              }}
            >
              <strong>{run.location}</strong>
              <p>{run.item}</p>

              {/* ⭐ Rating Badge */}
              {renderRunnerBadge(run.assignedRunner)}

              <p>Payout: ${run.payout}</p>

              {/* Rating UI */}
              {role === "requester" && (
                <div style={{ marginTop: "15px" }}>
                  <div
                    style={{
                      fontSize: "14px",
                      marginBottom: "6px",
                      color: "#555",
                    }}
                  >
                    How was your runner?
                  </div>

                  {renderStars(run.id)}

                  <textarea
                    placeholder="Optional comment..."
                    maxLength={120}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                    onChange={(e) =>
                      setRatings({
                        ...ratings,
                        [run.id]: {
                          ...ratings[run.id],
                          comment: e.target.value,
                        },
                      })
                    }
                  />

                  <button
                    disabled={
                      !ratings[run.id]?.score || ratingLoading === run.id
                    }
                    onClick={() => submitRating(run.id)}
                    style={{
                      marginTop: "10px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "#111",
                      color: "white",
                      border: "none",
                      cursor:
                        !ratings[run.id]?.score || ratingLoading === run.id
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        !ratings[run.id]?.score || ratingLoading === run.id
                          ? 0.7
                          : 1,
                    }}
                  >
                    {ratingLoading === run.id
                      ? "Submitting..."
                      : "Submit Rating"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>

  {showPayment && clientSecret && (
    <PaymentModal
      clientSecret={clientSecret}
      runId={activeRunId}
      onClose={() => {
        setShowPayment(false);
        setClientSecret(null);
        setActiveRunId(null);
      }}
    />
  )}
</>
);
}

export default Dashboard;