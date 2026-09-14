import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

// RUN-UI-1N-B1-TASK-3
// Requester responsive hardening contract test. Covers two reachable
// render surfaces:
//   - RequesterMobileShell (read-only, frozen) rendered directly with
//     fixture props — the only Requester Home states reachable through
//     static SSR, since the shell owns its own destination/tab/detail
//     state internally with no prop-driven initial destination.
//   - Dashboard's wide/legacy branch rendered at its default initial
//     state (loading=true, no runs) — the only Dashboard state reachable
//     through static SSR, since Dashboard fetches its own data in an
//     effect that does not run under renderToStaticMarkup.
// Everything else required by the approved plan/audit (compact one-column
// money fields vs. wider pairing, truncation/wrap fixes, overflow-hiding
// removal, focus-visible coverage, safe-area token consumption, no
// duplicate legacy detail panel) is asserted against the active CSS
// import graph, evaluated fluidly rather than as six device branches.
// Representative widths: 360, 390, 430, 768, 1024, 1440 CSS px; 390 x 844
// remains the protected mobile baseline.

const REPRESENTATIVE_MOBILE_WIDTHS = [360, 390, 430];

function extractCssText(transformedCode) {
  const match = transformedCode.match(
    /const __vite__css = "([\s\S]*)"\r?\n__vite__updateStyle/
  );
  assert.ok(match, "expected a Vite-transformed CSS module literal");
  return JSON.parse('"' + match[1] + '"');
}

function baseFormFixture(overrides = {}) {
  return {
    newRun: {
      location: "",
      item: "",
      payout: "25",
      itemBudgetEstimate: "0",
      platformFee: "3",
      bufferAmount: "5",
      handoffRequirement: "standard",
      identityRequirement: "none",
      handoffConfirmed: false,
      handoffInstructions: "",
    },
    setNewRun() {},
    creatingRun: false,
    createRun() {},
    preview: { holdAmount: 0, maxRunnerSpend: 0 },
    formatMoney: (v) => `$${v}`,
    ...overrides,
  };
}

