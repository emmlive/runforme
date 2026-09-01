import assert from "node:assert/strict";
import test from "node:test";

import { initializeStripe } from "./stripeInitialization.js";

test("does not initialize Stripe when the disable flag is true", () => {
  let loadStripeCalls = 0;
  const stripe = initializeStripe({
    disableValue: "true",
    publishableKey: "pk_local_test_value",
    loadStripe(key) {
      loadStripeCalls += 1;
      return { key };
    },
  });

  assert.equal(stripe, null);
  assert.equal(loadStripeCalls, 0);
});

for (const disableValue of [undefined, "false"]) {
  test(`initializes Stripe when the disable flag is ${String(disableValue)}`, () => {
    let loadStripeCalls = 0;
    const expectedStripe = { initialized: true };
    const stripe = initializeStripe({
      disableValue,
      publishableKey: "pk_local_test_value",
      loadStripe(key) {
        loadStripeCalls += 1;
        assert.equal(key, "pk_local_test_value");
        return expectedStripe;
      },
    });

    assert.equal(stripe, expectedStripe);
    assert.equal(loadStripeCalls, 1);
  });
}
