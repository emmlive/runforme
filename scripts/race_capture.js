const { exec } = require('child_process');

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout && stdout.trim(), stderr: stderr && stderr.trim() });
    });
  });
}

(async () => {
  console.log('1) Creating a new run (uses test PM pm_card_visa)');
  const createCmd = `curl -sS -X POST http://localhost:5050/runs -H "Content-Type: application/json" -d '{"requester_id":1,"location":"Race Test","item":"capture-race","payout":"3.00","payment_method_id":"pm_card_visa"}'`;
  const create = await run(createCmd);
  if (create.err || !create.stdout) {
    console.error('Create run failed', create.err || create.stderr);
    process.exit(2);
  }

  let body;
  try {
    body = JSON.parse(create.stdout);
  } catch (e) {
    console.error('Failed to parse create response:', create.stdout);
    process.exit(2);
  }

  if (!body.run || !body.run.id) {
    console.error('Create run did not return run id:', body);
    process.exit(2);
  }

  const runId = body.run.id;
  console.log('Created run id:', runId, 'payment_intent:', body.payment_intent && body.payment_intent.id);

  console.log('2) Sending two concurrent capture requests for run', runId);
  const captureCmd = `curl -sS -X POST http://localhost:5050/runs/${runId}/capture -H \"Content-Type: application/json\" -d '{}'`;

  const [r1, r2] = await Promise.all([run(captureCmd), run(captureCmd)]);

  console.log('\n--- Response A ---');
  console.log('stdout:', r1.stdout || '<no stdout>');
  if (r1.stderr) console.log('stderr:', r1.stderr);

  console.log('\n--- Response B ---');
  console.log('stdout:', r2.stdout || '<no stdout>');
  if (r2.stderr) console.log('stderr:', r2.stderr);

  console.log('\n3) Done. Now fetch run record to verify charge_id and payment_status');
  const checkCmd = `node scripts/check_run_id.js ${runId}`;
  const check = await run(checkCmd);
  console.log('\n--- Run Row ---');
  console.log(check.stdout || check.stderr || '<no output>');

  process.exit(0);
})();
