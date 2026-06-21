import { useEffect, useRef, useState } from "react";
import {
    GoogleMap,
    Marker,
    DirectionsRenderer,
    useJsApiLoader,
} from "@react-google-maps/api";
import { io } from "socket.io-client";

const socket = io("http://localhost:5050", {
    transports: ["websocket"],
});

const containerStyle = {
    width: "100%",
    height: "100%",
};

export default function LiveMap({ run }) {
    const [runnerLocation, setRunnerLocation] = useState(null);
    const [directions, setDirections] = useState(null);
    const [eta, setEta] = useState(null);

    const mapRef = useRef(null);

    ////////////////////////////////////////////////////////
    // LOAD GOOGLE MAPS (FIXED KEY)
    ////////////////////////////////////////////////////////
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    });

    ////////////////////////////////////////////////////////
    // DEBUG KEY (REMOVE LATER)
    ////////////////////////////////////////////////////////
    useEffect(() => {
        console.log("MAP KEY:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
    }, []);

    ////////////////////////////////////////////////////////
    // JOIN RUN ROOM
    ////////////////////////////////////////////////////////
    useEffect(() => {
        if (!run?.id) return;

        socket.emit("join.run", run.id);
        console.log("👀 Joined run room:", run.id);
    }, [run?.id]);

    ////////////////////////////////////////////////////////
    // LIVE LOCATION
    ////////////////////////////////////////////////////////
    useEffect(() => {
        const handler = (data) => {
            if (!data?.lat || !data?.lng) return;

            const coords = { lat: data.lat, lng: data.lng };

            setRunnerLocation(coords);

            if (mapRef.current) {
                mapRef.current.panTo(coords);
            }

            // 🔥 Calculate route
            if (run?.lat && run?.lng) {
                calculateRoute(coords, {
                    lat: run.lat,
                    lng: run.lng,
                });
            }
        };

        socket.on("runner.location", handler);

        return () => socket.off("runner.location", handler);
    }, [run]);

    ////////////////////////////////////////////////////////
    // ROUTE CALCULATION
    ////////////////////////////////////////////////////////
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

                    const leg = result.routes[0].legs[0];
                    setEta(leg.duration.text);
                } else {
                    console.warn("Route error:", status);
                }
            }
        );
    };

    ////////////////////////////////////////////////////////
    // SAFE RENDER STATES
    ////////////////////////////////////////////////////////
    if (loadError) {
        return <div style={{ padding: 20 }}>❌ Map failed to load</div>;
    }

    if (!isLoaded) {
        return <div style={{ padding: 20 }}>Loading map...</div>;
    }

    ////////////////////////////////////////////////////////
    // UI
    ////////////////////////////////////////////////////////
    return (
        <div style={{ height: "100%", position: "relative" }}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={runnerLocation || { lat: 41.8781, lng: -87.6298 }}
                zoom={14}
                onLoad={(map) => (mapRef.current = map)}
            >
                {/* Runner */}
                {runnerLocation && <Marker position={runnerLocation} />}

                {/* Destination */}
                {run?.lat && run?.lng && (
                    <Marker position={{ lat: run.lat, lng: run.lng }} />
                )}

                {/* Route */}
                {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>

            {/* ETA */}
            {eta && (
                <div
                    style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        background: "#000",
                        padding: "6px 10px",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 14,
                    }}
                >
                    🚗 ETA: {eta}
                </div>
            )}
        </div>
    );
}