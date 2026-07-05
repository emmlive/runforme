import "./ui.css";

const variantClass = {
  primary: "primary",
  secondary: "secondary",
  trust: "trust",
  success: "success",
  warning: "warning",
  danger: "danger",
};

const sizeClass = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  ...props
}) {
  const classes = [
    "rf-button",
    `rf-button--${variantClass[variant] || "primary"}`,
    `rf-button--${sizeClass[size] || "md"}`,
    fullWidth ? "rf-button--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? "Working..." : children}
    </button>
  );
}
