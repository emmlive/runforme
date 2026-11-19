import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../lib/googleMapsLoader.js";
import "./runner/RunnerCommandCenter.css";

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

function getRawCoordinates(props) {
  const run = getRunLike(props);

  return {
    lat: pickFirst(
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
    ),
    lng: pickFirst(
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
    ),
  };
}

function getMapCoordinates(props) {
  const raw = getRawCoordinates(props);
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
  ) {
    return null;
  }

  return { lat, lng };
}

function getCoordinateLabel(props) {
  const coordinates = getMapCoordinates(props);

  if (!coordinates) {
    return "Coordinates unavailable";
  }

  return `${coordinates.lat}, ${coordinates.lng}`;
}

export default function LiveMap(props = {}) {
  const locationStatus = props.locationStatus || "idle";
  const locationLabel = getLocationLabel(props);
  const coordinateLabel = getCoordinateLabel(props);
  const coordinates = getMapCoordinates(props);
  const mapElementRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const providerConfigured =
    googleMapsExplicitlyEnabled && googleMapsKey;

  useEffect(() => {
    if (!googleMapsExplicitlyEnabled || !googleMapsKey || !coordinates) {
      setMapReady(false);
      return;
    }

    let cancelled = false;

    setMapReady(false);

    loadGoogleMaps({ apiKey: googleMapsKey })
      .then((maps) => {
        if (cancelled || !mapElementRef.current) return;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapElementRef.current, {
            center: coordinates,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        } else {
          mapInstanceRef.current.setCenter(coordinates);
        }

        if (!markerRef.current) {
          markerRef.current = new maps.Marker({
            map: mapInstanceRef.current,
            position: coordinates,
            title: locationLabel,
          });
        } else {
          markerRef.current.setPosition(coordinates);
          markerRef.current.setTitle(locationLabel);
        }

        if (!cancelled) {
          setMapReady(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;

        console.error("Google Maps initialization failed:", err);
        setMapReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coordinates?.lat, coordinates?.lng, locationLabel]);

  const mapStatus = !providerConfigured
    ? "Map preview"
    : locationStatus === "denied"
      ? "Location blocked"
      : locationStatus === "acquiring"
        ? "Locating"
        : locationStatus === "unavailable" ||
            locationStatus === "timeout" ||
            locationStatus === "failed"
          ? "Location unavailable"
          : "Map provider configured";

  const locationReady = locationStatus === "ready" && coordinates;

  let fallbackBody;

  if (!providerConfigured) {
    fallbackBody =
      "Live Google Maps is paused until the production browser key is verified for this domain. The run workflow remains available.";
  } else if (locationStatus === "acquiring") {
    fallbackBody =
      "Getting your live location. Keep location access enabled while this active run is in progress.";
  } else if (locationStatus === "denied") {
    fallbackBody =
      "Allow location access in your browser or device settings to show your live position for this active run.";
  } else if (locationStatus === "unavailable") {
    fallbackBody =
      "Your device could not provide a live location. The run workflow remains available while location is unavailable.";
  } else if (locationStatus === "timeout") {
    fallbackBody =
      "Live location timed out. Keep location services enabled and the app open so RUNFORME can try again.";
  } else if (locationStatus === "failed") {
    fallbackBody =
      "RUNFORME could not start live location. The run workflow remains available.";
  } else if (locationReady) {
    fallbackBody =
      "Loading live Google Maps. The run workflow remains available if the map provider cannot load.";
  } else {
    fallbackBody =
      "Live Google Maps will appear when an active run starts and a valid location is available.";
  }

  return (
    <section
      aria-label="Run location map"
      style={{
        minHeight: "320px",
        width: "100%",
        background:
          "linear-gradient(135deg, #eef3ff 0%, #f8fafc 45%, #e5e7eb 100%)",
        color: "#0f172a",
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
      }}
    >
      <div
        ref={mapElementRef}
        className="run-live-google-map"
        aria-label={mapReady ? `Google Map for ${locationLabel}` : undefined}
        style={{
          position: "absolute",
          inset: 0,
          minHeight: "320px",
          opacity: mapReady ? 1 : 0,
          pointerEvents: mapReady ? "auto" : "none",
          transition: "opacity 180ms ease",
        }}
      />

      {!mapReady && (
        <div
          style={{
            minHeight: "320px",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <div
            className="run-live-map-fallback"
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

            <p
              className="run-live-map-fallback__body"
              style={{
                margin: "0 0 16px",
                color: "#475569",
                fontSize: "14px",
                lineHeight: 1.55,
              }}
            >
              {fallbackBody}
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
                <div
                  className="run-live-map-fallback__metric-value"
                  style={{ fontWeight: 800 }}
                >
                  Map fallback active
                </div>
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
        </div>
      )}
    </section>
  );
}
