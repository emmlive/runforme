import "./RunnerCommandCenter.css";
import RunnerRunCard from "./RunnerRunCard";
import RunnerStatusSummary from "./RunnerStatusSummary";
import RunnerTrustChecklist from "./RunnerTrustChecklist";

export default function RunnerCommandCenter({
  title = "Runner command center",
  note = "A premium display foundation for the runner workflow. Behavior wiring stays inside RunnerDashboard until explicitly extracted.",
  statusLabel,
  metrics,
  focusedRun,
  checklistItems,
}) {
  return (
    <section className="runner-command-center" aria-label={title}>
      <div className="runner-command-center__intro">
        <p className="runner-command-center__kicker">RUNFORME Runner</p>
        <h2 className="runner-command-center__title">{title}</h2>
        <p className="runner-command-center__note">{note}</p>
      </div>

      <div className="runner-command-center__grid">
        <div>
          <RunnerStatusSummary statusLabel={statusLabel} metrics={metrics} />
        </div>
        <div>
          <RunnerRunCard run={focusedRun} />
        </div>
      </div>

      <RunnerTrustChecklist items={checklistItems} />
    </section>
  );
}
