import "./ui.css";

const toneClass = {
  neutral: "neutral",
  trust: "trust",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export default function Badge({
  children,
  tone = "neutral",
  className = "",
  ...props
}) {
  const classes = [
    "rf-badge",
    `rf-badge--${toneClass[tone] || "neutral"}`,
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
