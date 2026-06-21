const pool = require('../src/config/db');

(async () => {
  const id = process.argv[2] || '13';
  try {
    const res = await pool.query(
      `SELECT id, status, runner_id, payment_status FROM runs WHERE id = $1`,
      [id]
    );
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