test("Requester responsive hardening", async (t) => {
  const vite = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
  });

  t.after(async () => {
    await vite.close();
  });

  const mobileShellCssResult = await vite.transformRequest(
    "/src/components/requester/RequesterMobileShell.css"
  );
  const mobileShellCss = extractCssText(mobileShellCssResult.code);

  const commandCenterCssResult = await vite.transformRequest(
    "/src/components/requester/RequesterCommandCenter.css"
  );
  const commandCenterCss = extractCssText(commandCenterCssResult.code);

  const polishCssResult = await vite.transformRequest(
    "/src/components/requester/RequesterDashboardPolish.css"
  );
  const polishCss = extractCssText(polishCssResult.code);

  const { default: RequesterMobileShell } = await vite.ssrLoadModule(
    "/src/components/requester/RequesterMobileShell.jsx"
  );

  const longRun = {
    id: "run-long-1",
    status: "assigned",
    item:
      "Pick up the custom-engraved commemorative plaque and the matching velvet display case from the downtown engraving workshop before the afternoon ceremony begins",
    location:
      "1200 North Lake Shore Drive, Suite 4500, Chicago, Illinois 60610, United States - use the loading dock entrance around back",
    payout: 40,
    assignedRunnerId: 7,
  };

  const noActiveMarkup = renderToStaticMarkup(
    React.createElement(RequesterMobileShell, {
      activeRuns: [],
      completedRuns: [],
      selectedRun: null,
      notification: null,
      form: baseFormFixture(),
      onSelectRun() {},
      onAuthorizeHold() {},
      onApproveManualReview() {},
      onRefresh() {},
      onLogout() {},
    })
  );

  const activeMarkup = renderToStaticMarkup(
    React.createElement(RequesterMobileShell, {
      activeRuns: [longRun],
      completedRuns: [],
      selectedRun: longRun,
      notification: null,
      form: baseFormFixture(),
      onSelectRun() {},
      onAuthorizeHold() {},
      onApproveManualReview() {},
      onRefresh() {},
      onLogout() {},
    })
  );

  await t.test("Home: no-active-run state is immediately understandable", () => {
    assert.match(noActiveMarkup, /Start a request/);
    assert.match(noActiveMarkup, /No active run/);
  });

  await t.test(
    "Home: active-run state renders the full long title/location text (no JS truncation)",
    () => {
      assert.ok(
        activeMarkup.includes(longRun.item),
        "full item text must be present in markup, not shortened"
      );
      assert.ok(
        activeMarkup.includes(longRun.location),
        "full location text must be present in markup, not shortened"
      );
    }
  );

  await t.test(
    "no duplicate legacy RunDetailPanel-style presentation inside the mobile shell",
    () => {
      assert.doesNotMatch(activeMarkup, /RUN DETAIL/);
      assert.doesNotMatch(activeMarkup, /run-requester-surface--detail/);
      assert.doesNotMatch(noActiveMarkup, /RUN DETAIL/);
    }
  );

  await t.test(
    "mobile request form: money fields are one column on compact mobile, paired only above a proven wider (but still mobile) width",
    () => {
      const baseRuleMatch = mobileShellCss.match(
        /\.requester-mobile-form-card \.requester-run-form\s*\{([^}]*)\}/
      );
      assert.ok(baseRuleMatch, "expected the mobile request form grid rule");
      assert.match(
        baseRuleMatch[1],
        /grid-template-columns:\s*1fr\s*!important/,
        "compact base must be one column, not paired, per the approved one-column-compact rule"
      );

      const pairedGateMatch = mobileShellCss.match(
        /@media \(min-width:\s*(\d+)px\)\s*\{\s*\.requester-mobile-form-card \.requester-run-form\s*\{([^}]*)\}/
      );
      assert.ok(
        pairedGateMatch,
        "expected a min-width gate restoring paired fields at a wider (but still compact) mobile width"
      );
      const gateWidth = Number(pairedGateMatch[1]);
      assert.ok(
        gateWidth > 430 && gateWidth < 761,
        `pairing gate (${gateWidth}px) must sit strictly between the 430px compact representative and the 761px mobile-shell boundary`
      );
      assert.match(
        pairedGateMatch[2],
        /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/,
        "wider mobile must restore the existing two-column pairing"
      );

      for (const width of REPRESENTATIVE_MOBILE_WIDTHS) {
        assert.ok(
          width < gateWidth,
          `representative compact width ${width}px must remain below the pairing gate`
        );
      }
    }
  );

  await t.test(
    "mobile Home: active-run heading wraps predictably instead of clamping to a fixed line count",
    () => {
      assert.doesNotMatch(
        mobileShellCss,
        /\.requester-mobile-active-card h2\s*\{[^}]*-webkit-line-clamp/,
        "active card heading must not truncate with a line-clamp"
      );
    }
  );

  await t.test(
    "mobile My Runs: run row title/location wrap predictably instead of single-line ellipsis truncation",
    () => {
      const rowTextMatch = mobileShellCss.match(
        /\.requester-mobile-run-row strong,\s*\.requester-mobile-run-row small\s*\{([^}]*)\}/
      );
      assert.ok(rowTextMatch, "expected the run row title/location rule");
      assert.doesNotMatch(
        rowTextMatch[1],
        /white-space:\s*nowrap/,
        "run row text must not be forced to a single line"
      );
      assert.doesNotMatch(
        rowTextMatch[1],
        /text-overflow:\s*ellipsis/,
        "run row text must not be ellipsis-truncated"
      );
      assert.match(
        rowTextMatch[1],
        /overflow-wrap:\s*anywhere/,
        "run row text must wrap safely for unbroken long strings"
      );
    }
  );

  await t.test(
    "mobile run detail heading wraps predictably instead of clamping to a fixed line count",
    () => {
      assert.doesNotMatch(
        mobileShellCss,
        /\.requester-mobile-run-detail__heading h1\s*\{[^}]*-webkit-line-clamp/,
        "run detail heading must not truncate with a line-clamp"
      );
      assert.match(
        mobileShellCss,
        /\.requester-mobile-run-detail__heading h1\s*\{[^}]*overflow-wrap:\s*anywhere/,
        "run detail heading must still guard against unbroken long strings"
      );
    }
  );

  await t.test(
    "mobile shell: focus-visible treatment is defined for nav, tabs, run rows, menu, and header controls",
    () => {
      for (const selector of [
        ".requester-mobile-nav button",
        ".requester-mobile-tabs button",
        ".requester-mobile-run-row",
        ".requester-mobile-menu-list button",
        ".requester-mobile-back",
        ".requester-mobile-header__menu",
        ".requester-mobile-runs-link",
      ]) {
        const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`${escaped}:focus-visible\\s*\\{[^}]*outline`);
        assert.match(
          mobileShellCss,
          re,
          `expected an explicit :focus-visible outline rule for ${selector}`
        );
      }
    }
  );

  await t.test(
    "mobile shell: fixed-nav safe-area clearance consumes the shared Task 2 safe-area token",
    () => {
      assert.match(
        mobileShellCss,
        /\.requester-mobile-shell\s*\{[^}]*padding-bottom:\s*calc\(76px \+ var\(--rf-shell-safe-bottom/,
        "shell bottom clearance must reserve 76px plus the shared safe-area token"
      );
      assert.match(
        mobileShellCss,
        /\.requester-mobile-nav\s*\{[^}]*padding:\s*4px 8px var\(--rf-shell-safe-bottom/,
        "fixed nav must apply the shared safe-area token for its own bottom inset"
      );
    }
  );

  await t.test(
    "wide-branch run list status pill wraps predictably instead of single-line ellipsis truncation",
    () => {
      const statusMatch = commandCenterCss.match(
        /\.requester-run-list__status\s*\{([^}]*)\}/
      );
      assert.ok(statusMatch, "expected the run list status pill rule");
      assert.doesNotMatch(
        statusMatch[1],
        /white-space:\s*nowrap/,
        "status pill text must not be forced to a single line"
      );
      assert.doesNotMatch(
        statusMatch[1],
        /text-overflow:\s*ellipsis/,
        "status pill text must not be ellipsis-truncated"
      );
    }
  );

  await t.test(
    "wide-branch run surfaces no longer hide overflow in a way that can clip focus rings or long content",
    () => {
      const surfaceMatch = polishCss.match(/\.run-requester-surface\s*\{([^}]*)\}/);
      assert.ok(surfaceMatch, "expected the base run-requester-surface rule");
      assert.doesNotMatch(
        surfaceMatch[1],
        /overflow:\s*hidden/,
        "base surface must not clip descendant focus rings or content"
      );
      assert.match(
        polishCss,
        /\.run-requester-surface::before\s*\{[^}]*border-radius:\s*inherit/,
        "the decorative pseudo-element must own its own rounded clipping instead of the surface hiding overflow"
      );

      const createMatch = polishCss.match(
        /\.run-requester-surface--create\s*\{([^}]*)\}/
      );
      assert.ok(createMatch, "expected the create-surface rule");
      assert.doesNotMatch(
        createMatch[1],
        /overflow:\s*hidden/,
        "create surface must not clip descendant focus rings or content"
      );
    }
  );

  await t.test(
    "wide branch: loading state is announced with an explicit status role",
    async () => {
      globalThis.localStorage = {
        getItem: () => null,
        setItem() {},
        removeItem() {},
      };

      const { default: Dashboard } = await vite.ssrLoadModule("/src/Dashboard.jsx");
      const dashboardMarkup = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(Dashboard, { onLogout() {} })
        )
      );

      assert.match(
        dashboardMarkup,
        /role="status">Loading\.\.\.<\/p>/,
        "the loading indicator must be announced via an explicit status role"
      );
      assert.match(
        dashboardMarkup,
        /aria-busy="false"/,
        "the Create Run submit control must expose aria-busy reflecting the existing creatingRun state"
      );
    }
  );

  // RUN-UI-1N TASK 7 - CHECKPOINT 2A (P2 Finding 1)
  // The wide-branch "Active Runs" stat label carries stray requester
  // surface/card classes (run-requester-surface, run-requester-surface--active)
  // meant for full card/section surfaces, unlike its sibling stat labels
  // ("Completed", "Total Payout"), which render as plain text. This renders
  // a mismatched decorative gradient pill behind just the label text.
  await t.test(
    "wide branch: Active Runs stat label does not carry full requester surface/card classes",
    async () => {
      globalThis.localStorage = {
        getItem: () => null,
        setItem() {},
        removeItem() {},
      };

      const { default: Dashboard } = await vite.ssrLoadModule("/src/Dashboard.jsx");
      const dashboardMarkup = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(Dashboard, { onLogout() {} })
        )
      );

      const labelMatch = dashboardMarkup.match(
        /<div class="([^"]*)"[^>]*>Active Runs<\/div>/
      );
      assert.ok(
        labelMatch,
        "expected the Active Runs stat label to render as a classed div"
      );
      assert.doesNotMatch(
        labelMatch[1],
        /run-requester-surface/,
        "the Active Runs stat label must not carry full requester surface/card classes " +
          "(run-requester-surface, run-requester-surface--active) - its sibling stat " +
          "labels (Completed, Total Payout) render as plain text with no such classes"
      );
    }
  );
});
