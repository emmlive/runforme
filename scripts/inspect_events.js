require('dotenv').config();
const pool = require('../src/config/db');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

(async () => {
  try {
    const res = await pool.query("SELECT id, type, created_at FROM public.stripe_webhook_events ORDER BY created_at DESC LIMIT 20");
    const rows = res.rows;
    const out = [];
    for (const r of rows) {
      try {
        const ev = await stripe.events.retrieve(r.id);
        const obj = ev.data && ev.data.object ? ev.data.object : null;
        out.push({ db_id: r.id, type: r.type, created_at: r.created_at, stripe_id: ev.id, object_type: obj ? obj.object : null, object_id: obj ? obj.id : null, payment_intent: obj ? obj.payment_intent || null : null, source_transaction: obj ? obj.source_transaction || null : null });
      } catch (e) {
        out.push({ db_id: r.id, type: r.type, created_at: r.created_at, error: e.message });
      }
    }
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
