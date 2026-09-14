const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webhookPath = path.join(
  __dirname,
  "webhooks.js"
);

const appPath = path.join(
  __dirname,
  "..",
  "app.js"
);

const source = fs.readFileSync(
  webhookPath,
  "utf8"
);

const appSource = fs.readFileSync(
  appPath,
  "utf8"
);

test("webhook route preserves raw application/json body parsing", () => {
  assert.match(
    source,
    /express\.raw\s*\(\s*\{\s*type\s*:\s*["']application\/json["']\s*\}\s*\)/
  );
});

test("webhook route preserves Stripe signature verification", () => {
  assert.match(
    source,
    /stripe-signature/
  );

  assert.match(
    source,
    /constructEvent\s*\(/
  );

  assert.match(
    source,
    /STRIPE_WEBHOOK_SECRET/
  );
});

test("webhook route delegates valid events to canonical Prisma reconciler", () => {
  assert.match(
    source,
    /require\s*\(\s*["']\.\.\/services\/stripeWebhookReconciler["']\s*\)/
  );

  assert.match(
    source,
    /reconcileStripeEvent\s*\(\s*\{/
  );

  assert.match(
    source,
    /\bevent\s*,/
  );

  assert.match(
    source,
    /\bprisma\s*,?/
  );
});

test("webhook route imports canonical Prisma database client", () => {
  assert.match(
    source,
    /const\s+prisma\s*=\s*require\s*\(\s*["']\.\.\/config\/db["']\s*\)/
  );

  assert.doesNotMatch(
    source,
    /const\s+pool\s*=\s*require\s*\(\s*["']\.\.\/config\/db["']\s*\)/
  );
});

test("webhook route contains no raw SQL execution", () => {
  assert.doesNotMatch(
    source,
    /\bpool\.query\s*\(/
  );

  assert.doesNotMatch(
    source,
    /\b(?:SELECT|INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?(?:public\.)?runs\b/i
  );

  assert.doesNotMatch(
    source,
    /\bINSERT\s+INTO\s+public\.stripe_webhook_events\b/i
  );
});

test("webhook route contains no legacy database identifiers", () => {
  const forbidden = [
    "payment_intent_id",
    "charge_id",
    "transfer_id",
    "transfer_status",
  ];

  for (const identifier of forbidden) {
    assert.equal(
      source.includes(identifier),
      false,
      `legacy identifier remains: ${identifier}`
    );
  }
});

test("unsupported valid events are handled by reconciler rather than route switch SQL", () => {
  assert.doesNotMatch(
    source,
    /switch\s*\(\s*event\.type\s*\)/
  );

  assert.match(
    source,
    /reconcileStripeEvent\s*\(/
  );
});

test("webhook mount remains before JSON body parser", () => {
  const webhookMount = appSource.indexOf(
    'app.use("/webhooks", webhookRouter)'
  );

  const jsonParser = appSource.indexOf(
    "app.use(express.json("
  );

  assert.notEqual(
    webhookMount,
    -1,
    "webhook mount must remain present"
  );

  assert.notEqual(
    jsonParser,
    -1,
    "JSON parser must remain present"
  );

  assert.ok(
    webhookMount < jsonParser,
    "webhook mount must remain before express.json"
  );
});