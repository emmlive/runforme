import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

// RUN-UI-1N TASK 6 - CHECKPOINT 1 (RED)
// Navigation + page shell contract. Renders the existing Requester and
// Runner surfaces through the same Vite SSR pipeline the other
// RUN-UI-1N contract tests use (renderToStaticMarkup does not run
// effects/state, so only default-state markup and the always-rendered
// embedded stylesheet are reachable). No run creation, run acceptance,
// payment, secure hold, receipt, delivery-confirmation, or provider
// call is exercised anywhere in this file - only navigation reachability
// of the existing four destinations per role.
//
// Representative tablet/desktop widths follow the widths already used by
// the other RUN-UI-1N responsive tests: 768, 1024, 1440 CSS px.

const TABLET_DESKTOP_WIDTHS = [768, 1024, 1440];

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

// Models the current cascade for a single selector's `display` value from
// the two rules that actually exist in RunnerDashboard.jsx today (an
// unconditional `display: none` and a `@media (max-width: 560px)` override),
// plus any additional min-width override a future fix might add. This is a
// reachability/behavior model, not a pixel-perfect style assertion.
function isRunnerNavReachableAtWidth(styleText, widthPx) {
  const unconditionalHidden = /\.runner-mobile-nav,\s*\n?\s*\.runner-mobile-section-sheet\s*\{\s*display:\s*none;/.test(
    styleText
  );
  if (!unconditionalHidden) return true;

  const maxWidthMatch = styleText.match(
    /@media \(max-width:\s*(\d+)px\)[\s\S]*?\.runner-mobile-nav\s*\{[\s\S]*?display:\s*(grid|flex|block)/
  );
  if (maxWidthMatch && widthPx <= Number(maxWidthMatch[1])) return true;

  const minWidthMatch = styleText.match(
    /@media \(min-width:\s*(\d+)px\)[\s\S]*?\.runner-mobile-nav\s*\{[\s\S]*?display:\s*(grid|flex|block)/
  );
  if (minWidthMatch && widthPx >= Number(minWidthMatch[1])) return true;

  return false;
}

test("Requester navigation + page shell contract", async (t) => {
  const vite = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
  });

  t.after(async () => {
    await vite.close();
  });

  const { default: RequesterMobileShell } = await vite.ssrLoadModule(
    "/src/components/requester/RequesterMobileShell.jsx"
  );

  const mobileMarkup = renderToStaticMarkup(
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

  await t.test(
    "A: mobile navigation exposes Home, Request, My Runs, and Menu as reachable destinations",
    () => {
      const navMatch = mobileMarkup.match(
        /<nav class="requester-mobile-nav" aria-label="Requester navigation">([\s\S]*?)<\/nav>/
      );
      assert.ok(navMatch, "expected the requester bottom navigation landmark to render");

      for (const label of ["Home", "Request", "My Runs", "Menu"]) {
        assert.ok(
          navMatch[1].includes(`<small>${label}</small>`),
          `expected a reachable "${label}" destination in the requester navigation`
        );
      }

      assert.match(
        navMatch[1],
        /aria-current="page"[^>]*>[\s\S]*?<small>Home<\/small>/,
        "Home must be the reachable default destination"
      );
    }
  );

  await t.test(
    "C: existing requester Home content still renders inside the shell alongside navigation",
    () => {
      assert.match(mobileMarkup, /Start a request/, "requester home content must still render");
      assert.match(
        mobileMarkup,
        /aria-label="Requester navigation"/,
        "navigation landmark must render alongside the existing home content"
      );
    }
  );

  await t.test(
    "A: tablet/desktop width has an intentional reachable equivalent for Request and My Runs, not a loss of navigation",
    async () => {
      globalThis.localStorage = {
        getItem: () => null,
        setItem() {},
        removeItem() {},
      };

      const { default: Dashboard } = await vite.ssrLoadModule("/src/Dashboard.jsx");
      const wideMarkup = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(Dashboard, { onLogout() {} })
        )
      );

      assert.match(
        wideMarkup,
        /Create Run/,
        "Request destination must have a reachable equivalent on the wide/desktop branch"
      );
      assert.match(
        wideMarkup,
        /Active Runs/,
        "My Runs (active) destination must have a reachable equivalent on the wide/desktop branch"
      );
      assert.match(
        wideMarkup,
        /Completed Runs/,
        "My Runs (history) destination must have a reachable equivalent on the wide/desktop branch"
      );
      assert.match(
        wideMarkup,
        />Logout</,
        "Menu (account/sign-out) destination must have a reachable equivalent on the wide/desktop branch"
      );
    }
  );
});

test("Runner navigation + page shell contract", async (t) => {
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

  const styleMatch = markup.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(styleMatch, "expected the runner shell's embedded stylesheet to render");
  const styleText = styleMatch[1];

  await t.test(
    "B: navigation exposes Home, Earnings, Activity, and Menu as destinations",
    () => {
      const navMatch = markup.match(
        /<nav class="runner-mobile-nav" aria-label="Runner navigation">([\s\S]*?)<\/nav>/
      );
      assert.ok(navMatch, "expected the runner bottom navigation landmark to render");

      for (const label of ["Home", "Earnings", "Activity", "Menu"]) {
        assert.ok(
          navMatch[1].includes(`<span>${label}</span>`),
          `expected a reachable "${label}" destination in the runner navigation`
        );
      }
    }
  );

  await t.test(
    "C: existing runner Home content still renders inside the shell alongside navigation",
    () => {
      assert.match(
        markup,
        /aria-label="Runner navigation"/,
        "navigation landmark must render alongside the existing runner home content"
      );
      assert.match(
        markup,
        /Online|Offline/,
        "runner home status content must still render"
      );
    }
  );

  await t.test(
    "B/D: navigation must remain reachable at tablet and desktop widths, not only below the ~560px mobile branch",
    () => {
      for (const width of TABLET_DESKTOP_WIDTHS) {
        assert.ok(
          isRunnerNavReachableAtWidth(styleText, width),
          `runner navigation (Home/Earnings/Activity/Menu) must be reachable at ${width}px; ` +
            "it is currently hidden by an unconditional display:none with no min-width override " +
            "restoring it above the 560px mobile-only branch"
        );
      }
    }
  );

  // RUN-UI-1N TASK 6 - CHECKPOINT 3A
  // Checkpoint 3's live browser inspection found the wide-width navigation
  // reachable (Checkpoint 2's fix) but buried at the very bottom of the DOM,
  // after the map, command center, trust checklist, and available-run body -
  // requiring a full scroll to discover it. This is a structural/DOM-order
  // contract, not a pixel/layout one: at <=560px the nav is taken out of
  // flow via `position: fixed`, so its DOM position does not affect the
  // frozen mobile presentation either way. Above 560px it renders in normal
  // document flow, so DOM order directly determines whether it appears near
  // the top of the Runner experience or only after the long dashboard body.
  await t.test(
    "D: navigation is surfaced near the top of the Runner experience, not only after the long dashboard body",
    () => {
      const navIndex = markup.indexOf('<nav class="runner-mobile-nav"');
      const dashboardBodyIndex = markup.indexOf(
        "runner-command-center-preview-slot"
      );

      assert.ok(navIndex !== -1, "expected the runner navigation to render");
      assert.ok(
        dashboardBodyIndex !== -1,
        "expected the runner command-center/available-runs dashboard body to render"
      );
      assert.ok(
        navIndex < dashboardBodyIndex,
        "runner navigation must be surfaced before the long dashboard body " +
          "(command center / trust checklist / available runs), not only " +
          "reachable after scrolling past it at the very bottom of the page"
      );
    }
  );

});
