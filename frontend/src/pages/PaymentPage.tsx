import { useState } from "react";
import {
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

type Props = {
  clientSecret: string;
  runId: number;
  onAuthorized: (runId: number) => Promise<void> | void;
  onCancel?: () => void;
};

export default function PaymentPage({
  clientSecret,
  runId,
  onAuthorized,
  onCancel,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const submitDisabled = !stripe || loading;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const card = elements.getElement(CardElement);

      if (!card) {
        setError("Card element not found");
        return;
      }

      const result = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card,
          },
        }
      );

      if (result.error) {
        setError(
          result.error.message ||
            "Payment authorization failed"
        );
        return;
      }

      if (result.paymentIntent?.status === "requires_capture") {
        await onAuthorized(runId);
        setSuccess(true);
      } else {
        setError("Unexpected payment status");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment authorization failed"
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Payment authorized</h2>
        <p>
          Your secure hold is authorized and the run
          can continue.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ padding: 20, maxWidth: 400 }}
    >
      <h2>Confirm secure hold</h2>

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
        <div
          role="alert"
          style={{
            color: "red",
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        style={{
          width: "100%",
          padding: 12,
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: submitDisabled ? "not-allowed" : "pointer",
          opacity: submitDisabled ? 0.55 : 1,
        }}
      >
        {loading
          ? "Authorizing..."
          : "Authorize secure hold"}
      </button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 8,
            background: "transparent",
            border: "1px solid #cbd5e1",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      )}
    </form>
  );
}