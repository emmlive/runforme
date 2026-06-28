import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function AdminDisputes() {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDisputes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/disputes?status=raised`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setDisputes(data.disputes);
      }
    } catch {
      alert("Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const resolveDispute = async (runId, action) => {
    try {
      setActionLoading(runId);

      const res = await fetch(`${API}/api/disputes/${runId}/resolve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Resolution failed");
        return;
      }

      alert(`Dispute resolved via ${action}`);
      fetchDisputes();
    } catch {
      alert("Resolution failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Dispute Management</h2>

      <button onClick={() => navigate("/admin")} style={{ marginBottom: 20 }}>
        ← Back to Governance
      </button>

      {loading ? (
        <p>Loading disputes...</p>
      ) : disputes.length === 0 ? (
        <p>No active disputes.</p>
      ) : (
        disputes.map((run) => (
          <div
            key={run.id}
            style={{
              background: "#fff",
              padding: 20,
              marginBottom: 20,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            <h4>Run #{run.id}</h4>
            <p><strong>Requester:</strong> {run.requester.email}</p>
            <p><strong>Runner:</strong> {run.assignedRunner?.email}</p>
            <p><strong>Payout:</strong> ${run.payout}</p>
            <p><strong>Reason:</strong> {run.disputeReason}</p>

            <div style={{ marginTop: 10 }}>
              <button
                disabled={actionLoading === run.id}
                onClick={() => resolveDispute(run.id, "capture")}
                style={{ marginRight: 10 }}
              >
                {actionLoading === run.id ? "Processing..." : "Capture (Release Funds)"}
              </button>

              <button
                disabled={actionLoading === run.id}
                onClick={() => resolveDispute(run.id, "cancel")}
              >
                {actionLoading === run.id ? "Processing..." : "Cancel (Refund)"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}