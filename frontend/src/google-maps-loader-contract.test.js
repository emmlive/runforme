import assert from "node:assert/strict";
import test from "node:test";

function installFakeBrowser() {
  const appended = [];
  let onAppend = null;

  global.window = {};
  global.document = {
    head: {
      appendChild(node) {
        appended.push(node);
        onAppend?.(node);
      },
    },
    createElement(tag) {
      assert.equal(tag, "script");
      return {
        async: false,
        defer: false,
        src: "",
        onload: null,
        onerror: null,
      };
    },
  };

  return {
    appended,
    onAppend(handler) {
      onAppend = handler;
    },
    cleanup() {
      delete global.window;
      delete global.document;
    },
  };
}

async function freshLoader(label) {
  return import(`./lib/googleMapsLoader.js?${label}-${Date.now()}-${Math.random()}`);
}

test("missing Google Maps key rejects before script insertion", async () => {
  const browser = installFakeBrowser();

  try {
    const { loadGoogleMaps } = await freshLoader("missing-key");

    await assert.rejects(
      loadGoogleMaps({ apiKey: "" }),
      /Google Maps API key is required/
    );

    assert.equal(browser.appended.length, 0);
  } finally {
    browser.cleanup();
  }
});

test("loader injects one async Google Maps JavaScript API script", async () => {
  const browser = installFakeBrowser();

  try {
    const { loadGoogleMaps } = await freshLoader("inject");

    browser.onAppend((script) => {
      global.window.google = { maps: { Map: function Map() {} } };
      queueMicrotask(() => script.onload());
    });

    const maps = await loadGoogleMaps({ apiKey: "synthetic-browser-key" });

    assert.equal(browser.appended.length, 1);
    assert.equal(browser.appended[0].async, true);
    assert.equal(browser.appended[0].defer, true);
    assert.match(
      browser.appended[0].src,
      /^https:\/\/maps\.googleapis\.com\/maps\/api\/js\?/
    );
    assert.match(
      browser.appended[0].src,
      /key=synthetic-browser-key/
    );
    assert.equal(maps, global.window.google.maps);
  } finally {
    browser.cleanup();
  }
});

test("repeated calls share the same in-flight provider load", async () => {
  const browser = installFakeBrowser();

  try {
    const { loadGoogleMaps } = await freshLoader("reuse");

    let release;
    browser.onAppend((script) => {
      release = () => {
        global.window.google = { maps: { Map: function Map() {} } };
        script.onload();
      };
    });

    const first = loadGoogleMaps({ apiKey: "synthetic-browser-key" });
    const second = loadGoogleMaps({ apiKey: "synthetic-browser-key" });

    assert.equal(browser.appended.length, 1);

    release();

    const [firstMaps, secondMaps] = await Promise.all([first, second]);
    assert.equal(firstMaps, secondMaps);
  } finally {
    browser.cleanup();
  }
});

test("script load failure rejects cleanly", async () => {
  const browser = installFakeBrowser();

  try {
    const { loadGoogleMaps } = await freshLoader("failure");

    browser.onAppend((script) => {
      queueMicrotask(() => script.onerror(new Error("blocked")));
    });

    await assert.rejects(
      loadGoogleMaps({ apiKey: "synthetic-browser-key" }),
      /Google Maps failed to load/
    );
  } finally {
    browser.cleanup();
  }
});
