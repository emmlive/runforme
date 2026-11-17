let googleMapsPromise = null;

export function loadGoogleMaps({ apiKey } = {}) {
  const key = String(apiKey || "").trim();

  if (!key) {
    return Promise.reject(new Error("Google Maps API key is required"));
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Google Maps requires a browser environment"));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async`;

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }

      googleMapsPromise = null;
      reject(new Error("Google Maps failed to load"));
    };

    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error("Google Maps failed to load"));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
