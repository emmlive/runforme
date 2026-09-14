import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// RUN-UI-1N-B1-TASK-4
// Runner responsive hardening contract test. RunnerDashboard owns all of
// its own state internally (online, runs, mobileSection, ...) with no
// props to drive it into a populated/active/available state and no
// interaction simulation available (no @testing-library present, and
// renderToStaticMarkup does not run effects). The only Runner render
// state reachable through static SSR is therefore its default initial
// state: offline, still loading the run queue, no active or available
// runs, mobileSection "home". That default state is exactly where the
// audited "loading vs. offline vs. genuine empty queue" ambiguity lives,
// so it is asserted directly. Everything else required by the approved
// plan/audit (bounded/centered wide composition, status-pill wrapping,
// focus-visible coverage, long-content wrapping) is asserted against the
// active CSS import graph — both the external RunnerCommandCenter.css
// file and the component's own embedded <style> block, which (unlike
// state-dependent markup) always renders in full regardless of state.
// Representative widths: 360, 390, 430, 768, 1024, 1440 CSS px; 390 x 844
// remains the protected mobile baseline via the frozen R7B contract.

const REPRESENTATIVE_WIDTHS = [360, 390, 430, 768, 1024, 1440];
const RUNNER_BOUNDED_FRAME = 1120;

function extractCssText(transformedCode) {
  const match = transformedCode.match(
    /const __vite__css = "([\s\S]*)"\r?\n__vite__updateStyle/
  );
  assert.ok(match, "expected a Vite-transformed CSS module literal");
  return JSON.parse('"' + match[1] + '"');
}

function evalBoundedFrame(frameMaxPx, widthPx) {
  return Math.min(widthPx, frameMaxPx);
}

