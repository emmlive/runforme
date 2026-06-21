import { useEffect, useRef, useState } from "react";
import { apiRequest } from "./api/client";
import { socket } from "./lib/socket"; // ✅ shared socket (FIX)
import LiveMap from "./components/LiveMap";

export default function RunnerDashboard({ user, onLogout }) {
  const [online, setOnline] = useState(false);
  const [runs, setRuns] = useState([]);
  const [statusMessage, setStatusMessage] = useState("Offline");

  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);

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

    socket.on("run.offer", handleRunOffer);
    socket.on("run.updated", handleRunUpdated);

    return () => {
      socket.off("run.offer", handleRunOffer);
      socket.off("run.updated", handleRunUpdated);
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
    const res = await apiRequest(`/api/runs/${id}/arrived`, {
      method: "POST",
    });

    if (res.success) {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "arrived" } : r
        )
      );
    }
  }

  async function markComplete(id) {
    const res = await apiRequest(`/api/runs/${id}/complete`, {
      method: "POST",
    });

    if (res.success) {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "completed" } : r
        )
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

          {activeRun.status === "assigned" && (
            <button onClick={() => markArrived(activeRun.id)}>
              Arrived
            </button>
          )}

          {activeRun.status === "arrived" && (
            <button onClick={() => markComplete(activeRun.id)}>
              Complete
            </button>
          )}
        </div>
      )}

      {/* =========================
        AVAILABLE RUNS (BOTTOM SHEET)
    ========================= */}
      {!activeRun && (
        <div style={{
          padding: 16,
          borderTop: "1px solid #222",
          background: "#111"
        }}>
          <h4>Available Runs</h4>

          {availableRuns.length === 0 && (
            <p style={{ opacity: 0.6 }}>Waiting for jobs...</p>
          )}

          {availableRuns.slice(0, 3).map((run) => (
            <div key={run.id} style={{
              border: "1px solid #333",
              padding: 12,
              marginBottom: 10,
              borderRadius: 8
            }}>
              <p>{run.item}</p>

              <button
                onClick={async () => {
                  if (!run.id) return;

                  console.log("✅ ACCEPTING RUN:", run.id);

                  const res = await apiRequest(
                    `/api/runs/${run.id}/accept`,
                    { method: "POST" }
                  );

                  console.log("✅ ACCEPT RESULT:", res);

                  if (res.success) {
                    setRuns((prev) =>
                      prev.map((r) =>
                        r.id === run.id
                          ? { ...r, status: "assigned" }
                          : r
                      )
                    );
                  }
                }}
                style={{
                  background: "#f59e0b",
                  color: "#000",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 6
                }}
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
