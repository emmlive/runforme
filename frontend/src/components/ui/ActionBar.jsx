import "./ui.css";

export default function ActionBar({
  children,
  sticky = false,
  className = "",
  ...props
}) {
  const classes = [
    "rf-action-bar",
    sticky ? "rf-action-bar--sticky" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