test("Runner responsive hardening", async (t) => {
  const vite = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
  });

  let socket;

  t.after(async () => {
    try {
      socket?.disconnect();
    } finally {
      await vite.close();
    }
  });

  const commandCenterCssResult = await vite.transformRequest(
    "/src/components/runner/RunnerCommandCenter.css"
  );
  const commandCenterCss = extractCssText(commandCenterCssResult.code);

  ({ socket } = await vite.ssrLoadModule("/src/lib/socket.js"));
  const { default: RunnerDashboard } = await vite.ssrLoadModule(
    "/src/RunnerDashboard.jsx"
  );
  const markup = renderToStaticMarkup(
    React.createElement(RunnerDashboard, {
      user: { id: 2, role: "runner" },
      onLogout() {},
    })
  );

  await t.test("default (offline) state: online toggle exposes aria-pressed", () => {
    assert.match(
      markup,
      /aria-pressed="false"[^>]*>\s*Offline\s*</,
      "the online/offline toggle must expose aria-pressed reflecting the existing online state"
    );
  });

  await t.test(
    "default (offline, still loading) state: offline takes priority over the generic waiting-for-jobs copy",
    () => {
      assert.doesNotMatch(
        markup,
        /Waiting for jobs\.\.\./,
        "offline and still-loading must not be presented as a genuine empty queue"
      );
      assert.match(
        markup,
        /offline/i,
        "the available-runs surface must explicitly communicate the offline state"
      );
    }
  );

  await t.test(
    "mobileSection defaults to home: no section sheet renders for the initial destination",
    () => {
      assert.doesNotMatch(
        markup,
        /<section class="runner-mobile-section-sheet"/,
        "the placeholder section sheet element must not render for the default Home destination"
      );
      assert.match(
        markup,
        /aria-label="Runner navigation"/,
        "runner bottom navigation must still render"
      );
    }
  );

  await t.test(
    "R7B contract remains byte-identical: mobile shell height/min-height/safe-area clearance",
    () => {
      assert.match(
        markup,
        /@media \(max-width: 560px\)[\s\S]*?\.runner-dashboard-shell\s*\{[\s\S]*?height:\s*auto\s*!important;/,
        "mobile CSS must still override the inline 100vh height so active content can grow"
      );
      assert.match(
        markup,
        /\.runner-dashboard-shell\s*\{[\s\S]*?min-height:\s*100vh;/,
        "mobile shell must retain a viewport-height floor"
      );
      assert.match(
        markup,
        /\.runner-dashboard-shell\s*\{[\s\S]*?padding-bottom:\s*calc\(82px \+ env\(safe-area-inset-bottom\)\);/,
        "mobile shell must reserve fixed-nav clearance plus the bottom safe area"
      );
    }
  );

  await t.test(
    "shared shell CSS: unconditional focus-visible treatment for the online toggle and sign-out control",
    () => {
      assert.match(
        markup,
        /:focus-visible\s*\{[\s\S]*?outline/,
        "the embedded shell stylesheet must define at least one unconditional :focus-visible rule"
      );
      assert.doesNotMatch(
        markup,
        /@media \(max-width: 560px\)\s*\{[\s\S]*?:focus-visible/,
        "shared focus-visible treatment must not be limited to a narrow device branch"
      );
    }
  );

  await t.test(
    "shared shell CSS: unconditional long-content wrapping for active/available text",
    () => {
      const styleMatch = markup.match(/<style>([\s\S]*?)<\/style>/);
      assert.ok(styleMatch, "expected the embedded shell stylesheet");
      const [beforeMedia] = styleMatch[1].split(/@media \(max-width: 560px\)/);
      assert.match(
        beforeMedia,
        /\.runner-active-panel p,[\s\S]*?overflow-wrap:\s*anywhere/,
        "a fluid long-content wrap rule for active/available text must exist outside the narrow device branch"
      );
    }
  );

  await t.test(
    "wide-branch status pill wraps predictably instead of single-line ellipsis truncation",
    () => {
      const pillMatch = commandCenterCss.match(
        /\.runner-status-summary__pill,\s*\n?\s*\.runner-run-card__status\s*\{([^}]*)\}/
      );
      assert.ok(pillMatch, "expected the shared status pill rule");
      assert.doesNotMatch(
        pillMatch[1],
        /white-space:\s*nowrap/,
        "status pill text must not be forced to a single line"
      );
    }
  );

  // RUN-UI-1N TASK 7 - CHECKPOINT 2C (P2 Finding 2)
  // The status pill (e.g. "Offline") sits in a flex header alongside the
  // title/subtitle text with no flex-shrink protection, so at some widths
  // it gets compressed and the existing overflow-wrap: anywhere rule (kept
  // above, for long status values) breaks short words mid-word instead
  // ("Offli" / "ne"). flex-shrink: 0 - not white-space: nowrap, which the
  // test above requires absent - keeps the pill at its natural width.
  await t.test(
    "runner status pills do not shrink into mid-word wrapping",
    () => {
      const pillMatch = commandCenterCss.match(
        /\.runner-status-summary__pill,\s*\n?\s*\.runner-run-card__status\s*\{([^}]*)\}/
      );
      assert.ok(pillMatch, "expected the shared status pill rule");
      assert.match(
        pillMatch[1],
        /flex-shrink:\s*0/,
        "status pills must declare flex-shrink: 0 so a short value like \"Offline\" is " +
          "never compressed and broken mid-word by the sibling overflow-wrap: anywhere rule"
      );
    }
  );

  // RUN-UI-1N TASK 7 - CHECKPOINT 2E-R1 (P2 Finding 3, scope-corrected)
  // Only the two overflow:hidden card/panel rules are in scope for this
  // defect: [class*='run-card'] / [class*='status-summary'] also match
  // nested descendants (e.g. .runner-run-card__meta, .runner-status-summary__pill)
  // there, unintentionally clipping them. The same substrings recur in
  // unrelated sibling rules (::before, > *, h3/strong, p) elsewhere in this
  // file, which are out of scope and must not be forced to change by this
  // test. Rules are located structurally (selector group immediately
  // followed by a body opening with `position: relative; overflow: hidden;`),
  // not by line number.
  await t.test(
    "runner command center overflow clipping targets outer containers only",
    () => {
      const overflowHiddenGroups = [
        ...commandCenterCss.matchAll(
          /([^{}]+)\{\s*position:\s*relative;\s*overflow:\s*hidden;[^}]*\}/g
        ),
      ].map((match) => match[1]);

      const focusedRunGroup = overflowHiddenGroups.find((selectors) =>
        selectors.includes("focused-run-section")
      );
      assert.ok(
        focusedRunGroup,
        "expected an overflow:hidden rule for the focused-run card"
      );
      assert.match(
        focusedRunGroup,
        /\.runner-command-center__focused-run-section \.runner-run-card\b/,
        "the focused-run overflow:hidden rule must target the explicit .runner-run-card outer container"
      );
      assert.doesNotMatch(
        focusedRunGroup,
        /\[class\*=['"]run-card['"]\]/,
        "the focused-run overflow:hidden rule must not also use a substring selector that clips nested run-card descendants"
      );

      const statusSummaryGroup = overflowHiddenGroups.find((selectors) =>
        selectors.includes("action-status-panel")
      );
      assert.ok(
        statusSummaryGroup,
        "expected an overflow:hidden rule for the action-status panel"
      );
      assert.match(
        statusSummaryGroup,
        /\.runner-command-center__action-status-panel \.runner-status-summary\b/,
        "the action-status overflow:hidden rule must target the explicit .runner-status-summary outer container"
      );
      assert.doesNotMatch(
        statusSummaryGroup,
        /\[class\*=['"]status-summary['"]\]/,
        "the action-status overflow:hidden rule must not also use a substring selector that clips nested status-summary descendants"
      );
    }
  );

  await t.test(
    "desktop: available-run and active-run surfaces use a bounded, centered composition instead of stretching edge to edge",
    () => {
      for (const selector of [".runner-available-runs-panel", ".runner-active-panel"]) {
        const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(
          `${escaped}[^{]*\\{[^}]*width:\\s*min\\(100%,\\s*${RUNNER_BOUNDED_FRAME}px\\)`
        );
        assert.match(
          commandCenterCss,
          re,
          `expected ${selector} to use the existing min(100%, ${RUNNER_BOUNDED_FRAME}px) bounded-frame precedent`
        );
      }

      for (const width of REPRESENTATIVE_WIDTHS) {
        const frameWidth = evalBoundedFrame(RUNNER_BOUNDED_FRAME, width);
        assert.ok(
          frameWidth <= width,
          `bounded composition at ${width}px must never exceed the viewport`
        );
      }
    }
  );

  await t.test(
    "available-run and location-disclosure controls define an explicit focus-visible outline",
    () => {
      assert.match(
        commandCenterCss,
        /\.runner-location-disclosure summary:focus-visible\s*\{[^}]*outline/,
        "the location disclosure summary must define a visible focus outline"
      );
    }
  );
});
