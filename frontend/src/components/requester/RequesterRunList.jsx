import "./RequesterCommandCenter.css";

function getRunTitle(run, fallback) {
  return run?.title || run?.description || run?.pickupName || run?.storeName || run?.id || fallback;
}

function getRunMeta(run) {
  return run?.status || run?.state || "ready";
}

function getRunDetail(run) {
  const parts = [
    run?.pickupAddress || run?.pickupLocation || run?.storeAddress,
    run?.dropoffAddress || run?.deliveryAddress || run?.destinationAddress,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" → ");
  }

  return run?.notes || run?.instructions || "Run details will appear as this request moves forward.";
}

export default function RequesterRunList({
  title,
  emptyMessage,
  runs = [],
  limit = 3,
}) {
  const visibleRuns = Array.isArray(runs) ? runs.slice(0, limit) : [];

  return (
    <section className="requester-run-list" aria-label={title}>
      <div className="requester-run-list__header">
        <p className="requester-run-list__title">{title}</p>
        <span className="requester-run-list__count">{Array.isArray(runs) ? runs.length : 0}</span>
      </div>

      {visibleRuns.length > 0 ? (
        <div className="requester-run-list__items">
          {visibleRuns.map((run, index) => (
            <article className="requester-run-list__item" key={run?.id || `${title}-${index}`}>
              <div>
                <p className="requester-run-list__item-title">{getRunTitle(run, `Run ${index + 1}`)}</p>
                <p className="requester-run-list__item-detail">{getRunDetail(run)}</p>
              </div>
              <span className="requester-run-list__status">{getRunMeta(run)}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="requester-run-list__empty">{emptyMessage}</p>
      )}
    </section>
  );
}
