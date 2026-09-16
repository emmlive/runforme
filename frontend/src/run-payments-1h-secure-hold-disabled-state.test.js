import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const paymentPagePath = path.join(
  here,
  "pages",
  "PaymentPage.tsx"
);

const source = fs.readFileSync(
  paymentPagePath,
  "utf8"
);

test(
  "Secure Hold submit button uses one canonical disabled-state variable",
  () => {
    assert.match(
      source,
      /const\s+submitDisabled\s*=\s*!stripe\s*\|\|\s*loading\s*;/,
      "PaymentPage must derive one canonical submitDisabled state"
    );

    assert.match(
      source,
      /disabled=\{submitDisabled\}/,
      "Authorize secure hold button must use submitDisabled"
    );
  }
);

test(
  "disabled Secure Hold authorization is visibly inactive",
  () => {
    assert.match(
      source,
      /cursor:\s*submitDisabled\s*\?\s*["']not-allowed["']\s*:\s*["']pointer["']/,
      "disabled authorization must use a not-allowed cursor"
    );

    assert.match(
      source,
      /opacity:\s*submitDisabled\s*\?\s*0\.55\s*:\s*1/,
      "disabled authorization must be visually muted"
    );
  }
);

test(
  "loading and Stripe-unavailable states remain fail-closed",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!stripe\s*\|\|\s*!elements\s*\|\|\s*loading\s*\)/,
      "submit handler must continue to fail closed without Stripe/Elements or while loading"
    );

    assert.match(
      source,
      /loading\s*\?\s*["']Authorizing\.\.\.["']\s*:\s*["']Authorize secure hold["']/,
      "authorization loading copy must remain explicit"
    );
  }
);