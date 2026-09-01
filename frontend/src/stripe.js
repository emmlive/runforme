import { loadStripe } from "@stripe/stripe-js";
import { initializeStripe } from "./lib/stripeInitialization.js";

export const stripePromise = initializeStripe({
  disableValue: import.meta.env.VITE_DISABLE_STRIPE,
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  loadStripe,
});
