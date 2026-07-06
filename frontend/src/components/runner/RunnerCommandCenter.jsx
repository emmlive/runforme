import "./RunnerCommandCenter.css";
import RunnerStatusSummary from "./RunnerStatusSummary";
import { RunnerOverviewHeader } from "./RunnerOverviewHeader";
import { RunnerActionStatusPanel } from "./RunnerActionStatusPanel";
import { RunnerFocusedRunSection } from "./RunnerFocusedRunSection";
import { RunnerTrustChecklistSection } from "./RunnerTrustChecklistSection";

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
          {/* RUN-UI-1D-CHECKPOINT-8: action/status panel presentation extracted from RunnerCommandCenter. */}
          <RunnerActionStatusPanel
            statusLabel={statusLabel}
            metrics={metrics}
          />
        </div>
        <div>
          {/* RUN-UI-1D-CHECKPOINT-9: focused run card section extracted from RunnerCommandCenter. */}
          <RunnerFocusedRunSection focusedRun={focusedRun} />
        </div>
      </div>

      {/* RUN-UI-1D-CHECKPOINT-10: trust/checklist section extracted from RunnerCommandCenter. */}
      <RunnerTrustChecklistSection checklistItems={checklistItems} />
    </section>
  );
}
