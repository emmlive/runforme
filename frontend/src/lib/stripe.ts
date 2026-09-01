import { loadStripe } from "@stripe/stripe-js";
import { initializeStripe } from "./stripeInitialization.js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripeDisabled = import.meta.env.VITE_DISABLE_STRIPE === "true";

if (!stripeDisabled && !publishableKey) {
  throw new Error("VITE_STRIPE_PUBLISHABLE_KEY is not set");
}

export const stripePromise = initializeStripe({
  disableValue: import.meta.env.VITE_DISABLE_STRIPE,
  publishableKey,
  loadStripe,
});
