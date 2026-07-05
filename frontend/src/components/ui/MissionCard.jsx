import "./ui.css";
import Card from "./Card";
import StatusPill from "./StatusPill";
import TrustBadge from "./TrustBadge";

export default function MissionCard({
  title = "Run mission",
  subtitle,
  status,
  statusTone = "neutral",
  trustLabel,
  children,
  actions,
  className = "",
  ...props
}) {
  const classes = ["rf-mission-card", className].filter(Boolean).join(" ");

  return (
    <Card tone="soft" elevated className={classes} {...props}>
      <div className="rf-mission-card__header">
        <div>
          {trustLabel && <TrustBadge>{trustLabel}</TrustBadge>}
          <h3 className="rf-mission-card__title">{title}</h3>
          {subtitle && <p className="rf-mission-card__subtitle">{subtitle}</p>}
        </div>

        {status && <StatusPill tone={statusTone}>{status}</StatusPill>}
      </div>

      {children}

      {actions && <div className="rf-mission-card__actions">{actions}</div>}
    </Card>
  );
}
