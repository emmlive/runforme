const express = require("express");
const router = express.Router();
const {
  assertPaymentRuntimeAuthorized,
} = require("../services/paymentRuntimeGuard");

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
    try {
      assertPaymentRuntimeAuthorized({
        nodeEnv: process.env.NODE_ENV,
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        livePaymentsAuthorized:
          process.env.RUNFORME_LIVE_PAYMENTS_AUTHORIZED,
      });
    } catch (err) {
      console.error(
        "Stripe webhook payment runtime authorization failed:",
        err.message
      );

      return res.status(503).json({
        error: "Payment runtime unavailable",
      });
    }

    const stripe = require("stripe")(
      process.env.STRIPE_SECRET_KEY
    );

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


/*
  Stripe Connect webhook boundary:
  - dedicated signing secret for connected-account events;
  - same canonical reconciler and Prisma idempotency ledger;
  - no payout execution occurs here.
*/
router.post(
  "/stripe-connect",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      assertPaymentRuntimeAuthorized({
        nodeEnv: process.env.NODE_ENV,
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        livePaymentsAuthorized:
          process.env.RUNFORME_LIVE_PAYMENTS_AUTHORIZED,
      });
    } catch (err) {
      console.error(
        "Stripe Connect webhook payment runtime authorization failed:",
        err.message
      );

      return res.status(503).json({
        error: "Payment runtime unavailable",
      });
    }

    const stripe = require("stripe")(
      process.env.STRIPE_SECRET_KEY
    );

    const sig = req.headers["stripe-signature"];
    const webhookSecret =
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "Stripe Connect webhook secret is not configured"
      );

      return res.status(503).json({
        error: "Connect webhook unavailable",
      });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error(
        "Stripe Connect webhook signature verification failed:",
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
        "Stripe Connect webhook reconciliation failed:",
        err.message
      );

      return res.status(500).json({
        error: "Reconciliation error",
      });
    }
  }
);

module.exports = router;