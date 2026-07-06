import RunnerStatusSummary from "./RunnerStatusSummary";

export function RunnerActionStatusPanel({ statusLabel, metrics }) {
  const safeStatusLabel = statusLabel || "Ready";
  const safeMetrics = Array.isArray(metrics) ? metrics : [];

  return (
    <section className="runner-command-center__action-status-panel" aria-label="Runner status">
      <RunnerStatusSummary statusLabel={safeStatusLabel} metrics={safeMetrics} />
    </section>
  );
}
