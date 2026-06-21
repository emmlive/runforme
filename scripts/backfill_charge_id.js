require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const pool = require("../src/config/db");

(async () => {
  const r = await pool.query(
    `SELECT id, payment_intent_id FROM runs WHERE charge_id IS NULL AND payment_status IN ('captured','paid')`
  );

  for (const row of r.rows) {
    try {
      const pi = await stripe.paymentIntents.retrieve(row.payment_intent_id);
      const chargeId = pi.latest_charge;
      if (chargeId) {
        await pool.query(`UPDATE runs SET charge_id=$1 WHERE id=$2`, [chargeId, row.id]);
        console.log("Backfilled run", row.id, "charge", chargeId);
      } else {
        console.log("No charge for run", row.id);
      }
    } catch (err) {
      console.error('Error backfilling run', row.id, err.message || err);
    }
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
