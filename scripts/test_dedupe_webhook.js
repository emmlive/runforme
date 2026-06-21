// Simulate duplicate webhook deliveries by inserting same event id twice
const pool = require("../src/config/db");

async function run() {
  const eventId = "evt_test_dedupe_12345";
  try {
    // ensure clean state for test
    await pool.query("DELETE FROM public.stripe_webhook_events WHERE id=$1", [eventId]);
    // first insert (use existing table columns)
    const r1 = await pool.query(
      `INSERT INTO public.stripe_webhook_events (id, type, event_type, livemode, object_id, object_type, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (id) DO NOTHING
       RETURNING id, applied`,
      [eventId, "charge.succeeded", "charge.succeeded", false, null, null]
    );

    console.log("first insert rowCount:", r1.rowCount, "rows:", r1.rows);

    // second insert (simulate replay)
    const r2 = await pool.query(
      `INSERT INTO public.stripe_webhook_events (id, type)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, applied`,
      [eventId, "charge.succeeded"]
    );
    console.log("second insert rowCount:", r2.rowCount, "rows:", r2.rows);

    // emulate response logic: if second returned 0, fetch applied flag
    if (r2.rowCount === 0) {
      const prior = await pool.query(`SELECT applied FROM public.stripe_webhook_events WHERE id=$1 LIMIT 1`, [eventId]);
      console.log("replay response: { received: true, deduped: true, applied:", prior.rows[0]?.applied, "}");
    } else {
      console.log("replay response: { received: true }");
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
