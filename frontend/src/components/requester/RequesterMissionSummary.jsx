import "./RequesterCommandCenter.css";

function getRunState(run) {
  return String(run?.status || run?.state || "").toLowerCase();
}

function isClosedRun(run) {
  const state = getRunState(run);
  return state.startsWith("comp") || ["done", "closed", "cancelled", "canceled"].includes(state);
}

function formatMetric(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function RequesterMissionSummary({
  activeRun = null,
  activeRuns = [],
  historyRuns = [],
  title = "Your requests, in one place.",
  copy = "Track active runs, funding protection, delivery proof, and completed history.",
}) {
  const activeCount = activeRuns.length || (activeRun && !isClosedRun(activeRun) ? 1 : 0);
  const historyCount = historyRuns.length;
  const holdState = activeRun?.authorizationStatus || activeRun?.holdStatus || "ready";
  const reviewState = activeRun?.reviewStatus || activeRun?.qualityStatus || "standing by";

  const metrics = [
    { label: "Active runs", value: formatMetric(activeCount) },
    { label: "History", value: formatMetric(historyCount) },
    { label: "Secure hold", value: holdState },
    { label: "Review", value: reviewState },
  ];

  return (
    <section className="requester-mission-summary" aria-label="Requester mission summary">
      <div className="requester-mission-summary__header">
        <div>
          <p className="requester-mission-summary__eyebrow">Your RUNFORME</p>
          <h2 className="requester-mission-summary__title">{title}</h2>
          <p className="requester-mission-summary__copy">{copy}</p>
        </div>

        <div className="requester-mission-summary__status" aria-label="Requester flow status">
          <span className="requester-mission-summary__pulse" aria-hidden="true" />
          On track
        </div>
      </div>

      <div className="requester-mission-summary__grid">
        {metrics.map((metric) => (
          <article className="requester-mission-summary__metric" key={metric.label}>
            <p className="requester-mission-summary__metric-label">{metric.label}</p>
            <p className="requester-mission-summary__metric-value">{metric.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
