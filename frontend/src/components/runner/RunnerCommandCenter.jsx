import "./RunnerCommandCenter.css";
import RunnerRunCard from "./RunnerRunCard";
import RunnerStatusSummary from "./RunnerStatusSummary";
import RunnerTrustChecklist from "./RunnerTrustChecklist";
import { RunnerOverviewHeader } from "./RunnerOverviewHeader";

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
            {/* RUN-UI-1D-CHECKPOINT-7: overview title/note presentation extracted from RunnerCommandCenter. */}
      <RunnerOverviewHeader
        title={title}
        note={note}
      />

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
