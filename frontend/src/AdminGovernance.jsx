import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function AdminGovernance() {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const metricsRes = await fetch(`${API}/api/admin/audit/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const metricsData = await metricsRes.json();
        if (metricsData.success) setMetrics(metricsData.metrics);

        const logsRes = await fetch(`${API}/api/admin/audit`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const logsData = await logsRes.json();
        if (logsData.success) setLogs(logsData.logs);
      } catch (err) {
        alert("Failed to load governance data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const verifyIntegrity = async () => {
    const res = await fetch(`${API}/api/admin/audit/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    alert(data.integrity || data.error);
  };

  const anchor = async () => {
    const res = await fetch(`${API}/api/admin/audit/anchor`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    alert(data.success ? "Anchored Successfully" : data.error);
  };

  const exportAudit = async () => {
    const res = await fetch(`${API}/api/admin/audit/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_export.csv";
    a.click();
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Admin Governance</h2>
        <div>
          <button onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
          <button
            onClick={() => navigate("/admin/disputes")}
            style={{ marginLeft: 10 }}
          >
            Manage Disputes
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 20 }}>Loading governance data...</p>
      ) : (
        <>
          {/* ================= METRICS ================= */}
          {metrics && (
            <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
              <Metric label="Total Actions" value={metrics.totalActions} />
              <Metric label="Last 24h" value={metrics.last24h} />
              <Metric label="Last 7 Days" value={metrics.last7d} />
            </div>
          )}

          {/* ================= ACTION BUTTONS ================= */}
          <div style={{ marginTop: 30 }}>
            <button onClick={verifyIntegrity}>
              Verify Audit Chain
            </button>

            <button onClick={anchor} style={{ marginLeft: 10 }}>
              Create Anchor
            </button>

            <button onClick={exportAudit} style={{ marginLeft: 10 }}>
              Export Signed Audit
            </button>
          </div>

          {/* ================= LOG TABLE ================= */}
          <div style={{ marginTop: 40 }}>
            <h3>Audit Logs</h3>

            {logs.length === 0 ? (
              <p>No audit records found.</p>
            ) : (
              <table
                border="1"
                cellPadding="8"
                width="100%"
                style={{ borderCollapse: "collapse" }}
              >
                <thead style={{ background: "#f2f2f2" }}>
                  <tr>
                    <th>ID</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.admin?.email || "Unknown"}</td>
                      <td>{log.action}</td>
                      <td>{log.entityType}</td>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 16,
        borderRadius: 8,
        minWidth: 150,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 14, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}