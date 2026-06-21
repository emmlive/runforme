const pool = require('../src/config/db');
(async () => {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='stripe_webhook_events' ORDER BY ordinal_position");
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
