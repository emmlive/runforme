import "./ui.css";

export default function EmptyState({
  icon = "↗",
  title = "Nothing here yet",
  description = "When activity starts, it will appear here.",
  action = null,
  className = "",
  ...props
}) {
  const classes = ["rf-empty-state", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      <div className="rf-empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="rf-empty-state__title">{title}</h3>
      <p className="rf-empty-state__description">{description}</p>
      {action}
    </div>
  );
}
