import { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import { socket } from "../lib/socket";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 41.8781,
  lng: -87.6298,
};

function LocalMapPlaceholder({ run }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 360,
        background: "linear-gradient(135deg, #111827, #1f2937)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        textAlign: "center",
        borderBottom: "1px solid #222",
      }}
    >
      <div>
        <div style={{ fontSize: 13, letterSpacing: 2, marginBottom: 12, opacity: 0.8 }}>MAP PREVIEW</div>
        <strong>Local Map Preview</strong>
        <p style={{ opacity: 0.75, marginTop: 8, marginBottom: 0 }}>
          Google Maps is disabled for local development.
        </p>
        {run?.location && (
          <p style={{ opacity: 0.9, marginTop: 12 }}>
            Current run: {run.location}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleLiveMap({ run, googleMapsApiKey }) {
  const [runnerLocation, setRunnerLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [eta, setEta] = useState(null);

  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
  });

  useEffect(() => {
    if (!run?.id) return;

    socket.emit("join.run", run.id);
    console.log("Joined run room:", run.id);
  }, [run?.id]);

  useEffect(() => {
    if (!isLoaded) return;

    const calculateRoute = (origin, destination) => {
      if (!window.google) return;

      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK") {
            setDirections(result);

            const leg = result.routes?.[0]?.legs?.[0];
            setEta(leg?.duration?.text || null);
          } else {
            console.warn("Route error:", status);
          }
        }
      );
    };

    const handler = (data) => {
      if (!data?.lat || !data?.lng) return;

      const coords = { lat: data.lat, lng: data.lng };
      setRunnerLocation(coords);

      if (mapRef.current) {
        mapRef.current.panTo(coords);
      }

      if (run?.lat && run?.lng) {
        calculateRoute(coords, {
          lat: run.lat,
          lng: run.lng,
        });
      }
    };

    socket.on("runner.location", handler);

    return () => socket.off("runner.location", handler);
  }, [isLoaded, run]);

  if (loadError) {
    return <LocalMapPlaceholder run={run} />;
  }

  if (!isLoaded) {
    return (
      <div style={{ padding: 20, color: "white", background: "#111" }}>
        Loading map...
      </div>
    );
  }

  const center = runnerLocation || defaultCenter;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {runnerLocation && <Marker position={runnerLocation} />}
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>

      {eta && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background: "white",
            padding: "8px 12px",
            borderRadius: 8,
            fontWeight: 700,
          }}
        >
          ETA: {eta}
        </div>
      )}
    </div>
  );
}

export default function LiveMap({ run }) {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasRealGoogleMapsKey =
    Boolean(googleMapsApiKey) &&
    !googleMapsApiKey.toLowerCase().includes("dummy") &&
    !googleMapsApiKey.toLowerCase().includes("placeholder");

  if (!hasRealGoogleMapsKey) {
    return <LocalMapPlaceholder run={run} />;
  }

  return <GoogleLiveMap run={run} googleMapsApiKey={googleMapsApiKey} />;
}
