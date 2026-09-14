import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("mobile runner shell grows and reserves safe-area clearance below active content", async () => {
  const vite = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
  });
  let socket;

  try {
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

    assert.match(
      markup,
      /@media \(max-width: 560px\)[\s\S]*?\.runner-dashboard-shell\s*\{[\s\S]*?height:\s*auto\s*!important;/,
      "mobile CSS must override the inline 100vh height so active content can grow"
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
  } finally {
    try {
      socket?.disconnect();
    } finally {
      await vite.close();
    }
  }
});
