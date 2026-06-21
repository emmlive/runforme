import { useState } from "react";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "../stripe";

function CheckoutForm({ clientSecret, runId, token, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    try {
      if (!stripe || !elements) {
        console.warn("⚠️ Stripe not ready");
        return;
      }

      if (!clientSecret) {
        alert("Missing payment session. Please retry.");
        return;
      }

      setLoading(true);

      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        alert("Card input not ready");
        setLoading(false);
        return;
      }

      console.log("💳 Confirming payment...");

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        console.error("❌ Stripe error:", result.error.message);
        alert(result.error.message);
        setLoading(false);
        return;
      }

      const pi = result.paymentIntent;

      console.log("💳 PaymentIntent result:", pi);

      ////////////////////////////////////////////////////////
      // 🔥 HANDLE ALL POSSIBLE STATUSES
      ////////////////////////////////////////////////////////

      if (pi.status === "requires_capture") {
        console.log("✅ Payment authorized");

        await fetch("http://localhost:5050/api/payments/mark-authorized", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ runId }),
        });

        alert("Payment authorized ✅");

        if (onSuccess) onSuccess();

      } else if (pi.status === "succeeded") {
        // fallback (in case Stripe auto-captures in future)
        console.log("⚠️ Payment already captured");

        alert("Payment completed");

        if (onSuccess) onSuccess();

      } else if (pi.status === "processing") {
        console.warn("⚠️ Payment processing...");
        alert("Payment processing. Please wait.");

      } else if (pi.status === "requires_payment_method") {
        console.warn("❌ Payment failed — try another card");
        alert("Payment failed. Try another card.");

      } else {
        console.warn("⚠️ Unknown status:", pi.status);
        alert(`Unexpected status: ${pi.status}`);
      }

      setLoading(false);

    } catch (err) {
      console.error("❌ Payment exception:", err);
      alert("Payment failed unexpectedly");
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <CardElement />
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          padding: "10px 16px",
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {loading ? "Processing..." : "Pay"}
      </button>
    </div>
  );
}

export default function PaymentModal({
  clientSecret,
  runId,
  token,
  onSuccess,
}) {
  if (!clientSecret) {
    return (
      <div style={{ padding: 16 }}>
        ⚠️ Payment session not ready
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        clientSecret={clientSecret}
        runId={runId}
        token={token}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}