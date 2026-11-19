const PULSE_CHOICES = [
  { value: "closer_to_me", label: "Closer to me" },
  { value: "better_value", label: "Better value for the trip" },
  { value: "better_timing", label: "Better timing" },
  { value: "different_errand", label: "Different kind of errand" },
  { value: "done_for_now", label: "I’m done for now" },
  { value: "something_else", label: "Something else" },
];

export default function RunnerPulseSheet({
  open,
  onSelect,
  onDismiss,
  busy = false,
}) {
  if (!open) return null;

  return (
    <div
      className="runner-pulse-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "18px",
        background: "rgba(2, 6, 23, 0.58)",
        backdropFilter: "blur(8px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="runner-pulse-title"
        aria-describedby="runner-pulse-description"
        className="runner-pulse-sheet"
        style={{
          width: "min(560px, 100%)",
          maxHeight: "min(82vh, 720px)",
          overflowY: "auto",
          borderRadius: "28px",
          border: "1px solid rgba(255,255,255,0.18)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
          boxShadow: "0 28px 90px rgba(2,6,23,0.32)",
          padding: "22px",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            marginBottom: 12,
            padding: "7px 11px",
            borderRadius: 999,
            background: "#eff6ff",
            color: "#1d4ed8",
            fontSize: 12,
            fontWeight: 850,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          RUNFORME Pulse
        </div>

        <h2
          id="runner-pulse-title"
          style={{
            margin: 0,
            fontSize: "clamp(1.5rem, 5vw, 2rem)",
            lineHeight: 1.06,
            letterSpacing: "-0.04em",
          }}
        >
          Let’s find a better fit.
        </h2>

        <p
          id="runner-pulse-description"
          style={{
            margin: "10px 0 18px",
            color: "#64748b",
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          You’ve passed on a few runs. What would make the next one work better for you?
        </p>

        <div
          className="runner-pulse-options"
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {PULSE_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              disabled={busy}
              onClick={() => onSelect?.(choice.value)}
              style={{
                minHeight: 48,
                width: "100%",
                padding: "12px 14px",
                borderRadius: 15,
                border: "1px solid rgba(15,23,42,0.1)",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: 14,
                fontWeight: 800,
                textAlign: "left",
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onDismiss?.()}
          style={{
            marginTop: 14,
            minHeight: 44,
            width: "100%",
            border: 0,
            borderRadius: 14,
            background: "transparent",
            color: "#64748b",
            fontSize: 14,
            fontWeight: 800,
            cursor: busy ? "default" : "pointer",
          }}
        >
          Not now
        </button>
      </section>
    </div>
  );
}

export { PULSE_CHOICES };
