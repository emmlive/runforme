import "./ui.css";

const stateClass = {
  complete: "complete",
  active: "active",
  pending: "pending",
  blocked: "blocked",
};

const stateIcon = {
  complete: "✓",
  active: "•",
  pending: "○",
  blocked: "!",
};

export default function TrustCheckpoint({
  label,
  detail,
  state = "pending",
  icon,
  className = "",
  ...props
}) {
  const safeState = stateClass[state] || "pending";
  const classes = [
    "rf-trust-checkpoint",
    `rf-trust-checkpoint--${safeState}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      <span className="rf-trust-checkpoint__marker" aria-hidden="true">
        {icon || stateIcon[safeState]}
      </span>
      <div>
        <p className="rf-trust-checkpoint__label">{label}</p>
        {detail && <p className="rf-trust-checkpoint__detail">{detail}</p>}
      </div>
    </div>
  );
}
