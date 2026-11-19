const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const packageJson = JSON.parse(
  readFileSync(path.resolve("package.json"), "utf8")
);

test("backend startup applies committed Prisma migrations before starting the API", () => {
  assert.equal(
    packageJson.scripts.start,
    "npx prisma migrate deploy && node src/server.js"
  );
});

test("backend development command remains non-production and unchanged", () => {
  assert.equal(
    packageJson.scripts.dev,
    "nodemon src/server.js"
  );
});
