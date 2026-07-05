import "./RunnerCommandCenter.css";

const defaultMetrics = [
  { label: "Available", value: "0" },
  { label: "Active", value: "0" },
  { label: "Completed", value: "0" },
];

export default function RunnerStatusSummary({
  title = "Runner command center",
  subtitle = "Track the run queue, active handoffs, and completion readiness from one focused surface.",
  statusLabel = "Ready",
  metrics = defaultMetrics,
}) {
  const safeMetrics = Array.isArray(metrics) && metrics.length > 0 ? metrics : defaultMetrics;

  return (
    <section className="runner-status-summary" aria-label={title}>
      <div className="runner-status-summary__header">
        <div>
          <p className="runner-status-summary__title">{title}</p>
          <p className="runner-status-summary__subtitle">{subtitle}</p>
        </div>
        <span className="runner-status-summary__pill">{statusLabel}</span>
      </div>

      <div className="runner-status-summary__metrics">
        {safeMetrics.map((metric) => (
          <div className="runner-status-summary__metric" key={metric.label}>
            <p className="runner-status-summary__metric-label">{metric.label}</p>
            <p className="runner-status-summary__metric-value">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
