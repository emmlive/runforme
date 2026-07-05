import "./RunnerCommandCenter.css";

function getDisplayTitle(run) {
  return run?.title || run?.storeName || run?.pickupName || run?.id || "Run details";
}

function getDisplayDetail(run) {
  const parts = [
    run?.pickupAddress || run?.pickupLocation || run?.storeAddress,
    run?.dropoffAddress || run?.destinationAddress,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" → ");
  }

  return run?.notes || run?.instructions || "Run details will appear here when a request is selected.";
}

export default function RunnerRunCard({
  run,
  title = "Focused run",
  statusLabel = "Preview",
  firstLabel = "Route",
  firstValue,
  secondLabel = "Readiness",
  secondValue = "Awaiting selection",
}) {
  const displayTitle = run ? getDisplayTitle(run) : title;
  const displayDetail = run ? getDisplayDetail(run) : "Select an available or active run to review the key handoff details.";

  return (
    <section className="runner-run-card" aria-label={displayTitle}>
      <div className="runner-run-card__header">
        <div>
          <p className="runner-run-card__title">{displayTitle}</p>
          <p className="runner-run-card__meta">{title}</p>
        </div>
        <span className="runner-run-card__status">{run?.status || run?.state || statusLabel}</span>
      </div>

      <p className="runner-run-card__detail">{displayDetail}</p>

      <div className="runner-run-card__footer">
        <div className="runner-run-card__footer-item">
          <p className="runner-run-card__footer-label">{firstLabel}</p>
          <p className="runner-run-card__footer-value">{firstValue || "Pending"}</p>
        </div>
        <div className="runner-run-card__footer-item">
          <p className="runner-run-card__footer-label">{secondLabel}</p>
          <p className="runner-run-card__footer-value">{secondValue}</p>
        </div>
      </div>
    </section>
  );
}
