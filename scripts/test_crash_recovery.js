const pool = require('../src/config/db');

async function firstAttempt(client, eventId, runId) {
  try {
    await client.query('BEGIN');
    // dedupe check
    const existing = await client.query(`SELECT id, applied FROM public.stripe_webhook_events WHERE id=$1 FOR UPDATE`, [eventId]);
    if (existing.rowCount > 0) {
      console.log('Already exists, deduped:', existing.rows[0]);
      await client.query('COMMIT');
      return { deduped: true, applied: existing.rows[0].applied };
    }

    // insert ledger row
    await client.query(
      `INSERT INTO public.stripe_webhook_events (id, type, event_type, livemode, object_id, object_type, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [eventId, 'charge.succeeded', 'charge.succeeded', false, null, null]
    );

    // store run_id on ledger
    await client.query(`UPDATE public.stripe_webhook_events SET run_id=$2 WHERE id=$1`, [eventId, runId]);

    // lock run row
    const runRes = await client.query(`SELECT * FROM public.runs WHERE id=$1 FOR UPDATE`, [runId]);
    if (runRes.rowCount === 0) {
      throw new Error('Missing run');
    }

    console.log('Locked run row, now simulating crash...');
    throw new Error('Simulated crash after run lock');
  } catch (e) {
    await client.query('ROLLBACK');
    console.log('First attempt error (expected):', e.message);
    return { error: e.message };
  }
}

async function retryAttempt(client, eventId, runId) {
  try {
    await client.query('BEGIN');
    // dedupe check
    const existing = await client.query(`SELECT id, applied FROM public.stripe_webhook_events WHERE id=$1 FOR UPDATE`, [eventId]);
    if (existing.rowCount > 0) {
      console.log('Retry found existing ledger row:', existing.rows[0]);
      // if already applied, nothing to do
      if (existing.rows[0].applied) {
        await client.query('COMMIT');
        return { applied: true };
      }
      // otherwise we proceed to reapply
    } else {
      // insert ledger if missing
      await client.query(
        `INSERT INTO public.stripe_webhook_events (id, type, event_type, livemode, object_id, object_type, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [eventId, 'charge.succeeded', 'charge.succeeded', false, null, null]
      );
    }

    // ensure run exists and lock
    const runRes = await client.query(`SELECT * FROM public.runs WHERE id=$1 FOR UPDATE`, [runId]);
    if (runRes.rowCount === 0) throw new Error('Missing run on retry');

    // perform reconciliation action: set payment_status = 'captured' and set a fake charge_id
    const fakeCharge = 'ch_test_recovery_123';
    await client.query(`UPDATE public.runs SET charge_id=$2, payment_status='captured' WHERE id=$1`, [runId, fakeCharge]);

    // mark ledger applied
    await client.query(
      `UPDATE public.stripe_webhook_events SET applied=true, applied_at=NOW(), apply_notes=$2 WHERE id=$1`,
      [eventId, JSON.stringify({ applied_by: 'test_retry' })]
    );

    await client.query('COMMIT');
    console.log('Retry applied successfully');
    return { applied: true };
  } catch (e) {
    await client.query('ROLLBACK');
    console.log('Retry attempt failed:', e.message);
    return { error: e.message };
  }
}

(async () => {
  const eventId = 'evt_crash_test_12345';
  const client = await pool.connect();
  try {
    // pick a run id
    const r = await pool.query('SELECT id FROM public.runs ORDER BY id DESC LIMIT 1');
    if (r.rowCount === 0) {
      console.error('No runs found in DB; create a run first');
      process.exit(1);
    }
    const runId = r.rows[0].id;
    console.log('Using run id:', runId);


    // ensure no prior ledger row
    await pool.query('DELETE FROM public.stripe_webhook_events WHERE id=$1', [eventId]);

    // PHASE 1: persist ledger row (commit immediately)
    await pool.query(
      `INSERT INTO public.stripe_webhook_events (id, type, event_type, livemode, object_id, object_type, created_at, applied)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(), false)
       ON CONFLICT (id) DO NOTHING`,
      [eventId, 'charge.succeeded', 'charge.succeeded', false, null, null]
    );

    console.log('Ledger row persisted (phase1)');

    // First attempt: simulate crash during Phase 2 after locking event/run
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT id, applied FROM public.stripe_webhook_events WHERE id=$1 FOR UPDATE`, [eventId]);
      // store run_id on ledger
      await c.query(`UPDATE public.stripe_webhook_events SET run_id=$2 WHERE id=$1`, [eventId, runId]);
      // lock run row
      const runRes = await c.query(`SELECT * FROM public.runs WHERE id=$1 FOR UPDATE`, [runId]);
      if (runRes.rowCount === 0) throw new Error('Missing run');

      console.log('Locked event and run row, now simulating crash...');
      throw new Error('Simulated crash during apply');
    } catch (e) {
      await c.query('ROLLBACK');
      c.release();
      console.log('Simulated crash occurred as expected:', e.message);
      // best-effort: record apply_error so operators can see failure
      try {
        await pool.query(`UPDATE public.stripe_webhook_events SET apply_error=$2 WHERE id=$1`, [eventId, String(e?.message ?? e)]);
      } catch (ee) {}
    }

    // Check ledger row after crash
    const after = await pool.query('SELECT id, run_id, applied, apply_error FROM public.stripe_webhook_events WHERE id=$1', [eventId]);
    console.log('Ledger row after crash attempt:', after.rows);

    // Second attempt: retry processing using a fresh client
    const c2 = await pool.connect();
    const retry = await retryAttempt(c2, eventId, runId);

    // Inspect ledger and run after retry
    const finalLedger = await pool.query('SELECT id, run_id, applied, apply_notes, applied_at FROM public.stripe_webhook_events WHERE id=$1', [eventId]);
    const runRow = await pool.query('SELECT id, charge_id, payment_status FROM public.runs WHERE id=$1', [runId]);
    console.log('Final ledger row:', finalLedger.rows);
    console.log('Run row:', runRow.rows);
  } finally {
    client.release();
    await pool.end();
  }
})();
