import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

const statusLabels = {
  open: "Open",
  assigned: "Assigned",
  arrived: "Arrived",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusStyles = {
  open: { background: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  assigned: { background: "#fef3c7", color: "#92400e", border: "#fde68a" },
  arrived: { background: "#ecfeff", color: "#0e7490", border: "#a5f3fc" },
  in_progress: { background: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  completed: { background: "#dcfce7", color: "#166534", border: "#86efac" },
  cancelled: { background: "#fee2e2", color: "#991b1b", border: "#fecaca" },
};

const paymentLabels = {
  pending_payment_method: "Payment method pending",
  requires_payment_method: "Payment method required",
  authorized: "Payment authorized",
  captured: "Payment captured",
  paid: "Paid",
  failed: "Payment failed",
};

function Badge({ children, tone }) {
  const style = tone || {
    background: "#f1f5f9",
    color: "#334155",
    border: "#e2e8f0",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 700,
        background: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {children}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "Not available";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Not available";
  }
}

function RunTimeline({ status }) {
  const steps = [
    ["open", "Requested"],
    ["assigned", "Assigned"],
    ["arrived", "Arrived"],
    ["completed", "Completed"],
  ];

  const activeIndex = Math.max(
    0,
    steps.findIndex(([key]) => key === status || (status === "in_progress" && key === "arrived"))
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>
      {steps.map(([key, label], index) => {
        const active = index <= activeIndex || status === "completed";

        return (
          <div
            key={key}
            style={{
              height: 8,
              borderRadius: 999,
              background: active ? "#111827" : "#e5e7eb",
              position: "relative",
            }}
            title={label}
          />
        );
      })}
    </div>
  );
}

function RunCard({ run, completed = false }) {
  const statusTone = statusStyles[run.status] || statusStyles.open;
  const paymentText =
    paymentLabels[run.paymentStatus] ||
    (run.paymentStatus ? run.paymentStatus : "Payment not started");

  return (
    <div
      style={{
        background: "white",
        padding: 22,
        borderRadius: 18,
        marginBottom: 18,
        boxShadow: completed
          ? "0 2px 10px rgba(15,23,42,0.04)"
          : "0 8px 24px rgba(15,23,42,0.08)",
        border: completed ? "1px solid #e5e7eb" : "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
            {run.location || "Unknown location"}
          </div>
          <div style={{ marginTop: 6, color: "#334155" }}>
            {run.item || "Run request"}
          </div>
        </div>

        <Badge tone={statusTone}>{statusLabels[run.status] || run.status}</Badge>
      </div>

      <RunTimeline status={run.status} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
          marginTop: 18,
        }}
      >
        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Payout</div>
          <div style={{ marginTop: 4, fontWeight: 800 }}>${run.payout}</div>
        </div>

        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
            Assigned Runner
          </div>
          <div style={{ marginTop: 4, fontWeight: 800 }}>
            {run.assignedRunnerId ? `Runner #${run.assignedRunnerId}` : "Not assigned yet"}
          </div>
        </div>

        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Payment</div>
          <div style={{ marginTop: 4, fontWeight: 800 }}>{paymentText}</div>
        </div>

        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Created</div>
          <div style={{ marginTop: 4, fontWeight: 800 }}>{formatDate(run.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [role, setRole] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showError = (message) => {
    setNotification({ type: "error", message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchRuns = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Failed to load runs");
      }

      setRuns(data.runs || []);
    } catch (err) {
      showError(err.message || "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [token]);

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
      return;
    }

    const interval = setInterval(fetchRuns, 8000);
    return () => clearInterval(interval);
  }, [fetchRuns, navigate, token]);

  const activeRuns = useMemo(
    () => runs.filter((run) => run.status !== "completed"),
    [runs]
  );

  const completedRuns = useMemo(
    () => runs.filter((run) => run.status === "completed"),
    [runs]
  );

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <div
      style={{
        padding: 32,
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 26,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 42, color: "#0f172a" }}>RunForMe</h1>
            <p style={{ marginTop: 8, color: "#64748b" }}>
              Requester command center {role ? `- ${role}` : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={fetchRuns}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "white",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Refresh
            </button>

            <button
              onClick={handleLogout}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "#111827",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {notification && (
          <div
            style={{
              background: notification.type === "success" ? "#dcfce7" : "#fee2e2",
              color: notification.type === "success" ? "#166534" : "#991b1b",
              padding: 14,
              borderRadius: 12,
              marginBottom: 20,
              fontWeight: 700,
            }}
          >
            {notification.message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 28,
          }}
        >
          <div style={{ background: "white", borderRadius: 16, padding: 18 }}>
            <div style={{ color: "#64748b", fontWeight: 700 }}>Active Runs</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
              {activeRuns.length}
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 16, padding: 18 }}>
            <div style={{ color: "#64748b", fontWeight: 700 }}>Completed</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
              {completedRuns.length}
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 16, padding: 18 }}>
            <div style={{ color: "#64748b", fontWeight: 700 }}>Total Payout</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
              ${runs.reduce((sum, run) => sum + Number(run.payout || 0), 0)}
            </div>
          </div>
        </div>

        <section style={{ marginBottom: 34 }}>
          <h2 style={{ fontSize: 22, marginBottom: 14, color: "#0f172a" }}>
            Active Runs
          </h2>

          {loading ? (
            <p>Loading...</p>
          ) : activeRuns.length === 0 ? (
            <div
              style={{
                background: "white",
                borderRadius: 18,
                padding: 24,
                color: "#64748b",
              }}
            >
              No active runs.
            </div>
          ) : (
            activeRuns.map((run) => <RunCard key={run.id} run={run} />)
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 22, marginBottom: 14, color: "#0f172a" }}>
            Completed Runs
          </h2>

          {completedRuns.length === 0 ? (
            <div
              style={{
                background: "white",
                borderRadius: 18,
                padding: 24,
                color: "#64748b",
              }}
            >
              No completed runs yet.
            </div>
          ) : (
            completedRuns.map((run) => (
              <RunCard key={run.id} run={run} completed />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
