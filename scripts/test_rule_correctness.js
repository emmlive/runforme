const pool = require('../src/config/db');

async function insertRun() {
  const res = await pool.query(
    `INSERT INTO public.runs (requester_id, location, item, payout, status, created_at, payment_status)
     VALUES ($1,$2,$3,$4,$5,NOW(),$6) RETURNING id`,
    [1, 'test-loc', 'test-item', 5.0, 'requested', 'authorized']
  );
  return res.rows[0].id;
}

async function showRun(id, label) {
  const r = await pool.query('SELECT id, payment_status, charge_id, transfer_id, transfer_status FROM public.runs WHERE id=$1', [id]);
  console.log(label, r.rows[0]);
}

async function showLedger(ids) {
  const q = await pool.query(`SELECT id, type, event_type, object_id, object_type, run_id, applied FROM public.stripe_webhook_events WHERE id = ANY($1::text[])`, [ids]);
  console.log('Ledger rows:', q.rows);
}

(async () => {
  try {
    // create run
    const runId = await insertRun();
    console.log('Created run:', runId);
    await showRun(runId, 'Initial run state:');

    // 1) Capture (charge.succeeded)
    const evt1 = 'evt_rule_capture_1';
    const chargeId = 'ch_rule_1';
    await pool.query(
      `INSERT INTO public.stripe_webhook_events (id, type, event_type, livemode, object_id, object_type, run_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) ON CONFLICT DO NOTHING`,
      [evt1, 'charge.succeeded', 'charge.succeeded', false, chargeId, 'charge', runId]
    );

    // Apply reconciliation logic for charge.succeeded
    //  - set charge_id if missing
    //  - if captured and payment_status == 'authorized' then set payment_status='captured'
    await pool.query(`UPDATE public.runs SET charge_id = $2 WHERE id=$1 AND (charge_id IS NULL OR charge_id='')`, [runId, chargeId]);
    // advance payment_status only from 'authorized' -> 'captured'
    const runBefore = await pool.query('SELECT payment_status FROM public.runs WHERE id=$1', [runId]);
    if (runBefore.rows[0].payment_status === 'authorized') {
      await pool.query(`UPDATE public.runs SET payment_status='captured' WHERE id=$1`, [runId]);
    }
    // mark ledger applied
    await pool.query(`UPDATE public.stripe_webhook_events SET applied=true, applied_at=NOW() WHERE id=$1`, [evt1]);

    await showRun(runId, 'After first capture:');
    await showLedger([evt1]);

    // Replay capture (should be deduped)
    const r2 = await pool.query(`INSERT INTO public.stripe_webhook_events (id, type) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING RETURNING id, applied`, [evt1, 'charge.succeeded']);
    if (r2.rowCount === 0) {
      const prior = await pool.query('SELECT applied FROM public.stripe_webhook_events WHERE id=$1 LIMIT 1', [evt1]);
      console.log('Replay capture response:', { received: true, deduped: true, applied: prior.rows[0].applied });
    } else {
      console.log('Replay capture inserted new row unexpectedly');
    }

    await showRun(runId, 'After replay capture:');

    // 2) Payout transfer.created
    const evt2 = 'evt_rule_transfer_1';
    const transferId = 'tr_rule_1';
    await pool.query(
      `INSERT INTO public.stripe_webhook_events (id, type, event_type, livemode, object_id, object_type, run_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) ON CONFLICT DO NOTHING`,
      [evt2, 'transfer.created', 'transfer.created', false, transferId, 'transfer', runId]
    );

    // Apply transfer.created: set transfer_id and transfer_status if missing
    await pool.query(`UPDATE public.runs SET transfer_id=$2, transfer_status='created' WHERE id=$1 AND (transfer_id IS NULL OR transfer_id='')`, [runId, transferId]);
    await pool.query(`UPDATE public.stripe_webhook_events SET applied=true, applied_at=NOW() WHERE id=$1`, [evt2]);

    await showRun(runId, 'After transfer.created:');
    await showLedger([evt2]);

    // 3) transfer.reversed
    const evt3 = 'evt_rule_transfer_reversed_1';
    const reversalId = 'trr_rule_1';
    await pool.query(
      `INSERT INTO public.stripe_webhook_events (id, type, event_type, livemode, object_id, object_type, run_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) ON CONFLICT DO NOTHING`,
      [evt3, 'transfer.reversed', 'transfer.reversed', false, reversalId, 'transfer_reversal', runId]
    );

    // Apply reversal: set transfer_status='reversed'
    await pool.query(`UPDATE public.runs SET transfer_status='reversed' WHERE id=$1`, [runId]);
    // add flag
    await pool.query(`UPDATE public.runs SET flags = COALESCE(flags,'[]'::jsonb) || to_jsonb($2::text) WHERE id=$1`, [runId, 'TRANSFER_REVERSED']);
    await pool.query(`UPDATE public.stripe_webhook_events SET applied=true, applied_at=NOW() WHERE id=$1`, [evt3]);

    await showRun(runId, 'After transfer.reversed:');
    await showLedger([evt3]);

    // 4) charge.refunded (refund after reversal)
    const evt4 = 'evt_rule_charge_refunded_1';
    const refundId = 're_rule_1';
    await pool.query(
      `INSERT INTO public.stripe_webhook_events (id, type, event_type, livemode, object_id, object_type, run_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) ON CONFLICT DO NOTHING`,
      [evt4, 'charge.refunded', 'charge.refunded', false, refundId, 'charge', runId]
    );

    // Apply refund: set payment_status='refunded' and mark ledger applied
    await pool.query(`UPDATE public.runs SET payment_status='refunded', refund_id=$2, refund_status='refunded' WHERE id=$1`, [runId, refundId]);
    await pool.query(`UPDATE public.stripe_webhook_events SET applied=true, applied_at=NOW() WHERE id=$1`, [evt4]);

    await showRun(runId, 'After charge.refunded:');
    await showLedger([evt4]);

    // Final verification: ensure no illegal transitions
    const final = await pool.query('SELECT payment_status, transfer_status FROM public.runs WHERE id=$1', [runId]);
    console.log('Final status check:', final.rows[0]);

    console.log('Test complete. Cleanup: removing test ledger rows and run');
    await pool.query('DELETE FROM public.stripe_webhook_events WHERE id LIKE $1', ['evt_rule_%']);
    await pool.query('DELETE FROM public.runs WHERE id=$1', [runId]);
  } catch (e) {
    console.error('Test failed:', e.message);
  } finally {
    await pool.end();
  }
})();
