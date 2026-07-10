import { useEffect, useRef, useState } from "react";
import { apiRequest } from "./api/client";
import { socket } from "./lib/socket"; // ✅ shared socket (FIX)
import LiveMap from "./components/LiveMap";
import { RunnerCommandCenter, deriveRunnerCommandData } from "./components/runner";
// RUN-UI-1H: Delivery PIN runner handoff copy only.
              <div
                data-run-ui-1h="runner-delivery-pin-copy"
                style={{
                  marginTop: 8,
                  marginBottom: 10,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(14, 165, 233, 0.2)",
                  background: "rgba(224, 242, 254, 0.82)",
                  color: "#075985",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {/* RUN-UI-1H-RUNNER-PIN-COPY */}
                Ask the requester or recipient for the Delivery PIN at handoff. Do not request it before the delivery or task is verified.
              </div>

function getCompletionSafety(run) {
  if (!run) {
    return {
      disabled: true,
      title: "No active run",
      detail: "Select an active run before completing.",
    };
  }

  const receiptRequired = Number(run.maxRunnerSpend || 0) > 0;
  const receiptUploaded = run.receiptStatus === "uploaded";
  const manualReviewRequired =
    Boolean(run.requiresManualReview) ||
    run.receiptStatus === "review_required" ||
    run.payoutStatus === "manual_review_required";

  if (manualReviewRequired) {
    return {
      disabled: true,
      title: "Waiting for requester manual review",
      detail: "This run has a receipt or spend issue that must be approved before completion.",
    };
  }

  if (receiptRequired && !receiptUploaded) {
    return {
      disabled: true,
      title: "Waiting for receipt proof",
      detail: "Submit receipt amount and proof before completing this purchase run.",
    };
  }

  if (!run.deliveryConfirmedAt) {
    return {
      disabled: true,
      title: "Waiting for delivery PIN confirmation",
      detail: "Ask the requester for their delivery PIN, then confirm delivery.",
    };
  }

  return {
    disabled: false,
    title: "Ready to complete",
    detail: "Receipt proof and delivery confirmation are complete.",
  };
}


export default function RunnerDashboard({ user }) {
  const [online, setOnline] = useState(false);
  const [runs, setRuns] = useState([]);
  const [statusMessage, setStatusMessage] = useState("Offline");
  const [deliveryPins, setDeliveryPins] = useState({});
  const [receiptProofs, setReceiptProofs] = useState({});
  const [actionMessage, setActionMessage] = useState(null);
  const [acceptMessage, setAcceptMessage] = useState(null);
  const [acceptingRunId, setAcceptingRunId] = useState(null);
  const [activeAction, setActiveAction] = useState(null);

  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);
  const acceptingRunIdRef = useRef(null);
  const activeActionRef = useRef(null);

  ////////////////////////////////////////////////////////
  // FETCH RUNS
  ////////////////////////////////////////////////////////
  async function fetchRuns() {
    try {
      const res = await apiRequest("/api/runs");

      if (res.success) {
        setRuns(() => {
          const map = new Map();

          res.runs.forEach((r) => {
            if (
              r.status === "open" ||
              r.status === "assigned" ||
              r.status === "arrived" ||
              r.status === "in_progress"
            ) {
              map.set(r.id, r);
            }
          });

          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error("Fetch runs error:", err);
    }
  }

  ////////////////////////////////////////////////////////
  // SOCKET EVENTS
  ////////////////////////////////////////////////////////
  useEffect(() => {
    if (!user?.id) return;

    socket.emit("join.runner", user.id);

    setRuns([]); // 🔥 CLEAN RESET

    fetchRuns(); // Load existing offers on page load/refresh

    socket.off("run.offer");
    socket.off("run.updated");
    socket.off("run.unavailable");

    const handleRunOffer = (data) => {
      if (!data?.run || !data?.offer) return;

      const incomingRun = {
        ...data.run,
        offerId: data.offer.id,
      };

      setRuns((prev) => {
        const exists = prev.find((r) => r.id === incomingRun.id);

        if (exists) {
          return prev.map((r) =>
            r.id === incomingRun.id ? incomingRun : r
          );
        }

        return [incomingRun, ...prev];
      });
    };

    const handleRunUpdated = (data) => {
      const updatedRun = data.run;
      if (!updatedRun?.id) return;

      setRuns((prev) =>
        prev.map((r) =>
          r.id === updatedRun.id
            ? { ...r, ...updatedRun, offerId: r.offerId }
            : r
        )
      );
    };

    const handleRunUnavailable = (data) => {
      const unavailableRunId = data?.runId;
      if (!unavailableRunId) return;

      setRuns((prev) => prev.filter((r) => r.id !== unavailableRunId));

      if (acceptingRunIdRef.current === unavailableRunId) {
        acceptingRunIdRef.current = null;
      }

      setAcceptingRunId((currentId) =>
        currentId === unavailableRunId ? null : currentId
      );

      setAcceptMessage({
        type: "error",
        text: data.reason || "This run is no longer available.",
      });
    };

    socket.on("run.offer", handleRunOffer);
    socket.on("run.updated", handleRunUpdated);
    socket.on("run.unavailable", handleRunUnavailable);

    return () => {
      socket.off("run.offer", handleRunOffer);
      socket.off("run.updated", handleRunUpdated);
      socket.off("run.unavailable", handleRunUnavailable);
    };
  }, [user?.id]);

  ////////////////////////////////////////////////////////
  // CLEANUP STALE RUNS
  ////////////////////////////////////////////////////////
  useEffect(() => {
    const interval = setInterval(() => {
      setRuns((prev) =>
        prev.filter(
          (r) =>
            r.status !== "completed" &&
            r.status !== "cancelled"
        )
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  ////////////////////////////////////////////////////////
  // GPS
  ////////////////////////////////////////////////////////
  function startGpsStreaming() {
    if (!navigator.geolocation) return;

    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentRef.current < 3000) return;

        lastSentRef.current = now;

        await apiRequest("/api/runners/location", {
          method: "POST",
          body: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
        });
      }
    );
  }

  function stopGpsStreaming() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  ////////////////////////////////////////////////////////
  // ONLINE TOGGLE
  ////////////////////////////////////////////////////////
  async function toggleOnline() {
    const nextOnline = !online;

    try {
      const res = await apiRequest("/api/runners/status", {
        method: "POST",
        body: { online: nextOnline },
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to update runner status");
      }

      setOnline(nextOnline);

      if (nextOnline) {
        setStatusMessage(
          navigator.geolocation ? "Online" : "Online - GPS unavailable"
        );
      } else {
        setStatusMessage("Offline");
        stopGpsStreaming();
      }
    } catch (err) {
      console.error("Runner status update failed:", err);
      setStatusMessage("Status failed");
    }
  }

  ////////////////////////////////////////////////////////
  // AUTO GPS CONTROL
  ////////////////////////////////////////////////////////
  useEffect(() => {
    if (!online) return;

    const activeRun = runs.find(
      (r) =>
        r.status === "assigned" ||
        r.status === "arrived" ||
        r.status === "in_progress"
    );

    if (activeRun) startGpsStreaming();
    else stopGpsStreaming();
  }, [runs, online]);

  ////////////////////////////////////////////////////////
  // ACTIONS
  ////////////////////////////////////////////////////////
  async function markArrived(id) {
    const actionKey = `${id}:arrived`;

    if (activeActionRef.current === actionKey) return;

    activeActionRef.current = actionKey;
    setActiveAction(actionKey);
    setActionMessage(null);

    try {
      const res = await apiRequest(`/api/runs/${id}/arrived`, {
        method: "POST",
      });

      if (res.success) {
        setActionMessage({ type: "success", text: "Arrival marked." });
        setRuns((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, ...res.run, status: res.run?.status || "arrived" } : r
          )
        );
        return;
      }

      setActionMessage({
        type: "error",
        text: res.error || "Could not mark this run as arrived.",
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message || "Could not mark this run as arrived.",
      });
    } finally {
      if (activeActionRef.current === actionKey) {
        activeActionRef.current = null;
      }

      setActiveAction((currentAction) =>
        currentAction === actionKey ? null : currentAction
      );
    }
  }

  async function submitReceiptProof(id) {
    const proof = receiptProofs[id] || {};
    const receiptAmount = Number(proof.receiptAmount);
    const receiptImageUrl = String(proof.receiptImageUrl || "").trim();

    if (!Number.isInteger(receiptAmount) || receiptAmount <= 0) {
      setActionMessage({ type: "error", text: "Enter a valid whole-dollar receipt amount." });
      return;
    }

    if (!receiptImageUrl) {
      setActionMessage({ type: "error", text: "Enter a receipt proof URL." });
      return;
    }

    const actionKey = `${id}:receipt-proof`;

    if (activeActionRef.current === actionKey) return;

    activeActionRef.current = actionKey;
    setActiveAction(actionKey);
    setActionMessage(null);

    try {
      const res = await apiRequest(`/api/runs/${id}/receipt-proof`, {
        method: "POST",
        body: { receiptAmount, receiptImageUrl },
      });

      if (res.success) {
        setActionMessage({ type: "success", text: "Receipt proof submitted." });
        setReceiptProofs((prev) => ({ ...prev, [id]: {} }));
        setRuns((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, ...res.run } : r
          )
        );
        fetchRuns();
        return;
      }

      setActionMessage({
        type: "error",
        text: res.error || "Could not submit receipt proof.",
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message || "Could not submit receipt proof.",
      });
    } finally {
      if (activeActionRef.current === actionKey) {
        activeActionRef.current = null;
      }

      setActiveAction((currentAction) =>
        currentAction === actionKey ? null : currentAction
      );
    }
  }

  async function confirmDelivery(id) {
    const deliveryPin = String(deliveryPins[id] || "").trim();

    if (!deliveryPin) {
      setActionMessage({ type: "error", text: "Enter the requester delivery PIN." });
      return;
    }

    const actionKey = `${id}:confirm-delivery`;

    if (activeActionRef.current === actionKey) return;

    activeActionRef.current = actionKey;
    setActiveAction(actionKey);
    setActionMessage(null);

    try {
      const res = await apiRequest(`/api/runs/${id}/confirm-delivery`, {
        method: "POST",
        body: { deliveryPin },
      });

      if (res.success) {
        setActionMessage({ type: "success", text: "Delivery confirmed. Payout is now ready." });
        setDeliveryPins((prev) => ({ ...prev, [id]: "" }));
        setRuns((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, ...res.run } : r
          )
        );
        fetchRuns();
        return;
      }

      setActionMessage({
        type: "error",
        text: res.error || "Could not confirm delivery PIN.",
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message || "Could not confirm delivery PIN.",
      });
    } finally {
      if (activeActionRef.current === actionKey) {
        activeActionRef.current = null;
      }

      setActiveAction((currentAction) =>
        currentAction === actionKey ? null : currentAction
      );
    }
  }

  async function markComplete(id) {
    const actionKey = `${id}:complete`;

    if (activeActionRef.current === actionKey) return;

    activeActionRef.current = actionKey;
    setActiveAction(actionKey);
    setActionMessage(null);

    try {
      const res = await apiRequest(`/api/runs/${id}/complete`, {
        method: "POST",
      });

      if (res.success) {
        setActionMessage({ type: "success", text: "Run completed." });
        setRuns((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, ...res.run, status: "completed" } : r
          )
        );
        return;
      }

      setActionMessage({
        type: "error",
        text: res.error || "Could not complete this run.",
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message || "Could not complete this run.",
      });
    } finally {
      if (activeActionRef.current === actionKey) {
        activeActionRef.current = null;
      }

      setActiveAction((currentAction) =>
        currentAction === actionKey ? null : currentAction
      );
    }
  }

  ////////////////////////////////////////////////////////
  // STATE
  ////////////////////////////////////////////////////////
  const activeRun = runs.find(
    (r) =>
      r.status === "assigned" ||
      r.status === "arrived" ||
      r.status === "in_progress"
  );

  const availableRuns = runs.filter(
    (r) => r.status === "open" && r.offerId
  );

  ////////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////////
  return (
    <div style={{ height: "100vh", background: "#0f0f0f", color: "#fff" }}>

      {/* =========================
        TOP STATUS BAR
    ========================= */}
      <div style={{
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #222"
      }}>
        <h3 style={{ margin: 0 }}>RUNFORME</h3>

        <button
          onClick={toggleOnline}
          style={{
            background: online ? "#16a34a" : "#444",
            color: "#fff",
            border: "none",
            padding: "6px 12px",
            borderRadius: 6
          }}
        >
          {statusMessage}
        </button>
      </div>

      {/* =========================
        MAP (PRIMARY SURFACE)
    ========================= */}
      <div style={{ height: "55%" }}>
        <LiveMap run={activeRun} />
      </div>

      {/* =========================
        ACTIVE RUN PANEL
    ========================= */}
      {activeRun && (
        <div style={{
          padding: 16,
          borderTop: "1px solid #222",
          background: "#111"
        }}>
          <h4>Active Run</h4>
          <p>{activeRun.item}</p>

          {actionMessage && (
            <div style={{
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
              background: actionMessage.type === "success" ? "#064e3b" : "#7f1d1d",
              color: "white"
            }}>
              {actionMessage.text}
            </div>
          )}

          {activeRun.status === "assigned" && (
            <button
              onClick={() => markArrived(activeRun.id)}
              disabled={activeAction === `${activeRun.id}:arrived`}
              style={{
                opacity: activeAction === `${activeRun.id}:arrived` ? 0.55 : 1,
                cursor: activeAction === `${activeRun.id}:arrived` ? "not-allowed" : "pointer",
              }}
            >
              {activeAction === `${activeRun.id}:arrived` ? "Marking arrival..." : "Arrived"}
            </button>
          )}

          {activeRun.status === "arrived" && (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {Number(activeRun.maxRunnerSpend || 0) > 0 && (
                <div style={{
                  border: "1px solid #334155",
                  borderRadius: 10,
                  padding: 12,
                  background: "#0f172a"
                }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800, letterSpacing: 1 }}>
                    SPEND LIMIT
                  </div>

                  <div style={{
                    marginTop: 8,
                    display: "grid",
                    gap: 8
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12
                    }}>
                      <span style={{ opacity: 0.75 }}>Max runner spend</span>
                      <strong>${Number(activeRun.maxRunnerSpend || 0)}</strong>
                    </div>

                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12
                    }}>
                      <span style={{ opacity: 0.75 }}>Receipt status</span>
                      <strong>{String(activeRun.receiptStatus || "not_uploaded").replaceAll("_", " ")}</strong>
                    </div>

                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12
                    }}>
                      <span style={{ opacity: 0.75 }}>Payout status</span>
                      <strong>{String(activeRun.payoutStatus || "not_started").replaceAll("_", " ")}</strong>
                    </div>
                  </div>

                  <p style={{
                    marginTop: 10,
                    marginBottom: 0,
                    color: "#cbd5e1",
                    fontSize: 13,
                    lineHeight: 1.5
                  }}>
                    Submit receipt proof for this purchase. Spending over the max runner spend
                    will require requester manual review before completion or payout.
                  </p>

                  {activeRun.requiresManualReview && (
                    <p style={{
                      marginTop: 10,
                      marginBottom: 0,
                      color: "#fde68a",
                      fontSize: 13,
                      fontWeight: 800
                    }}>
                      Manual review is required. Wait for requester approval before completing.
                    </p>
                  )}
                </div>
              )}

              {Number(activeRun.maxRunnerSpend || 0) > 0 && (
                <div style={{
                  border: "1px solid #333",
                  borderRadius: 10,
                  padding: 12,
                  background: "#181818"
                }}>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>
                    PURCHASE PROOF
                  </div>

                  {activeRun.receiptStatus === "uploaded" ||
                  activeRun.receiptStatus === "review_required" ? (
                    <p style={{
                      color: activeRun.receiptStatus === "review_required" ? "#fde68a" : "#86efac",
                      marginBottom: 0
                    }}>
                      Receipt proof {activeRun.receiptStatus === "review_required" ? "needs review" : "uploaded"}.
                    </p>
                  ) : (
                    <>
                      <p style={{ opacity: 0.75 }}>
                        Submit receipt amount and proof before settlement.
                      </p>

                      <input
                        type="number"
                        min="1"
                        value={receiptProofs[activeRun.id]?.receiptAmount || ""}
                        onChange={(event) =>
                          setReceiptProofs((prev) => ({
                            ...prev,
                            [activeRun.id]: {
                              ...(prev[activeRun.id] || {}),
                              receiptAmount: event.target.value,
                            },
                          }))
                        }
                        placeholder="Receipt amount"
                        inputMode="numeric"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid #444",
                          background: "#0b0b0b",
                          color: "white",
                          marginBottom: 10,
                        }}
                      />

                      <input
                        value={receiptProofs[activeRun.id]?.receiptImageUrl || ""}
                        onChange={(event) =>
                          setReceiptProofs((prev) => ({
                            ...prev,
                            [activeRun.id]: {
                              ...(prev[activeRun.id] || {}),
                              receiptImageUrl: event.target.value,
                            },
                          }))
                        }
                        placeholder="Receipt proof URL"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid #444",
                          background: "#0b0b0b",
                          color: "white",
                          marginBottom: 10,
                        }}
                      />

                      <button
                        onClick={() => submitReceiptProof(activeRun.id)}
                        disabled={activeAction === `${activeRun.id}:receipt-proof`}
                        style={{
                          opacity: activeAction === `${activeRun.id}:receipt-proof` ? 0.55 : 1,
                          cursor: activeAction === `${activeRun.id}:receipt-proof` ? "not-allowed" : "pointer",
                        }}
                      >
                        {activeAction === `${activeRun.id}:receipt-proof` ? "Submitting receipt..." : "Submit Receipt Proof"}
                      </button>
                    </>
                  )}
                </div>
              )}
              <div style={{
                border: "1px solid #333",
                borderRadius: 10,
                padding: 12,
                background: "#181818"
              }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>
                  DELIVERY SECURITY
                </div>

                {activeRun.deliveryConfirmedAt ? (
                  <p style={{ color: "#86efac", marginBottom: 0 }}>
                    Delivery confirmed. Payout is ready.
                  </p>
                ) : (
                  <>
                    <p style={{ opacity: 0.75 }}>
                      Ask the requester for their delivery PIN before completing this run.
                    </p>

                    <input
                      value={deliveryPins[activeRun.id] || ""}
                      onChange={(event) =>
                        setDeliveryPins((prev) => ({
                          ...prev,
                          [activeRun.id]: event.target.value,
                        }))
                      }
                      placeholder="Enter delivery PIN"
                      inputMode="numeric"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: "#0b0b0b",
                        color: "white",
                        marginBottom: 10,
                      }}
                    />

                    <button
                      onClick={() => confirmDelivery(activeRun.id)}
                      disabled={activeAction === `${activeRun.id}:confirm-delivery`}
                      style={{
                        opacity: activeAction === `${activeRun.id}:confirm-delivery` ? 0.55 : 1,
                        cursor: activeAction === `${activeRun.id}:confirm-delivery` ? "not-allowed" : "pointer",
                      }}
                    >
                      {activeAction === `${activeRun.id}:confirm-delivery` ? "Confirming delivery..." : "Confirm Delivery PIN"}
                    </button>
                  </>
                )}
              </div>

              {(() => {
                const completionSafety = getCompletionSafety(activeRun);


  // RUN-UI-1D-CHECKPOINT-4: display-only data for runner command center preview.
  // RUN-UI-1D-CHECKPOINT-6: live-data derivation moved into a pure runner helper.
  // RUN-UI-1D-CHECKPOINT-6A: unused available/completed aliases removed after lint validation.
  const {
    focusedRun: runnerCommandFocusedRun,
    statusLabel: runnerCommandStatusLabel,
    metrics: runnerCommandMetrics,
    checklistItems: runnerCommandChecklistItems,
  } = deriveRunnerCommandData({
    availableRuns: Array.isArray(availableRuns) ? availableRuns : [],
    completedRuns: [],
    focusedRun: activeRun,
    statusLabel: online ? "Online" : "Offline",
  });

return (
                  <div style={{
                    border: "1px solid #333",
                    borderRadius: 10,
                    padding: 12,
                    background: "#111827"
                  }}>
      {/* RUN-UI-1D-CHECKPOINT-3: display-only runner command center preview. */}
      {/* RUN-UI-1D-CHECKPOINT-5: layout-only placement shell for runner command center preview. */}
      <div className="runner-command-center-preview-slot">
        <RunnerCommandCenter
          title="Runner command center preview"
          note="Live display data now powers this preview while existing runner actions remain untouched."
          statusLabel={runnerCommandStatusLabel}
          metrics={runnerCommandMetrics}
          focusedRun={runnerCommandFocusedRun}
          checklistItems={runnerCommandChecklistItems}
        />
      </div>

                    <div style={{
                      fontSize: 12,
                      opacity: 0.75,
                      fontWeight: 800,
                      letterSpacing: 1
                    }}>
                      COMPLETION STATUS
                    </div>

                    <p style={{
                      marginTop: 8,
                      marginBottom: 4,
                      color: completionSafety.disabled ? "#fde68a" : "#86efac",
                      fontWeight: 800
                    }}>
                      {completionSafety.title}
                    </p>

                    <p style={{
                      marginTop: 0,
                      color: "#cbd5e1",
                      fontSize: 13,
                      lineHeight: 1.5
                    }}>
                      {completionSafety.detail}
                    </p>

                    <button
                      onClick={() => markComplete(activeRun.id)}
                      disabled={
                        completionSafety.disabled ||
                        activeAction === `${activeRun.id}:complete`
                      }
                      style={{
                        opacity:
                          completionSafety.disabled ||
                          activeAction === `${activeRun.id}:complete`
                            ? 0.5
                            : 1,
                        cursor:
                          completionSafety.disabled ||
                          activeAction === `${activeRun.id}:complete`
                            ? "not-allowed"
                            : "pointer",
                        width: "100%",
                      }}
                    >
                      {completionSafety.disabled
                        ? completionSafety.title
                        : activeAction === `${activeRun.id}:complete`
                          ? "Completing..."
                          : "Complete Run"}
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* =========================
        AVAILABLE RUNS (BOTTOM SHEET)
    ========================= */}
      {/* RUN-UI-1F-CHECKPOINT-2: keep the polished runner command center visible on the base runner dashboard when no active run is selected. */}
      {!activeRun && (() => {
        const {
          focusedRun: runnerCommandFocusedRun,
          statusLabel: runnerCommandStatusLabel,
          metrics: runnerCommandMetrics,
          checklistItems: runnerCommandChecklistItems,
        } = deriveRunnerCommandData({
          availableRuns: Array.isArray(availableRuns) ? availableRuns : [],
          completedRuns: [],
          focusedRun: null,
          statusLabel: online ? "Online" : "Offline",
        });

        return (
          <div className="runner-command-center-preview-slot">
            <RunnerCommandCenter
              title="Runner command center preview"
              note="Live display data now powers this preview while existing runner actions remain untouched."
              statusLabel={runnerCommandStatusLabel}
              metrics={runnerCommandMetrics}
              focusedRun={runnerCommandFocusedRun}
              checklistItems={runnerCommandChecklistItems}
            />
          </div>
        );
      })()}

      {/* RUN-UI-1G-CHECKPOINT-2: visual-only polish for the runner Available Runs shell. */}
      {!activeRun && (
        <div className="runner-available-runs-panel" style={{
          padding: 16,
          borderTop: "1px solid #222",
          background: "#111"
        }}>
          <h4 className="runner-available-runs-panel__title">Available Runs</h4>

          <p className="runner-available-runs-panel__note" style={{
            marginTop: 4,
            marginBottom: 12,
            color: "#cbd5e1",
            fontSize: 13,
            lineHeight: 1.5
          }}>
            Purchase-budget runs are only shown here after the requester authorizes the secure hold.
            Current placeholder mode does not make a live card charge.
          </p>

          {availableRuns.length === 0 && (
            <p className="runner-available-runs-panel__empty" style={{ opacity: 0.6 }}>Waiting for jobs...</p>
          )}

          {acceptMessage && (
            <div style={{
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
              background: acceptMessage.type === "success" ? "#064e3b" : "#7f1d1d",
              color: "white",
              fontSize: 13,
              lineHeight: 1.45
            }}>
              {acceptMessage.text}
            </div>
          )}

          {availableRuns.slice(0, 3).map((run) => (
            <div key={run.id} style={{
              border: "1px solid #333",
              padding: 12,
              marginBottom: 10,
              borderRadius: 8
            }}>
              <p>{run.item}</p>

              {Number(run.maxRunnerSpend || 0) > 0 && (
                <p style={{
                  marginTop: -4,
                  marginBottom: 10,
                  color: "#fde68a",
                  fontSize: 12,
                  lineHeight: 1.45,
                  fontWeight: 700
                }}>
                  Secure hold authorized by requester before this offer appeared. Placeholder mode only - no live card charge.
                </p>
              )}

              <button
                disabled={acceptingRunId === run.id}
                onClick={async () => {
                  if (!run.id) return;

                  if (acceptingRunIdRef.current === run.id) return;

                  acceptingRunIdRef.current = run.id;
                  setAcceptingRunId(run.id);

                  setAcceptMessage(null);

                  try {
                    console.log("✅ ACCEPTING RUN:", run.id);

                    const res = await apiRequest(
                      `/api/runs/${run.id}/accept`,
                      { method: "POST" }
                    );

                    console.log("✅ ACCEPT RESULT:", res);

                    if (res.success) {
                      setAcceptMessage({
                        type: "success",
                        text: "Run accepted. Head to the pickup location when ready.",
                      });

                      setRuns((prev) =>
                        prev.map((r) =>
                          r.id === run.id
                            ? { ...r, status: "assigned" }
                            : r
                        )
                      );

                      return;
                    }

                    setAcceptMessage({
                      type: "error",
                      text: res.error || "Could not accept this run. It may no longer be available or the requester secure hold is not authorized yet.",
                    });
                  } catch (err) {
                    console.error("Accept run failed:", err);

                    setAcceptMessage({
                      type: "error",
                      text: err.message || "Could not accept this run. It may no longer be available or the requester secure hold is not authorized yet.",
                    });
                  } finally {
                    if (acceptingRunIdRef.current === run.id) {
                      acceptingRunIdRef.current = null;
                    }

                    setAcceptingRunId((currentId) =>
                      currentId === run.id ? null : currentId
                    );
                  }
                }}
                style={{
                  opacity: acceptingRunId === run.id ? 0.55 : 1,
                  cursor: acceptingRunId === run.id ? "not-allowed" : "pointer",
                  background: "#f59e0b",
                  color: "#000",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 6
                }}
              >
                {acceptingRunId === run.id ? "Accepting..." : "Accept"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
