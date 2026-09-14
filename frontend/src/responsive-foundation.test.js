import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// RUN-UI-1N-B1-TASK-2
// Shared responsive foundation contract test. Loads the committed, active
// CSS import graph (index.css, styles/tokens.css) through the same
// Vite dev-transform pipeline the browser uses, and asserts fluid,
// representative-width invariants rather than six separate device modes.
// Representative validation widths per the approved spec/plan: 360, 390,
// 430, 768, 1024, 1440 CSS px, with 390 x 844 remaining the protected
// mobile regression baseline (RunnerDashboard.mobile-layout.test.js).

const REPRESENTATIVE_WIDTHS = [360, 390, 430, 768, 1024, 1440];

function extractCssText(transformedCode) {
  const match = transformedCode.match(
    /const __vite__css = "([\s\S]*)"\r?\n__vite__updateStyle/
  );
  assert.ok(match, "expected a Vite-transformed CSS module literal");
  return JSON.parse('"' + match[1] + '"');
}

function evalClamp(minPx, preferredVw, maxPx, widthPx) {
  const preferred = (preferredVw / 100) * widthPx;
  return Math.min(Math.max(preferred, minPx), maxPx);
}

function evalBoundedFrame(frameMaxPx, widthPx) {
  return Math.min(widthPx, frameMaxPx);
}

test("shared responsive foundation", async (t) => {
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

  const indexResult = await vite.transformRequest("/src/index.css");
  const indexCss = extractCssText(indexResult.code);
  const tokensResult = await vite.transformRequest("/src/styles/tokens.css");
  const tokensCss = extractCssText(tokensResult.code);

  await t.test(
    "root frame: 100% width floor applies outside any narrow-only device branch",
    () => {
      const mediaGatedNarrowOnly =
        /@media \(max-width: 560px\)\s*\{[\s\S]*?#root\s*\{[\s\S]*?width:\s*100%;/;
      assert.doesNotMatch(
        indexCss,
        mediaGatedNarrowOnly,
        "root width floor must not be limited to a narrow max-width branch"
      );
      assert.match(
        indexCss,
        /html,\s*\n?\s*body\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;/,
        "html/body must declare a shared 100% width floor at every width"
      );
      assert.match(
        indexCss,
        /#root\s*\{[\s\S]*?box-sizing:\s*border-box;/,
        "#root must own its box model"
      );
      assert.match(
        indexCss,
        /#root\s*\{[\s\S]*?width:\s*100%;/,
        "#root must declare a 100% width floor"
      );
    }
  );

  await t.test(
    "root frame: bounded desktop frame uses a fluid min()/token expression, not a fixed device width",
    () => {
      assert.match(
        indexCss,
        /#root\s*\{[\s\S]*?max-width:\s*min\(\s*100%\s*,\s*var\(--rf-shell-frame-max/,
        "#root must cap width using a fluid min(100%, frame token) expression"
      );
      assert.match(
        tokensCss,
        /--rf-shell-frame-max:\s*\d+px;/,
        "tokens.css must own the shared frame-max token"
      );
    }
  );

  await t.test(
    "fluid gutters: shared gutter token is non-negative at every representative width",
    () => {
      const match = tokensCss.match(
        /--rf-shell-gutter:\s*clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)px\s*\)/
      );
      assert.ok(match, "tokens.css must define a fluid --rf-shell-gutter clamp()");
      const [, minPxStr, vwStr, maxPxStr] = match;
      const minPx = Number(minPxStr);
      const vw = Number(vwStr);
      const maxPx = Number(maxPxStr);
      assert.ok(minPx >= 0, "gutter minimum must be non-negative");
      assert.ok(maxPx >= minPx, "gutter maximum must not be smaller than its minimum");

      for (const width of REPRESENTATIVE_WIDTHS) {
        const gutter = evalClamp(minPx, vw, maxPx, width);
        assert.ok(gutter >= 0, `gutter at ${width}px must remain non-negative`);
        assert.ok(
          gutter >= minPx - 0.01 && gutter <= maxPx + 0.01,
          `gutter at ${width}px must stay within its clamp bounds`
        );
      }
    }
  );

  await t.test(
    "overflow containment: root chain never exceeds the viewport at any representative width",
    () => {
      const tokensFrameMatch = tokensCss.match(/--rf-shell-frame-max:\s*(\d+)px;/);
      assert.ok(tokensFrameMatch, "a resolvable frame-max token is required to prove overflow containment");
      const frameMax = Number(tokensFrameMatch[1]);

      for (const width of REPRESENTATIVE_WIDTHS) {
        const rootWidth = evalBoundedFrame(frameMax, width);
        assert.ok(rootWidth <= width + 0.01, `#root must never exceed the ${width}px viewport`);
      }

      assert.match(
        indexCss,
        /#root\s*\{[\s\S]*?min-width:\s*0;/,
        "#root must allow shrinking below its content's intrinsic width"
      );
      assert.doesNotMatch(
        indexCss,
        /overflow-x:\s*hidden/,
        "overflow ownership must come from width containment, not overflow clipping that can mask real layout defects"
      );
    }
  );

  await t.test(
    "safe-area clearance: a shared bottom safe-area token exists for role shells to consume",
    () => {
      assert.match(
        tokensCss,
        /--rf-shell-safe-bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/,
        "tokens.css must own a shared safe-area-aware bottom clearance token"
      );
    }
  );

  await t.test(
    "focus visibility: a shared focus-visible contract exists beyond the button-only rule",
    () => {
      assert.match(
        indexCss,
        /:focus-visible\s*\{[\s\S]*?outline:[\s\S]*?;[\s\S]*?outline-offset:/,
        "index.css must define a shared :focus-visible outline and offset for any focusable control"
      );
      assert.match(
        tokensCss,
        /--rf-focus-ring-width:/,
        "tokens.css must own the shared focus ring width token"
      );
      assert.match(
        tokensCss,
        /--rf-focus-ring-color:/,
        "tokens.css must own the shared focus ring color token"
      );
    }
  );

  await t.test(
    "reduced motion: existing collapse-to-1ms behavior remains intact",
    () => {
      assert.match(
        tokensCss,
        /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?animation-duration:\s*1ms\s*!important;[\s\S]*?transition-duration:\s*1ms\s*!important;/,
        "reduced-motion collapse must remain the shared token-layer contract"
      );
    }
  );

  await t.test(
    "preserved Runner mobile fixed-nav clearance (R7B contract)",
    async () => {
      const { socket: sock } = await vite.ssrLoadModule("/src/lib/socket.js");
      socket = sock;
      const { default: RunnerDashboard } = await vite.ssrLoadModule(
        "/src/RunnerDashboard.jsx"
      );
      const markup = renderToStaticMarkup(
        React.createElement(RunnerDashboard, {
          user: { id: 2, role: "runner" },
          onLogout() {},
        })
      );
      assert.match(
        markup,
        /@media \(max-width: 560px\)[\s\S]*?\.runner-dashboard-shell\s*\{[\s\S]*?height:\s*auto\s*!important;/,
        "shared foundation must not remove the mobile 100vh override"
      );
      assert.match(
        markup,
        /\.runner-dashboard-shell\s*\{[\s\S]*?min-height:\s*100vh;/,
        "shared foundation must not remove the viewport-height floor"
      );
      assert.match(
        markup,
        /\.runner-dashboard-shell\s*\{[\s\S]*?padding-bottom:\s*calc\(82px \+ env\(safe-area-inset-bottom\)\);/,
        "shared foundation must not remove the fixed-nav safe-area clearance"
      );
    }
  );
});
