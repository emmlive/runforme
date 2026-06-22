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

function formatMoney(value) {
  const amount = Number(value || 0);
  return `$${amount}`;
}

function formatSecurityStatus(value) {
  if (!value) return "Not started";

  return String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function useIsMobile(breakpoint = 760) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= breakpoint);
    update();

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoint]);

  return isMobile;
}

function RunTimeline({ status, variant = "light" }) {
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
              background: active
                ? variant === "dark"
                  ? "#f8fafc"
                  : "#111827"
                : variant === "dark"
                  ? "rgba(148,163,184,0.38)"
                  : "#e5e7eb",
              position: "relative",
            }}
            title={label}
          />
        );
      })}
    </div>
  );
}

function RunCard({ run, completed = false, selected = false, onSelect }) {
  const statusTone = statusStyles[run.status] || statusStyles.open;
  const paymentText =
    paymentLabels[run.paymentStatus] ||
    (run.paymentStatus ? run.paymentStatus : "Payment not started");
  const isMobile = useIsMobile();

  return (
    <div
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      style={{
        background: "white",
        padding: 22,
        borderRadius: 18,
        marginBottom: 18,
        boxShadow: completed
          ? "0 2px 10px rgba(15,23,42,0.04)"
          : "0 8px 24px rgba(15,23,42,0.08)",
        border: selected
          ? "2px solid #111827"
          : completed
            ? "1px solid #e5e7eb"
            : "1px solid #f1f5f9",
        cursor: onSelect ? "pointer" : "default",
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
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
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


function getNextStep(status) {
  if (status === "open") return "Waiting for a runner to accept this run.";
  if (status === "assigned") return "Runner assigned. Next step: runner arrival.";
  if (status === "arrived") return "Runner has arrived. Next step: completion.";
  if (status === "in_progress") return "Run is in progress.";
  if (status === "completed") return "Run completed. Review payment and history.";
  return "Monitoring run status.";
}


function SecurityProofGrid({ run }) {
  const isMobile = useIsMobile();

  const items = [
    ["Delivery PIN", run.deliveryPin || "Not generated"],
    ["Authorization", formatSecurityStatus(run.authorizationStatus)],
    ["Hold Amount", formatMoney(run.holdAmount)],
    ["Max Runner Spend", formatMoney(run.maxRunnerSpend)],
    ["Purchase Status", formatSecurityStatus(run.purchaseStatus)],
    ["Receipt Status", formatSecurityStatus(run.receiptStatus)],
    [
      "Receipt Amount",
      Number(run.receiptAmount || 0) > 0 ? formatMoney(run.receiptAmount) : "Not submitted",
    ],
    [
      "Final Amount",
      Number(run.finalAmount || 0) > 0 ? formatMoney(run.finalAmount) : "Not calculated",
    ],
    ["Receipt Proof", run.receiptImageUrl ? "Uploaded" : "Not uploaded"],
    ["Payout Status", formatSecurityStatus(run.payoutStatus)],
    ["Delivery Confirmed", formatDate(run.deliveryConfirmedAt)],
    ["Manual Review", run.requiresManualReview ? "Required" : "Not required"],
  ];

  return (
    <div
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 16,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div
        style={{
          color: "#bfdbfe",
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 1.3,
          marginBottom: 12,
        }}
      >
        SECURITY & PROOF
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {items.map(([label, value]) => (
          <div
            key={label}
            style={{
              background: "rgba(15,23,42,0.38)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>
              {label}
            </div>
            <div
              style={{
                marginTop: 5,
                color: "white",
                fontSize: label === "Delivery PIN" ? 20 : 14,
                fontWeight: 900,
                letterSpacing: label === "Delivery PIN" ? 1.8 : 0,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function RunDetailPanel({ run, onClose, onApproveManualReview, approvingManualReview }) {
  if (!run) return null;

  const isMobile = useIsMobile();
  const statusTone = statusStyles[run.status] || statusStyles.open;
  const paymentText =
    paymentLabels[run.paymentStatus] ||
    (run.paymentStatus ? run.paymentStatus : "Payment not started");

  return (
    <section
      style={{
        background: "#0f172a",
        color: "white",
        borderRadius: 22,
        padding: 24,
        marginBottom: 28,
        boxShadow: "0 14px 34px rgba(15,23,42,0.18)",
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
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, letterSpacing: 1.5 }}>
            RUN DETAIL
          </div>
          <h2 style={{ margin: "8px 0 4px", fontSize: 26 }}>
            {run.location || "Unknown location"}
          </h2>
          <p style={{ margin: 0, color: "#cbd5e1" }}>
            {run.item || "Run request"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Badge tone={statusTone}>{statusLabels[run.status] || run.status}</Badge>
          <button
            onClick={onClose}
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Close
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <RunTimeline status={run.status} variant="dark" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginTop: 22,
        }}
      >
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>Payout</div>
          <div style={{ marginTop: 5, fontSize: 20, fontWeight: 900 }}>${run.payout}</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>Runner</div>
          <div style={{ marginTop: 5, fontSize: 18, fontWeight: 900 }}>
            {run.assignedRunnerId ? `Runner #${run.assignedRunnerId}` : "Unassigned"}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>Payment</div>
          <div style={{ marginTop: 5, fontSize: 16, fontWeight: 900 }}>{paymentText}</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>Created</div>
          <div style={{ marginTop: 5, fontSize: 14, fontWeight: 900 }}>
            {formatDate(run.createdAt)}
          </div>
        </div>
      </div>

      <SecurityProofGrid run={run} />

      {Number(run.holdAmount || 0) > 0 && (
        <div
          style={{
            marginTop: 18,
            background: "rgba(15,23,42,0.72)",
            border: "1px solid rgba(148,163,184,0.36)",
            borderRadius: 14,
            padding: 16,
            color: "#e5e7eb",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2 }}>
            SECURE PAYMENT HOLD
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>
                Estimated Hold
              </div>
              <div style={{ marginTop: 5, fontSize: 20, fontWeight: 900 }}>
                {formatMoney(run.holdAmount)}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>
                Authorization
              </div>
              <div style={{ marginTop: 5, fontSize: 16, fontWeight: 900 }}>
                {formatSecurityStatus(run.authorizationStatus)}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>
                Payment
              </div>
              <div style={{ marginTop: 5, fontSize: 16, fontWeight: 900 }}>
                {formatSecurityStatus(run.paymentStatus || "not_authorized")}
              </div>
            </div>
          </div>

          <p style={{ marginTop: 12, marginBottom: 12, color: "#cbd5e1", lineHeight: 1.5 }}>
            This prepares RUNFORME for secure pre-authorization. No live charge is made from
            this placeholder yet. Stripe PaymentIntent wiring will be added in a later security step.
          </p>

          <button
            type="button"
            disabled
            title="Stripe payment authorization is not wired yet"
            style={{
              border: "1px solid rgba(148,163,184,0.45)",
              background: "rgba(148,163,184,0.18)",
              color: "#cbd5e1",
              borderRadius: 10,
              padding: "10px 14px",
              cursor: "not-allowed",
              fontWeight: 900,
            }}
          >
            Authorize Secure Hold ? Coming Soon
          </button>
        </div>
      )}

      {run.requiresManualReview && (
        <div
          style={{
            marginTop: 18,
            background: "rgba(251,191,36,0.16)",
            border: "1px solid rgba(251,191,36,0.38)",
            borderRadius: 14,
            padding: 16,
            color: "#fef3c7",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2 }}>
            MANUAL REVIEW REQUIRED
          </div>

          <p style={{ marginTop: 8, marginBottom: 12, color: "#fde68a" }}>
            Manual review is required before this runner can complete the run.
            Review the receipt amount, final amount, max runner spend, and proof status.
          </p>

          <button
            onClick={() => onApproveManualReview?.(run.id)}
            disabled={approvingManualReview}
            style={{
              border: "none",
              background: approvingManualReview ? "#92400e" : "#fbbf24",
              color: "#111827",
              borderRadius: 10,
              padding: "10px 14px",
              cursor: approvingManualReview ? "not-allowed" : "pointer",
              fontWeight: 900,
            }}
          >
            {approvingManualReview ? "Approving..." : "Approve Manual Review"}
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: 18,
          background: "rgba(59,130,246,0.16)",
          border: "1px solid rgba(147,197,253,0.28)",
          borderRadius: 14,
          padding: 14,
          color: "#dbeafe",
          fontWeight: 700,
        }}
      >
        {getNextStep(run.status)}
      </div>
    </section>
  );
}


export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const isMobile = useIsMobile();

  const [role, setRole] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [newRun, setNewRun] = useState({
    location: "",
    item: "",
    payout: "25",
    itemBudgetEstimate: "0",
    platformFee: "3",
    bufferAmount: "5",
  });
  const [creatingRun, setCreatingRun] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [approvingManualReview, setApprovingManualReview] = useState(false);

  const showSuccess = (message) => {
    setNotification({ type: "success", message });
    setTimeout(() => setNotification(null), 3000);
  };

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

  const createRunSecurityPreview = useMemo(() => {
    const payout = Number(newRun.payout || 0);
    const itemBudgetEstimate = Number(newRun.itemBudgetEstimate || 0);
    const platformFee = Number(newRun.platformFee || 0);
    const bufferAmount = Number(newRun.bufferAmount || 0);

    const safePayout = Number.isFinite(payout) && payout > 0 ? payout : 0;
    const safeBudget =
      Number.isFinite(itemBudgetEstimate) && itemBudgetEstimate > 0 ? itemBudgetEstimate : 0;
    const safePlatformFee =
      Number.isFinite(platformFee) && platformFee > 0 ? platformFee : 0;
    const safeBuffer = Number.isFinite(bufferAmount) && bufferAmount > 0 ? bufferAmount : 0;

    return {
      holdAmount: safeBudget + safePayout + safePlatformFee + safeBuffer,
      maxRunnerSpend: safeBudget + safeBuffer,
    };
  }, [
    newRun.payout,
    newRun.itemBudgetEstimate,
    newRun.platformFee,
    newRun.bufferAmount,
  ]);

  const createRun = async (event) => {
    event.preventDefault();

    const location = newRun.location.trim();
    const item = newRun.item.trim();
    const payout = Number(newRun.payout);
    const itemBudgetEstimate = Number(newRun.itemBudgetEstimate || 0);
    const platformFee = Number(newRun.platformFee || 0);
    const bufferAmount = Number(newRun.bufferAmount || 0);

    if (!location || !item || !Number.isFinite(payout) || payout <= 0) {
      showError("Enter a location, item, and valid payout.");
      return;
    }

    const secureAmounts = [itemBudgetEstimate, platformFee, bufferAmount];

    if (
      secureAmounts.some((amount) => !Number.isInteger(amount) || amount < 0) ||
      itemBudgetEstimate > 5000 ||
      platformFee > 1000 ||
      bufferAmount > 1000
    ) {
      showError("Enter valid whole-dollar budget, platform fee, and buffer amounts.");
      return;
    }

    try {
      setCreatingRun(true);

      const response = await fetch(`${API_URL}/api/runs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location,
          item,
          payout,
          itemBudgetEstimate,
          platformFee,
          bufferAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Failed to create run");
      }

      setNewRun({
        location: "",
        item: "",
        payout: "25",
        itemBudgetEstimate: "0",
        platformFee: "3",
        bufferAmount: "5",
      });
      showSuccess("Run created and sent to available runners.");
      await fetchRuns();
    } catch (err) {
      showError(err.message || "Failed to create run");
    } finally {
      setCreatingRun(false);
    }
  };

  const activeRuns = useMemo(
    () => runs.filter((run) => run.status !== "completed"),
    [runs]
  );

  const completedRuns = useMemo(
    () => runs.filter((run) => run.status === "completed"),
    [runs]
  );

  const selectedRun = useMemo(() => {
    if (selectedRunId) {
      return runs.find((run) => run.id === selectedRunId) || null;
    }

    return activeRuns[0] || completedRuns[0] || null;
  }, [runs, selectedRunId, activeRuns, completedRuns]);

  const approveManualReview = async (runId) => {
    if (!runId || !token) return;

    try {
      setApprovingManualReview(true);

      const response = await fetch(`${API_URL}/api/runs/${runId}/manual-review/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Failed to approve manual review");
      }

      setRuns((prev) =>
        prev.map((run) =>
          run.id === runId ? { ...run, ...data.run } : run
        )
      );

      showSuccess("Manual review approved. Runner can complete this run.");
      await fetchRuns();
    } catch (err) {
      showError(err.message || "Failed to approve manual review");
    } finally {
      setApprovingManualReview(false);
    }
  };

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
        padding: isMobile ? 16 : 32,
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
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
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
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

        <RunDetailPanel
          run={selectedRun}
          onClose={() => setSelectedRunId(null)}
          onApproveManualReview={approveManualReview}
          approvingManualReview={approvingManualReview}
        />

        <section
          style={{
            background: "white",
            borderRadius: 18,
            padding: 22,
            marginBottom: 34,
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
          }}
        >
          <h2 style={{ fontSize: 22, marginTop: 0, marginBottom: 14, color: "#0f172a" }}>
            Create Run
          </h2>

          <form
            onSubmit={createRun}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "1.1fr 1.5fr 0.65fr 0.75fr 0.65fr 0.65fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
              Location
              <input
                value={newRun.location}
                onChange={(event) =>
                  setNewRun((prev) => ({ ...prev, location: event.target.value }))
                }
                placeholder="Chicago Loop"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
              Item / Task
              <input
                value={newRun.item}
                onChange={(event) =>
                  setNewRun((prev) => ({ ...prev, item: event.target.value }))
                }
                placeholder="Pickup documents"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
              Payout
              <input
                type="number"
                min="1"
                value={newRun.payout}
                onChange={(event) =>
                  setNewRun((prev) => ({ ...prev, payout: event.target.value }))
                }
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
              Item Budget
              <input
                type="number"
                min="0"
                value={newRun.itemBudgetEstimate}
                onChange={(event) =>
                  setNewRun((prev) => ({
                    ...prev,
                    itemBudgetEstimate: event.target.value,
                  }))
                }
                placeholder="0"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
              Platform Fee
              <input
                type="number"
                min="0"
                value={newRun.platformFee}
                onChange={(event) =>
                  setNewRun((prev) => ({ ...prev, platformFee: event.target.value }))
                }
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#334155" }}>
              Buffer
              <input
                type="number"
                min="0"
                value={newRun.bufferAmount}
                onChange={(event) =>
                  setNewRun((prev) => ({ ...prev, bufferAmount: event.target.value }))
                }
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              />
            </label>

            <button
              type="submit"
              disabled={creatingRun}
              style={{
                padding: "13px 16px",
                borderRadius: 12,
                background: creatingRun ? "#94a3b8" : "#111827",
                color: "white",
                border: "none",
                cursor: creatingRun ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              {creatingRun ? "Creating..." : "Create Run"}
            </button>
          </form>

          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: 900, color: "#0f172a" }}>
              Secure hold preview
            </div>
            <div>
              Estimated hold: <strong>{formatMoney(createRunSecurityPreview.holdAmount)}</strong>
            </div>
            <div>
              Max runner spend:{" "}
              <strong>{formatMoney(createRunSecurityPreview.maxRunnerSpend)}</strong>
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Item budget + payout + platform fee + buffer are used to protect requester funds
              and trigger receipt review if the runner spends over the allowed amount.
            </div>
          </div>
        </section>

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
            activeRuns.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                selected={selectedRun?.id === run.id}
                onSelect={() => setSelectedRunId(run.id)}
              />
            ))
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
              <RunCard
                key={run.id}
                run={run}
                completed
                selected={selectedRun?.id === run.id}
                onSelect={() => setSelectedRunId(run.id)}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
