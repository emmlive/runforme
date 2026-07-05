import "./ui.css";

export default function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = "",
  ...props
}) {
  const classes = ["rf-section-header", className].filter(Boolean).join(" ");

  return (
    <header className={classes} {...props}>
      <div>
        {eyebrow && <p className="rf-section-header__eyebrow">{eyebrow}</p>}
        {title && <h2 className="rf-section-header__title">{title}</h2>}
        {description && (
          <p className="rf-section-header__description">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}
