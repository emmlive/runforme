const pool = require("../src/config/db");

(async () => {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: node scripts/check_run_pi.js <payment_intent_id>");
    process.exit(1);
  }

  const r = await pool.query(
    `SELECT id, payment_intent_id, charge_id, payment_status, transfer_id, transfer_status
     FROM runs
     WHERE payment_intent_id = $1`,
    [id]
  );

  console.log(JSON.stringify(r.rows, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
