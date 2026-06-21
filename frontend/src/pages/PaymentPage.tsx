import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Props = {
  clientSecret: string;
  runId: number;
};

export default function PaymentPage({ clientSecret, runId }: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  ////////////////////////////////////////////////////////
  // HANDLE PAYMENT CONFIRMATION
  ////////////////////////////////////////////////////////

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const card = elements.getElement(CardElement);

    if (!card) {
      setError("Card element not found");
      setLoading(false);
      return;
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
      },
    });

    ////////////////////////////////////////////////////////
    // HANDLE RESULT
    ////////////////////////////////////////////////////////

    if (result.error) {
      setError(result.error.message || "Payment failed");
      setLoading(false);
      return;
    }

    if (result.paymentIntent?.status === "requires_capture") {
      // ✅ SUCCESS (matches your backend flow)
      setSuccess(true);
    } else {
      setError("Unexpected payment status");
    }

    setLoading(false);
  };

  ////////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////////

  if (success) {
    return (
      <div style={{ padding: 20 }}>
        <h2>✅ Payment Authorized</h2>
        <p>Your runner will begin shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20, maxWidth: 400 }}>
      <h2>Confirm Payment</h2>

      <div
        style={{
          border: "1px solid #ddd",
          padding: 12,
          borderRadius: 6,
          marginBottom: 12,
        }}
      >
        <CardElement />
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: 10 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: "100%",
          padding: 12,
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        {loading ? "Processing..." : "Pay"}
      </button>
    </form>
  );
}