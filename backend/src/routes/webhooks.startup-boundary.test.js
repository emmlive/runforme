const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("production backend startup does not require live payment activation", () => {
  const backendRoot = path.resolve(__dirname, "../..");

  const script = `
    require("./src/routes/webhooks");
    process.stdout.write("WEBHOOK_ROUTE_LOADED");
  `;

  const env = {
    ...process.env,
    NODE_ENV: "production",
    STRIPE_SECRET_KEY: "sk_test_startup_boundary_synthetic",
    STRIPE_WEBHOOK_SECRET: "whsec_startup_boundary_synthetic",
    STRIPE_CURRENCY: "usd",
    DATABASE_URL:
      "postgresql://synthetic:synthetic@127.0.0.1:65535/synthetic",
  };

  delete env.RUNFORME_LIVE_PAYMENTS_AUTHORIZED;

  const result = spawnSync(
    process.execPath,
    ["-e", script],
    {
      cwd: backendRoot,
      env,
      encoding: "utf8",
    }
  );

  assert.equal(
    result.status,
    0,
    [
      "production startup must remain available while live payments are inactive",
      result.stderr,
    ]
      .filter(Boolean)
      .join("\n")
  );

  assert.match(
    result.stdout,
    /WEBHOOK_ROUTE_LOADED/
  );
});