import "./ui.css";

export default function TrustBadge({
  children = "Protected by RUNFORME",
  icon = "🛡",
  className = "",
  ...props
}) {
  const classes = ["rf-trust-badge", className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...props}>
      <span aria-hidden="true">{icon}</span>
      {children}
    </span>
  );
}
