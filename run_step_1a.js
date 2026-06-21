const pool = require('./src/config/db');
(async () => {
  try {
    const cols = ['charge_id','transfer_id','transfer_status'];
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='runs' AND table_schema='public' AND column_name = ANY($1)`,
      [cols]
    );
    const existing = res.rows.map(r => r.column_name);
    const missing = cols.filter(c => !existing.includes(c));

    if (missing.length === 0) {
      console.log('Already existed');
      process.exit(0);
    }

    for (const c of missing) {
      await pool.query(`ALTER TABLE runs ADD COLUMN IF NOT EXISTS ${c} TEXT`);
    }

    console.log('Columns added');
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(1);
  }
})();
