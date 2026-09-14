const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const prisma = require("../config/db");
const {
  reconcileStripeEvent,
} = require("../services/stripeWebhookReconciler");

/*
  Stripe webhook boundary:
  - raw application/json body preserved for signature verification;
  - invalid signatures fail closed;
  - financial reconciliation is delegated to the canonical Prisma service;
  - unsupported valid events are acknowledged without financial mutation.
*/

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error(
        "Stripe webhook signature verification failed:",
        err.message
      );

      return res
        .status(400)
        .send(`Webhook Error: ${err.message}`);
    }

    try {
      const reconciliation =
        await reconcileStripeEvent({
          event,
          prisma,
        });

      return res.json({
        received: true,
        deduped: reconciliation.deduped,
        applied: reconciliation.applied,
      });
    } catch (err) {
      console.error(
        "Stripe webhook reconciliation failed:",
        err.message
      );

      return res.status(500).json({
        error: "Reconciliation error",
      });
    }
  }
);

module.exports = router;