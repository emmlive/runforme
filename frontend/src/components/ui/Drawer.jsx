import "./ui.css";

export default function Drawer({
  open = false,
  title = "Details",
  children,
  footer,
  onClose,
  className = "",
  ...props
}) {
  const classes = [
    "rf-drawer-shell",
    open ? "rf-drawer-shell--open" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-hidden={!open} {...props}>
      <button
        type="button"
        className="rf-drawer-scrim"
        aria-label="Close drawer"
        onClick={onClose}
      />

      <section
        className="rf-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="rf-drawer__header">
          <h2 className="rf-drawer__title">{title}</h2>
          <button
            type="button"
            className="rf-drawer__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div>{children}</div>

        {footer && <div className="rf-drawer__footer">{footer}</div>}
      </section>
    </div>
  );
}
