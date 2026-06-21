const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const pool = require("../config/db");

/*
  STRIPE WEBHOOK — PRODUCTION GRADE
  - Signature verification
  - Idempotent dedupe
  - Financial reconciliation
  - Safe for retries
*/

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log("🔑 Webhook secret loaded:", !!webhookSecret);
    console.log("🧾 Stripe signature header present:", !!sig);

    let event;

    /* 1️⃣ Verify signature */
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error("❌ WEBHOOK SIGNATURE FAILED:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    /* 2️⃣ Deduplicate event */
    try {
      await pool.query(
        `
        INSERT INTO public.stripe_webhook_events (id, type)
        VALUES ($1, $2)
        ON CONFLICT (id) DO NOTHING
        `,
        [event.id, event.type]
      );
    } catch (err) {
      console.error("❌ WEBHOOK DEDUPE ERROR:", err.message);
      return res.status(500).json({ error: "Webhook DB error" });
    }

    console.log("✅ Stripe webhook accepted:", event.type);

    /* 3️⃣ Financial Reconciliation Engine */
    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const pi = event.data.object;

          await pool.query(
            `
            UPDATE runs
            SET payment_status = 'captured'
            WHERE payment_intent_id = $1
              AND payment_status = 'authorized'
            `,
            [pi.id]
          );

          console.log("💰 Reconciled payment_intent.succeeded:", pi.id);
          break;
        }

        case "charge.succeeded": {
          const charge = event.data.object;

          await pool.query(
            `
            UPDATE runs
            SET charge_id = $1
            WHERE payment_intent_id = $2
              AND charge_id IS NULL
            `,
            [charge.id, charge.payment_intent]
          );

          console.log("💳 Reconciled charge.succeeded:", charge.id);
          break;
        }

        case "transfer.created": {
          const transfer = event.data.object;

          await pool.query(
            `
            UPDATE runs
            SET transfer_id = $1,
                transfer_status = 'created',
                payment_status = 'paid'
            WHERE charge_id = $2
            `,
            [transfer.id, transfer.source_transaction]
          );

          console.log("🚚 Reconciled transfer.created:", transfer.id);
          break;
        }

        case "transfer.reversed": {
          const reversal = event.data.object;

          await pool.query(
            `
            UPDATE runs
            SET transfer_status = 'reversed'
            WHERE transfer_id = $1
            `,
            [reversal.transfer]
          );

          console.log("↩️ Reconciled transfer.reversed:", reversal.id);
          break;
        }

        case "charge.refunded": {
          const charge = event.data.object;

          await pool.query(
            `
            UPDATE runs
            SET payment_status = 'refunded'
            WHERE charge_id = $1
            `,
            [charge.id]
          );

          console.log("💸 Reconciled charge.refunded:", charge.id);
          break;
        }

        default:
          console.log("ℹ️ Unhandled Stripe event:", event.type);
      }
    } catch (err) {
      console.error("❌ WEBHOOK RECON ERROR:", err.message);
      return res.status(500).json({ error: "Reconciliation error" });
    }

    /* 4️⃣ Always ACK Stripe */
    res.json({ received: true });
  }
);

module.exports = router;
