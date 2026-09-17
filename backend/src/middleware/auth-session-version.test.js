const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const jwt = require("jsonwebtoken");

const middlewarePath = path.join(__dirname, "auth.js");
const dbPath = path.join(__dirname, "..", "config", "db.js");

const TEST_SECRET = "synthetic-task6-jwt-secret";

function loadAuthWithFakePrisma(fakePrisma) {
  const previousSecret = process.env.JWT_SECRET;
  const previousEnvironment = process.env.NODE_ENV;

  process.env.JWT_SECRET = TEST_SECRET;
  process.env.NODE_ENV = "test";

  delete require.cache[require.resolve(middlewarePath)];

  const previousDbCache = require.cache[require.resolve(dbPath)];

  require.cache[require.resolve(dbPath)] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakePrisma,
    children: [],
    paths: [],
  };

  const auth = require(middlewarePath);

  function restore() {
    delete require.cache[require.resolve(middlewarePath)];

    if (previousDbCache) {
      require.cache[require.resolve(dbPath)] = previousDbCache;
    } else {
      delete require.cache[require.resolve(dbPath)];
    }

    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }

    if (previousEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnvironment;
    }
  }

  return { auth, restore };
}

function createResponseHarness() {
  const state = {
    statusCode: 200,
    body: undefined,
    nextCalls: 0,
  };

  const res = {
    status(code) {
      state.statusCode = code;
      return this;
    },

    json(body) {
      state.body = body;
      return this;
    },
  };

  function next() {
    state.nextCalls += 1;
  }

  return { state, res, next };
}

async function invokeAuth(auth, token) {
  const harness = createResponseHarness();
  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };

  await auth(req, harness.res, harness.next);

  return {
    req,
    ...harness,
  };
}

function signToken(payload, options = {}) {
  return jwt.sign(payload, TEST_SECRET, options);
}

test("current persisted session version is accepted and attaches persisted user identity", async () => {
  const calls = [];
  const fakePrisma = {
    user: {
      async findUnique(args) {
        calls.push(args);
        return { id: 42, role: "requester", sessionVersion: 3 };
      },
    },
  };

  const loaded = loadAuthWithFakePrisma(fakePrisma);

  try {
    const token = signToken({
      userId: 42,
      role: "requester",
      sessionVersion: 3,
    });

    const result = await invokeAuth(loaded.auth, token);

    assert.equal(result.state.statusCode, 200);
    assert.equal(result.state.nextCalls, 1);
    assert.deepEqual(result.req.user, {
      id: 42,
      role: "requester",
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      where: { id: 42 },
      select: {
        id: true,
        role: true,
        sessionVersion: true,
      },
    });
  } finally {
    loaded.restore();
  }
});

test("stale JWT session version is rejected with 401", async () => {
  const fakePrisma = {
    user: {
      async findUnique() {
        return { id: 42, role: "requester", sessionVersion: 4 };
      },
    },
  };

  const loaded = loadAuthWithFakePrisma(fakePrisma);

  try {
    const token = signToken({
      userId: 42,
      role: "requester",
      sessionVersion: 3,
    });

    const result = await invokeAuth(loaded.auth, token);

    assert.equal(result.state.statusCode, 401);
    assert.equal(result.state.nextCalls, 0);
    assert.deepEqual(result.state.body, {
      error: "Invalid or expired token",
    });
  } finally {
    loaded.restore();
  }
});

test("legacy JWT without sessionVersion is rejected with 401", async () => {
  let databaseCalls = 0;
  const fakePrisma = {
    user: {
      async findUnique() {
        databaseCalls += 1;
        return { id: 42, role: "requester", sessionVersion: 0 };
      },
    },
  };

  const loaded = loadAuthWithFakePrisma(fakePrisma);

  try {
    const token = signToken({
      userId: 42,
      role: "requester",
    });

    const result = await invokeAuth(loaded.auth, token);

    assert.equal(result.state.statusCode, 401);
    assert.equal(result.state.nextCalls, 0);
    assert.deepEqual(result.state.body, {
      error: "Invalid or expired token",
    });
    assert.equal(databaseCalls, 0);
  } finally {
    loaded.restore();
  }
});

test("JWT for nonexistent user is rejected with 401", async () => {
  const fakePrisma = {
    user: {
      async findUnique() {
        return null;
      },
    },
  };

  const loaded = loadAuthWithFakePrisma(fakePrisma);

  try {
    const token = signToken({
      userId: 999,
      role: "requester",
      sessionVersion: 0,
    });

    const result = await invokeAuth(loaded.auth, token);

    assert.equal(result.state.statusCode, 401);
    assert.equal(result.state.nextCalls, 0);
    assert.deepEqual(result.state.body, {
      error: "Invalid or expired token",
    });
  } finally {
    loaded.restore();
  }
});

test("malformed JWT is rejected with existing generic 401 behavior", async () => {
  let databaseCalls = 0;
  const fakePrisma = {
    user: {
      async findUnique() {
        databaseCalls += 1;
        return null;
      },
    },
  };

  const loaded = loadAuthWithFakePrisma(fakePrisma);
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const result = await invokeAuth(loaded.auth, "malformed-token");

    assert.equal(result.state.statusCode, 401);
    assert.equal(result.state.nextCalls, 0);
    assert.deepEqual(result.state.body, {
      error: "Invalid or expired token",
    });
    assert.equal(databaseCalls, 0);
  } finally {
    console.error = originalConsoleError;
    loaded.restore();
  }
});

test("expired JWT is rejected with existing generic 401 behavior", async () => {
  let databaseCalls = 0;
  const fakePrisma = {
    user: {
      async findUnique() {
        databaseCalls += 1;
        return null;
      },
    },
  };

  const loaded = loadAuthWithFakePrisma(fakePrisma);
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const token = signToken(
      {
        userId: 42,
        role: "requester",
        sessionVersion: 0,
      },
      { expiresIn: -1 }
    );

    const result = await invokeAuth(loaded.auth, token);

    assert.equal(result.state.statusCode, 401);
    assert.equal(result.state.nextCalls, 0);
    assert.deepEqual(result.state.body, {
      error: "Invalid or expired token",
    });
    assert.equal(databaseCalls, 0);
  } finally {
    console.error = originalConsoleError;
    loaded.restore();
  }
});
