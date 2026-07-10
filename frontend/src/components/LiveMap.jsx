import "./runner/RunnerCommandCenter.css";
// RUN-UI-1G-CHECKPOINT-3: LiveMap fallback visual shell only.
const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const googleMapsExplicitlyEnabled =
  import.meta.env.VITE_ENABLE_GOOGLE_MAPS === "true";

function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function getRunLike(props) {
  return props.run || props.activeRun || props.selectedRun || {};
}

function getLocationLabel(props) {
  const run = getRunLike(props);

  return pickFirst(
    props.location,
    props.address,
    props.destination,
    props.pickupLocation,
    props.dropoffLocation,
    run.location,
    run.address,
    run.destination,
    "Location pending"
  );
}

function getCoordinateLabel(props) {
  const run = getRunLike(props);

  const lat = pickFirst(
    props.lat,
    props.latitude,
    props.runnerLat,
    props.pickupLat,
    props.coords?.lat,
    props.position?.lat,
    props.runnerLocation?.lat,
    run.lat,
    run.latitude,
    run.runnerLat
  );

  const lng = pickFirst(
    props.lng,
    props.longitude,
    props.runnerLng,
    props.pickupLng,
    props.coords?.lng,
    props.position?.lng,
    props.runnerLocation?.lng,
    run.lng,
    run.longitude,
    run.runnerLng
  );

  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return "Coordinates unavailable";
  }

  return `${lat}, ${lng}`;
}

export default function LiveMap(props = {}) {
  const locationLabel = getLocationLabel(props);
  const coordinateLabel = getCoordinateLabel(props);

  const mapStatus =
    googleMapsExplicitlyEnabled && googleMapsKey
      ? "Map provider configured"
      : "Map preview";

  return (
    <section
      aria-label="Run location map fallback"
      style={{
        minHeight: "320px",
        width: "100%",
        background:
          "linear-gradient(135deg, #eef3ff 0%, #f8fafc 45%, #e5e7eb 100%)",
        color: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
      }}
    >
      <div className="run-live-map-fallback"
        style={{
          width: "min(640px, 100%)",
          background: "rgba(255, 255, 255, 0.9)",
          border: "1px solid rgba(15, 23, 42, 0.12)",
          borderRadius: "22px",
          boxShadow: "0 18px 55px rgba(15, 23, 42, 0.12)",
          padding: "22px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "999px",
            padding: "7px 12px",
            background: "#e0f2fe",
            color: "#075985",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          {mapStatus}
        </div>

        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "24px",
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
          }}
        >
          {locationLabel}
        </h2>

        <p className="run-live-map-fallback__body"
          style={{
            margin: "0 0 16px",
            color: "#475569",
            fontSize: "14px",
            lineHeight: 1.55,
          }}
        >
          Live Google Maps is paused until the production browser key is verified
          for this domain. The run workflow remains available.
        </p>

        <div
          style={{
            display: "grid",
            gap: "10px",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(15, 23, 42, 0.1)",
              borderRadius: "16px",
              padding: "14px",
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: "12px",
                fontWeight: 800,
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              Status
            </div>
            <div className="run-live-map-fallback__metric-value" style={{ fontWeight: 800 }}>Map fallback active</div>
          </div>

          <div
            style={{
              border: "1px solid rgba(15, 23, 42, 0.1)",
              borderRadius: "16px",
              padding: "14px",
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: "12px",
                fontWeight: 800,
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              Coordinates
            </div>
            <div style={{ fontWeight: 800 }}>{coordinateLabel}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
