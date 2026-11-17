# RUN-MAPS-1A Google Maps Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a real Google Maps view in the Runner experience when production configuration and coordinates are available, while preserving the existing fail-closed fallback.

**Architecture:** `LiveMap.jsx` remains the public map component. A focused loader module owns one-time Google Maps JavaScript API loading and returns a promise. The component mounts the provider only when explicitly enabled, keyed, and given valid coordinates; otherwise it retains the current fallback shell.

**Tech Stack:** React, Vite, Google Maps JavaScript API, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-16-run-maps-1a-google-maps-production-design.md`

## Global Constraints

- No backend or Prisma changes.
- No payment or payout behavior changes.
- No new React map dependency.
- Browser key must come only from `VITE_GOOGLE_MAPS_API_KEY`.
- Provider activation requires `VITE_ENABLE_GOOGLE_MAPS === "true"`.
- Existing fallback remains the fail-closed state.
- No production Render variable change until source/test validation passes.
- Use only coordinates already supplied to `LiveMap`.

## Review Focus

- Missing or malformed coordinates must never attempt provider initialization.
- Missing key or disabled flag must never inject the Google Maps script.
- Script load failure must return to a readable fallback, not a blank map.
- Multiple mounts must reuse one provider load rather than inject duplicate scripts.
- Unmounting before provider resolution must not mutate an unmounted component.

---

### Task 1: Google Maps loader boundary

**Files:**
- Create: `frontend/src/lib/googleMapsLoader.js`
- Create: `frontend/src/google-maps-loader-contract.test.js`

**Interfaces:**
- Produces: `loadGoogleMaps({ apiKey }) -> Promise<google.maps>`
- Later tasks consume this loader from `LiveMap.jsx`.

- [ ] **Step 1: Write failing loader contract tests**
  - Asserts a missing key rejects before script insertion.
  - Asserts one script URL uses the provided key and async loading.
  - Asserts repeated calls share the same in-flight load.
  - Asserts load error rejects cleanly.

- [ ] **Step 2: Run loader test**
  - Run: `cd frontend && node --test src/google-maps-loader-contract.test.js`
  - Expected: FAIL because loader does not yet exist.

- [ ] **Step 3: Implement `loadGoogleMaps({ apiKey })`**
  - Use the official Maps JavaScript API script URL.
  - Keep a module-scoped promise for one-time loading.
  - Resolve only when `window.google.maps` is available.
  - Reject on missing key or script error.

- [ ] **Step 4: Run loader test**
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Commit message: `Add guarded Google Maps browser loader`

### Task 2: Real map rendering with fail-closed fallback

**Files:**
- Modify: `frontend/src/components/LiveMap.jsx`
- Create: `frontend/src/live-map-google-provider-contract.test.js`

**Interfaces:**
- Consumes: `loadGoogleMaps({ apiKey })`.
- Preserves: existing `LiveMap(props)` call surface.

- [ ] **Step 1: Write failing LiveMap provider contract tests**
  - Config disabled -> fallback remains.
  - Key missing -> fallback remains.
  - Coordinates missing -> fallback remains.
  - Enabled + keyed + valid coordinates -> component includes a dedicated map mount.
  - Provider failure state retains fallback copy.
  - No raw API key is rendered in markup.

- [ ] **Step 2: Run LiveMap contract test**
  - Run: `cd frontend && node --test src/live-map-google-provider-contract.test.js`
  - Expected: FAIL because real provider path does not exist.

- [ ] **Step 3: Implement guarded provider path in `LiveMap.jsx`**
  - Parse supplied lat/lng as finite numbers within valid geographic ranges.
  - Use React refs/effect to load provider and create `google.maps.Map`.
  - Add one marker at the supplied coordinate.
  - Keep fallback visible until provider initialization succeeds.
  - On loader failure, remain in fallback state.
  - Cleanup must prevent post-unmount state writes.

- [ ] **Step 4: Run focused map tests**
  - Run: `cd frontend && node --test src/google-maps-loader-contract.test.js src/live-map-google-provider-contract.test.js`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Commit message: `Render guarded Google Maps runner view`

### Task 3: Regression verification

**Files:**
- No product changes unless tests expose a defect.

**Interfaces:**
- Verifies existing runner/dashboard behavior remains unchanged outside map rendering.

- [ ] **Step 1: Run targeted runner/map suite**
  - Run: `cd frontend && node --test src/google-maps-loader-contract.test.js src/live-map-google-provider-contract.test.js src/runner-responsive.test.js src/runner-online-live-copy-contract.test.js`
  - Expected: all PASS.

- [ ] **Step 2: Run full frontend suite**
  - Run: `cd frontend && node --test`
  - Expected: all PASS.

- [ ] **Step 3: Compare branch to main**
  - Confirm only planned frontend map files/tests/docs changed and branch is 0 behind.

### Task 4: Production configuration gate

**Files:**
- No source changes.

**Interfaces:**
- Consumes built frontend behavior from Tasks 1-3.

- [ ] **Step 1: Confirm Google Cloud browser-key restrictions**
  - Allowed referrer must include `https://runforme-frontend.onrender.com/*` and any approved RUNFORME custom domain before activation.
  - Maps JavaScript API must be enabled for the key's project.

- [ ] **Step 2: Configure Render frontend variables without exposing values**
  - `VITE_GOOGLE_MAPS_API_KEY=<browser-restricted-key>`
  - `VITE_ENABLE_GOOGLE_MAPS=true`
  - Trigger a frontend rebuild/deploy because Vite variables are build-time inputs.

- [ ] **Step 3: Verify exact deployment commit**
  - Confirm Render static-site deploy is live on the merged commit.

- [ ] **Step 4: Production browser smoke**
  - Runner Home with valid coordinate renders Google Map.
  - Missing-coordinate state still renders fallback.
  - No console/provider authorization error.
  - Runner workflow remains usable.

- [ ] **Step 5: Close RUN-MAPS-1A only after production smoke passes**
