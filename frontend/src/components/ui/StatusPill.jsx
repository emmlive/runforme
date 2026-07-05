import "./ui.css";

const toneClass = {
  neutral: "neutral",
  trust: "trust",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export default function StatusPill({
  children,
  tone = "neutral",
  className = "",
  ...props
}) {
  const classes = [
    "rf-status-pill",
    `rf-status-pill--${toneClass[tone] || "neutral"}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
