import { loadStripe as loadStripeSdk } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { initializeStripe } from "./lib/stripeInitialization.js";

const loadStripe = (publishableKey) =>
  initializeStripe({
    disableValue: import.meta.env.VITE_DISABLE_STRIPE,
    publishableKey,
    loadStripe: loadStripeSdk,
  });

const stripePromise = loadStripe("pk_test_51SnpJaGkdoJpfMnu4RxpFkuvTI4taLLZPwH4NmBgJGAU7tRxJSu38x2ZTgmRkJii9UIGu1R0zlnDoPosIHgH9Dgn00KFfQJRcS");

export default function StripeWrapper({ children }) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}
