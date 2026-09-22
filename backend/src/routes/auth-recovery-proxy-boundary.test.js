const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

function closeServer(server) {
  if (!server || !server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

test("forgot-password limiter receives the client IP after exactly two trusted Render proxy hops", async () => {
  const limiterModule = require("../services/recoveryRequestLimiter");
  const limiter = limiterModule.recoveryRequestLimiter;

  const originalCheckRecoveryRequest =
    limiter.checkRecoveryRequest;

  const originalRecoveryEnabled =
    process.env.RUNFORME_RECOVERY_DELIVERY_ENABLED;

  const limiterKeys = [];
  let server;

  try {
    process.env.RUNFORME_RECOVERY_DELIVERY_ENABLED = "false";

    limiter.checkRecoveryRequest = (key) => {
      limiterKeys.push(key);

      return {
        allowed: true,
        retryAfterMs: 0,
      };
    };

    delete require.cache[
      require.resolve("../services/recoveryDelivery")
    ];
    delete require.cache[
      require.resolve("./auth")
    ];
    delete require.cache[
      require.resolve("../app")
    ];

    const app = require("../app");

    server = http.createServer(app);

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();

    assert.ok(address);
    assert.equal(typeof address, "object");

    const response = await fetch(
      "http://127.0.0.1:" +
        address.port +
        "/api/auth/forgot-password",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",

          // Public Render topology under test:
          //
          // attacker-controlled extra value,
          // actual client,
          // Cloudflare,
          // then Render LB is req.socket.remoteAddress.
          //
          // A bounded two-hop trust policy must select
          // the actual client and ignore the extra left-most value.
          "x-forwarded-for":
            "192.0.2.66, 198.51.100.42, 203.0.113.9",
        },
        body: JSON.stringify({
          email: " Person@Example.Test ",
        }),
      }
    );

    assert.equal(response.status, 200);

    assert.equal(
      limiterKeys[0],
      "ip:198.51.100.42",
      "forgot-password limiter must receive client IP after exactly two trusted proxy hops"
    );

    assert.equal(
      limiterKeys[1],
      "email:person@example.test",
      "email limiter dimension must remain normalized and independent"
    );

    assert.equal(
      app.get("trust proxy"),
      2,
      "Render public ingress must use an explicit bounded two-hop proxy policy"
    );

    assert.notEqual(
      limiterKeys[0],
      "ip:192.0.2.66",
      "extra left-most forwarded value must not control the limiter identity"
    );
  } finally {
    await closeServer(server);

    limiter.checkRecoveryRequest =
      originalCheckRecoveryRequest;

    if (originalRecoveryEnabled === undefined) {
      delete process.env.RUNFORME_RECOVERY_DELIVERY_ENABLED;
    } else {
      process.env.RUNFORME_RECOVERY_DELIVERY_ENABLED =
        originalRecoveryEnabled;
    }

    delete require.cache[
      require.resolve("../app")
    ];
    delete require.cache[
      require.resolve("./auth")
    ];
    delete require.cache[
      require.resolve("../services/recoveryDelivery")
    ];
  }
});
