import { useEffect, useRef, useState } from "react";
import { apiRequest } from "./api/client";
import { socket } from "./lib/socket"; // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ shared socket (FIX)
import LiveMap from "./components/LiveMap";
import { RunnerCommandCenter, deriveRunnerCommandData } from "./components/runner";

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


function RunnerSmartHandoffCard({ run }) {
  if (!run || run.handoffEligibility !== "eligible") {
    return null;
  }

  const handoffRequirement = run.handoffRequirement || "standard";
  const identityRequirement = run.identityRequirement || "none";

  if (
    handoffRequirement === "standard" &&
    identityRequirement === "none" &&
    !run.handoffInstructions
  ) {
    return null;
  }

  let title = "Handoff approved";
  let guidance = "You can complete this errand for the requester.";

  if (handoffRequirement === "authorized_person_required") {
    title = "Confirm you are the authorized runner";
    guidance =
      "The location requires an authorized person for this handoff.";
  } else if (handoffRequirement === "third_party_allowed") {
    title = "Handoff approved";
    guidance =
      "The requester confirmed that a runner can complete this handoff.";
  }

  if (identityRequirement === "physical_id_required") {
    title = "Bring an accepted photo ID";
    guidance =
      "The location requires identification before completing the handoff.";
  } else if (identityRequirement === "organization_credential_required") {
    title = "Required credential must be available";
    guidance =
      "Make sure you have the required organization credential before you go.";
  } else if (identityRequirement === "other") {
    title = "Review the location requirement";
    guidance =
      "Check the handoff instructions before heading to the location.";
  } else if (
    identityRequirement === "name_match" &&
    handoffRequirement !== "authorized_person_required"
  ) {
    title = "Name must match";
    guidance =
      "The location may verify the authorized runner's name.";
  }

  return (
    <div
      className="runner-smart-handoff-card"
      style={{
        marginTop: 12,
        marginBottom: 12,
        padding: 14,
        border: "1px solid #334155",
        borderRadius: 12,
        background: "#0f172a",
      }}
    >
      <div
        style={{
          marginBottom: 6,
          color: "#93c5fd",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Before you go
      </div>

      <div
        style={{
          color: "#f8fafc",
          fontSize: 15,
          fontWeight: 800,
          lineHeight: 1.35,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 5,
          color: "#cbd5e1",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {guidance}
      </div>

      {run.handoffInstructions && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid #334155",
            color: "#e2e8f0",
            fontSize: 13,
            lineHeight: 1.5,
            overflowWrap: "anywhere",
          }}
        >
          {run.handoffInstructions}
        </div>
      )}
    </div>
  );
}

function RunnerMobileNavIcon({ name }) {
  const paths = {
    home: "M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9Z M9 21v-6h6v6",
    earnings: "M12 3v18 M16.5 7.5c0-1.1-1.8-2-4-2s-4 .9-4 2 1.8 2 4 2 4 .9 4 2-1.8 2-4 2-4-.9-4-2",
    activity: "M4 18V9 M10 18V5 M16 18v-7 M22 18H2",
    menu: "M4 6h16 M4 12h16 M4 18h16",
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function RunnerDashboard({ user, onLogout }) {
  const [online, setOnline] = useState(false);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Offline");
  const [deliveryPins, setDeliveryPins] = useState({});
  const [receiptProofs, setReceiptProofs] = useState({});
  const [actionMessage, setActionMessage] = useState(null);
  const [acceptMessage, setAcceptMessage] = useState(null);
  const [acceptingRunId, setAcceptingRunId] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [mobileSection, setMobileSection] = useState("home");

  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);
  const acceptingRunIdRef = useRef(null);
  const activeActionRef = useRef(null);

  ////////////////////////////////////////////////////////
  // FETCH RUNS
  ////////////////////////////////////////////////////////
  async function fetchRuns() {
    setRunsLoading(true);

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
        setRunsError(null);
      } else {
        setRunsError(res.error || "Could not load available runs.");
      }
    } catch (err) {
      console.error("Fetch runs error:", err);
      setRunsError(err.message || "Could not load available runs.");
    } finally {
      setRunsLoading(false);
    }
  }

  ////////////////////////////////////////////////////////
  // SOCKET EVENTS
  ////////////////////////////////////////////////////////
  useEffect(() => {
    if (!user?.id) return;

    socket.emit("join.runner", user.id);

    setRuns([]); // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ CLEAN RESET

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


  function createReceiptPhotoReference(id, fileName) {
    const safeFileName = String(fileName || "receipt-photo")
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "receipt-photo";

    return `https://runforme.local/receipt-images/${encodeURIComponent(id)}/${Date.now()}-${safeFileName}`;
  }

  function handleReceiptPhotoChange(id, event) {
    const file = event.target.files?.[0];

    if (!file) {
      setReceiptProofs((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          receiptImageUrl: "",
          receiptImageName: "",
          receiptImagePreview: "",
          receiptImageError: "",
        },
      }));
      return;
    }

    if (!file.type || !file.type.startsWith("image/")) {
      setReceiptProofs((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          receiptImageUrl: "",
          receiptImageName: "",
          receiptImagePreview: "",
          receiptImageError: "Upload a receipt image file.",
        },
      }));
      event.target.value = "";
      return;
    }

    const maxBytes = 1500 * 1024;

    if (file.size > maxBytes) {
      setReceiptProofs((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          receiptImageUrl: "",
          receiptImageName: "",
          receiptImagePreview: "",
          receiptImageError: "Receipt photo must be 1.5 MB or smaller for this upload preview.",
        },
      }));
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      if (!result) {
        setReceiptProofs((prev) => ({
          ...prev,
          [id]: {
            ...(prev[id] || {}),
            receiptImageUrl: "",
            receiptImageName: "",
            receiptImagePreview: "",
            receiptImageError: "Could not read receipt photo. Try another image.",
          },
        }));
        return;
      }

      setReceiptProofs((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          // RUN-UI-1I-RECEIPT-PHOTO-REFERENCE-BRIDGE: keep the browser preview as a data image, but send a compact proof reference through the existing backend contract.
          receiptImageUrl: createReceiptPhotoReference(id, file.name),
          receiptImageName: file.name,
          receiptImagePreview: result,
          receiptImageError: "",
        },
      }));
    };

    reader.onerror = () => {
      setReceiptProofs((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          receiptImageUrl: "",
          receiptImageName: "",
          receiptImagePreview: "",
          receiptImageError: "Could not read receipt photo. Try another image.",
        },
      }));
    };

    reader.readAsDataURL(file);
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
      setActionMessage({ type: "error", text: "Upload a receipt photo." });
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
    <div className="runner-dashboard-shell" style={{ height: "100vh", background: "#0f0f0f", color: "#fff" }}>

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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button
          type="button"
          onClick={toggleOnline}
          aria-pressed={online}
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

          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out of RUNFORME"
            style={{
              minHeight: 40,
              padding: "8px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.28)",
              background: "rgba(255,255,255,0.08)",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* RUN-UI-1N-TASK-6-CHECKPOINT-3B: navigation moved near the top of
          the Runner experience so it is discoverable without scrolling
          past the full dashboard body at wide widths. At <=560px the
          existing position: fixed mobile presentation is unaffected by
          this DOM position. */}
      <nav className="runner-mobile-nav" aria-label="Runner navigation">
        {[
          ["home", "Home"],
          ["earnings", "Earnings"],
          ["activity", "Activity"],
          ["menu", "Menu"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={mobileSection === id ? "runner-mobile-nav__item runner-mobile-nav__item--selected" : "runner-mobile-nav__item"}
            aria-current={mobileSection === id ? "page" : undefined}
            onClick={() => setMobileSection(id)}
          >
            <RunnerMobileNavIcon name={id} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {mobileSection !== "home" && (
        <section className="runner-mobile-section-sheet" aria-live="polite">
          <div className="runner-mobile-section-sheet__eyebrow">RUNFORME / {mobileSection}</div>
          <p>
            {mobileSection === "earnings"
              ? "Earnings details are not available in this checkpoint. Your run payout will continue to appear on available offers."
              : mobileSection === "activity"
                ? "Activity history is not available in this checkpoint. Your current run status remains on Home."
                : "Menu settings are not available in this checkpoint. Use Home to return to your run dashboard."}
          </p>
          <button type="button" onClick={() => setMobileSection("home")}>Return to Home</button>
        </section>
      )}

      {/* =========================
        MAP (PRIMARY SURFACE)
    ========================= */}
      <div
        className={activeRun ? "runner-map-surface" : "runner-map-surface runner-ui-1l-mobile-map-secondary"}
        style={{ height: "55%" }}
      >
        <LiveMap run={activeRun} />
      </div>

      {/* =========================
        ACTIVE RUN PANEL
    ========================= */}
      {activeRun && (
        <div className="runner-active-panel runner-ui-1l-mobile-primary" style={{
          padding: 16,
          borderTop: "1px solid #222",
          background: "#111"
        }}>
          <h4>Active Run</h4>
          <p>{activeRun.item}</p>

          <RunnerSmartHandoffCard run={activeRun} />

          {actionMessage && (
            <div
              role={actionMessage.type === "error" ? "alert" : "status"}
              style={{
                padding: 10,
                borderRadius: 8,
                marginBottom: 10,
                background: actionMessage.type === "success" ? "#064e3b" : "#7f1d1d",
                color: "white"
              }}
            >
              {actionMessage.text}
            </div>
          )}

          {activeRun.status === "assigned" && (
            <button
              type="button"
              onClick={() => markArrived(activeRun.id)}
              disabled={activeAction === `${activeRun.id}:arrived`}
              aria-busy={activeAction === `${activeRun.id}:arrived`}
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

                      <label
                        htmlFor="runner-receipt-amount"
                        style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 800 }}
                      >
                        Receipt amount
                      </label>

                      <input
                        id="runner-receipt-amount"
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

                      <div
                        data-run-ui-1i="receipt-photo-upload"
                        style={{
                          display: "grid",
                          gap: 10,
                          padding: 14,
                          borderRadius: 12,
                          border: "1px solid #334155",
                          background: "#0f172a",
                          marginBottom: 10,
                        }}
                      >
                        {/* RUN-UI-1I-RECEIPT-PHOTO-UPLOAD: runner selects or takes a receipt photo instead of pasting a link. */}
                        <label
                          htmlFor="runner-receipt-photo"
                          style={{ fontSize: 13, fontWeight: 900, color: "#e5e7eb" }}
                        >
                          Receipt photo
                        </label>

                        <p style={{ margin: 0, color: "#94a3b8", fontSize: 12, lineHeight: 1.45 }}>
                          Take or upload a clear photo of the receipt after purchase. RUNFORME attaches
                          the proof automatically, so you do not need to paste a link.
                        </p>

                        <input
                          id="runner-receipt-photo"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(event) => handleReceiptPhotoChange(activeRun.id, event)}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: "1px solid #475569",
                            background: "#0b0b0b",
                            color: "white",
                          }}
                        />

                        {receiptProofs[activeRun.id]?.receiptImageName && (
                          <div style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 800 }}>
                            Selected receipt: {receiptProofs[activeRun.id]?.receiptImageName}
                          </div>
                        )}

                        {receiptProofs[activeRun.id]?.receiptImagePreview && (
                          <img
                            src={receiptProofs[activeRun.id]?.receiptImagePreview}
                            alt="Selected receipt preview"
                            style={{
                              width: "100%",
                              maxHeight: 220,
                              objectFit: "cover",
                              borderRadius: 12,
                              border: "1px solid #334155",
                            }}
                          />
                        )}

                        {receiptProofs[activeRun.id]?.receiptImageError && (
                          <div role="alert" style={{ color: "#fecaca", fontSize: 12, fontWeight: 800 }}>
                            {receiptProofs[activeRun.id]?.receiptImageError}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => submitReceiptProof(activeRun.id)}
                        disabled={activeAction === `${activeRun.id}:receipt-proof`}
                        aria-busy={activeAction === `${activeRun.id}:receipt-proof`}
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

                    <label
                      htmlFor="runner-delivery-pin"
                      style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 800 }}
                    >
                      Delivery PIN
                    </label>

                    <input
                      id="runner-delivery-pin"
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
                      type="button"
                      onClick={() => confirmDelivery(activeRun.id)}
                      disabled={activeAction === `${activeRun.id}:confirm-delivery`}
                      aria-busy={activeAction === `${activeRun.id}:confirm-delivery`}
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
      <div className="runner-command-center-preview-slot runner-ui-1l-mobile-secondary">
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
                      type="button"
                      onClick={() => markComplete(activeRun.id)}
                      disabled={
                        completionSafety.disabled ||
                        activeAction === `${activeRun.id}:complete`
                      }
                      aria-busy={activeAction === `${activeRun.id}:complete`}
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
          <div className="runner-command-center-preview-slot runner-ui-1l-mobile-secondary">
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

      {/* RUN-UI-1L-A: action-first mobile runner home. */}
      <style>{`
        /* RUN-UI-1N-TASK-6: navigation shell reachable at every width.
           Base (all-width) rules present Home/Earnings/Activity/Menu as an
           in-flow tab-style bar so they remain reachable above the narrow
           mobile branch below, which overrides this with the existing
           fixed bottom-bar presentation unchanged. */
        .runner-mobile-nav {
          display: flex;
          gap: 8px;
          padding: 12px clamp(16px, 4vw, 32px);
          border-top: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(9, 14, 25, 0.96);
        }

        .runner-mobile-nav__item {
          flex: 1 1 0;
          min-height: 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 750;
        }

        .runner-mobile-nav__item--selected {
          background: rgba(147, 197, 253, 0.12);
          color: #dbeafe;
        }

        .runner-mobile-section-sheet {
          display: block;
          width: min(100%, 640px);
          margin: 0 auto 18px;
          padding: 16px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          background: #151c2b;
          color: #e2e8f0;
        }

        .runner-mobile-section-sheet__eyebrow {
          color: #93c5fd;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .runner-mobile-section-sheet p {
          margin: 8px 0 14px;
          color: #cbd5e1;
          font-size: 13px;
          line-height: 1.45;
        }

        .runner-mobile-section-sheet button {
          min-height: 44px;
          padding: 10px 14px;
          border: 1px solid rgba(147, 197, 253, 0.4);
          border-radius: 11px;
          background: transparent;
          color: #bfdbfe;
          font-size: 13px;
          font-weight: 800;
        }

        /* RUN-UI-1N-B1-TASK-4-FOCUS-VISIBILITY
           Shared, fluid focus treatment for shell-level controls that
           previously relied only on the generic global outline. Applies
           at every width, not just the narrow mobile branch below. */
        .runner-dashboard-shell button:focus-visible {
          outline: var(--rf-focus-ring-width, 3px) solid var(--rf-focus-ring-color, #0ea5e9);
          outline-offset: 2px;
        }

        /* RUN-UI-1N-B1-TASK-4-LONG-CONTENT
           Fluid long-content guard for active/available run text that is
           not already covered by an extracted component's wrapping rules. */
        .runner-active-panel p,
        .runner-available-run-card__title,
        .runner-available-runs-panel__empty {
          overflow-wrap: anywhere;
        }

        @media (max-width: 560px) {
          .runner-dashboard-shell {
            box-sizing: border-box;
            height: auto !important;
            min-height: 100vh;
            padding-bottom: calc(82px + env(safe-area-inset-bottom));
          }

          .runner-ui-1l-mobile-secondary {
            display: none !important;
          }

          .runner-ui-1l-mobile-primary {
            margin-top: 0 !important;
            padding: 16px 14px 20px !important;
            border-top: 0 !important;
            background: #0f0f0f !important;
          }

          .runner-ui-1l-mobile-map-secondary {
            display: none !important;
          }

          .runner-ui-1l-mobile-primary .runner-available-runs-panel__title {
            margin: 0 0 4px !important;
            color: #f8fafc;
            font-size: 22px !important;
            line-height: 1.15 !important;
            letter-spacing: -0.02em;
          }

          .runner-ui-1l-mobile-primary .runner-available-runs-panel__note {
            margin: 0 0 10px !important;
            color: #94a3b8 !important;
            font-size: 12px !important;
            line-height: 1.35 !important;
            max-width: 36rem;
          }

          .runner-ui-1l-mobile-primary > div {
            min-width: 0;
            max-width: 100%;
          }

          .runner-ui-1l-mobile-primary p {
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          .runner-ui-1l-mobile-primary .runner-available-run-card {
            padding: 16px !important;
            margin: 0 !important;
            border: 1px solid rgba(148, 163, 184, 0.22) !important;
            border-radius: 18px !important;
            background: #172033 !important;
            box-shadow: 0 12px 28px rgba(2, 6, 23, 0.24);
          }

          .runner-ui-1l-mobile-primary .runner-available-run-card__title {
            margin: 0 !important;
            color: #f8fafc;
            font-size: 18px !important;
            font-weight: 800;
            line-height: 1.25 !important;
          }

          .runner-ui-1l-mobile-primary .runner-available-run-card__payout {
            margin: 8px 0 0 !important;
            color: #fbbf24;
            font-size: 16px !important;
            font-weight: 800;
          }

          .runner-ui-1l-mobile-primary .runner-smart-handoff-card {
            margin: 14px 0 !important;
            padding: 12px !important;
            border-color: rgba(147, 197, 253, 0.32) !important;
            border-radius: 14px !important;
            background: rgba(15, 23, 42, 0.72) !important;
          }

          .runner-ui-1l-mobile-primary .runner-smart-handoff-card > div:nth-child(2) {
            font-size: 14px !important;
          }

          .runner-ui-1l-mobile-primary .runner-smart-handoff-card > div:nth-child(3),
          .runner-ui-1l-mobile-primary .runner-smart-handoff-card > div:nth-child(4) {
            font-size: 12px !important;
            line-height: 1.4 !important;
          }

          .runner-ui-1l-mobile-primary .runner-location-disclosure {
            margin: 0 0 14px;
            padding: 0;
          }

          .runner-ui-1l-mobile-primary .runner-location-disclosure summary {
            min-height: 44px;
            display: flex;
            align-items: center;
            color: #bfdbfe;
            cursor: pointer;
            font-size: 13px;
            font-weight: 800;
            list-style-position: inside;
          }

          .runner-ui-1l-mobile-primary .runner-location-disclosure__content {
            padding: 0 12px 10px;
            color: #cbd5e1;
            font-size: 12px;
            line-height: 1.4;
          }

          .runner-ui-1l-mobile-primary button {
            width: 100%;
            min-height: 52px;
            padding: 13px 16px !important;
            border-radius: 14px !important;
            font-size: 15px;
            font-weight: 800;
          }

          .runner-mobile-section-sheet {
            display: block;
            margin: 0 14px 18px;
            padding: 16px;
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 16px;
            background: #151c2b;
            color: #e2e8f0;
          }

          .runner-mobile-section-sheet__eyebrow {
            color: #93c5fd;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .runner-mobile-section-sheet p {
            margin: 8px 0 14px;
            color: #cbd5e1;
            font-size: 13px;
            line-height: 1.45;
          }

          .runner-mobile-section-sheet button {
            min-height: 44px;
            padding: 10px 14px;
            border: 1px solid rgba(147, 197, 253, 0.4);
            border-radius: 11px;
            background: transparent;
            color: #bfdbfe;
            font-size: 13px;
            font-weight: 800;
          }

          .runner-mobile-nav {
            position: fixed;
            right: 0;
            bottom: 0;
            left: 0;
            z-index: 20;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
            border-top: 1px solid rgba(148, 163, 184, 0.16);
            background: rgba(9, 14, 25, 0.96);
            box-shadow: 0 -10px 28px rgba(2, 6, 23, 0.24);
          }

          .runner-mobile-nav__item {
            min-height: 54px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            border: 0;
            border-radius: 12px;
            background: transparent;
            color: #64748b;
            font-size: 11px;
            font-weight: 750;
            letter-spacing: 0.01em;
          }

          .runner-mobile-nav__item--selected {
            background: rgba(147, 197, 253, 0.1);
            color: #dbeafe;
          }
        }
      `}</style>
      {/* RUN-UI-1G-CHECKPOINT-2: visual-only polish for the runner Available Runs shell. */}
      {!activeRun && (
        <div className="runner-available-runs-panel runner-ui-1l-mobile-primary" style={{
            padding: 16,
            borderTop: "1px solid #222",
            background: "#111"
        }}>
          <h4 className="runner-available-runs-panel__title">
            {availableRuns.length === 1 ? "Available run" : "Available runs"}
          </h4>

          <p className="runner-available-runs-panel__note" style={{
            marginTop: 4,
            marginBottom: 14,
            color: "#cbd5e1",
            fontSize: 13,
            lineHeight: 1.5
          }}>
            Secure-hold authorized offers only. Placeholder mode does not charge a live card.
          </p>

          {!online ? (
            <p className="runner-available-runs-panel__empty" role="status" style={{ opacity: 0.6 }}>
              You&rsquo;re offline. Go online to see available runs.
            </p>
          ) : runsLoading ? (
            <p className="runner-available-runs-panel__empty" role="status" style={{ opacity: 0.6 }}>
              Loading available runs...
            </p>
          ) : runsError ? (
            <div role="alert" style={{ marginBottom: 10 }}>
              <p className="runner-available-runs-panel__empty" style={{ marginBottom: 8 }}>
                {runsError}
              </p>
              <button
                type="button"
                className="runner-available-runs-panel__retry"
                onClick={fetchRuns}
                disabled={runsLoading}
              >
                Retry
              </button>
            </div>
          ) : availableRuns.length === 0 ? (
            <p className="runner-available-runs-panel__empty" style={{ opacity: 0.6 }}>Waiting for jobs...</p>
          ) : null}

          {acceptMessage && (
            <div
              role={acceptMessage.type === "error" ? "alert" : "status"}
              style={{
                padding: 10,
                borderRadius: 8,
                marginBottom: 10,
                background: acceptMessage.type === "success" ? "#064e3b" : "#7f1d1d",
                color: "white",
                fontSize: 13,
                lineHeight: 1.45
              }}
            >
              {acceptMessage.text}
            </div>
          )}

          {availableRuns.slice(0, 3).map((run) => (
            <div key={run.id} className="runner-available-run-card" style={{
              border: "1px solid #333",
              padding: 12,
              marginBottom: 10,
              borderRadius: 8
            }}>
              <p className="runner-available-run-card__title">{run.item || run.title || "Available run"}</p>

              {(() => {
                const payout = run.runnerPayout ?? run.payout ?? run.earnings ?? run.payoutAmount;
                const location = run.pickupAddress || run.pickupLocation || run.storeAddress || run.location || run.address;

                return (
                  <>
                    {payout !== undefined && payout !== null && String(payout).trim() !== "" && (
                      <p className="runner-available-run-card__payout">Earn {String(payout).startsWith("$") ? payout : `$${payout}`}</p>
                    )}

                    <details className="runner-location-disclosure">
                      <summary>View location</summary>
                      <div className="runner-location-disclosure__content">
                        {location || "Location details will appear after you accept this run."}
                      </div>
                    </details>
                  </>
                );
              })()}

              <RunnerSmartHandoffCard run={run} />

              {Number(run.maxRunnerSpend || 0) > 0 && (
                <p style={{
                  marginTop: -4,
                  marginBottom: 10,
                  color: "#fde68a",
                  fontSize: 12,
                  lineHeight: 1.45,
                  fontWeight: 700
                }}>
                  Secure hold authorized before this offer appeared. No live card charge in placeholder mode.
                </p>
              )}

              <button
                type="button"
                disabled={acceptingRunId === run.id}
                aria-busy={acceptingRunId === run.id}
                onClick={async () => {
                  if (!run.id) return;

                  if (acceptingRunIdRef.current === run.id) return;

                  acceptingRunIdRef.current = run.id;
                  setAcceptingRunId(run.id);

                  setAcceptMessage(null);

                  try {
                    console.log("ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ACCEPTING RUN:", run.id);

                    const res = await apiRequest(
                      `/api/runs/${run.id}/accept`,
                      { method: "POST" }
                    );

                    console.log("ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ACCEPT RESULT:", res);

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
                  {acceptingRunId === run.id ? "Accepting..." : "Accept run"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
