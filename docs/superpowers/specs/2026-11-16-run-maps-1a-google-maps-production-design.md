# RUN-MAPS-1A Google Maps Production Design

**Intent:** Replace the current Runner fallback-only map with a real in-app Google Maps view when production configuration is enabled and a browser-restricted API key is available.

**Why:** RUNFORME's runner experience already exposes location state, but production currently stops at a fallback card. The NIU pilot needs a real in-app map foundation that can later support pickup/dropoff markers and runner movement without changing the current run/payment contracts.

**Goals**
- Render Google Maps in-app when `VITE_ENABLE_GOOGLE_MAPS === "true"` and `VITE_GOOGLE_MAPS_API_KEY` is present.
- Keep the existing fallback card as the fail-closed state when configuration, SDK loading, or coordinates are unavailable.
- Use only coordinates already supplied to `LiveMap`; no new backend, database, or geolocation persistence.
- Keep the browser key in Render/Vite configuration, never hard-code it in source.
- Add regression tests for configured, disabled, missing-key, missing-coordinate, and SDK-load-failure states.

**Non-goals**
- No route optimization, directions, ETA, traffic, geocoding, or Places API.
- No backend or Prisma changes.
- No payment/payout changes.
- No requester map redesign in this milestone.
- No production key mutation until source tests pass and the allowed browser origins are confirmed.

## Approaches Considered

1. **Google Maps JavaScript API — selected.** Gives RUNFORME a real in-app map and a future path to live runner/pickup/dropoff markers while preserving the existing component boundary.
2. **Google Maps embed/iframe.** Simpler, but too limited for future marker and live-location behavior.
3. **External Google Maps link only.** Minimal risk, but does not satisfy the in-app map experience.

## Selected Architecture

Keep `LiveMap.jsx` as the public component. Move provider loading into a small focused helper so the SDK is loaded once, can fail closed, and is testable without restructuring the dashboard. `LiveMap` renders the existing fallback unless both configuration and usable coordinates are present. When ready, it mounts the Google map and a single marker at the supplied coordinate.

No new third-party React map package is required; use the official Google Maps JavaScript browser API directly to minimize dependencies and preserve the current Vite build.
