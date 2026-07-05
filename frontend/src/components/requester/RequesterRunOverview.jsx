import "./RequesterCommandCenter.css";
import RequesterMissionSummary from "./RequesterMissionSummary";
import RequesterRunOverviewIntro from "./RequesterRunOverviewIntro";
import RequesterRunLists from "./RequesterRunLists";
import RequesterTrustTimeline from "./RequesterTrustTimeline";

export default function RequesterRunOverview({
  activeRun = null,
  activeRuns = [],
  historyRuns = [],
  steps = [],
}) {
  return (
    <section
      className="requester-command-shell requester-command-shell--dashboard"
      aria-label="Requester command center"
    >
      {/* RUN-UI-1C-CHECKPOINT-7: extracted overview intro presentation. */}
      <RequesterRunOverviewIntro />

      <div className="requester-command-shell__content">
        <RequesterMissionSummary activeRun={activeRun} activeRuns={activeRuns} historyRuns={historyRuns} />
        <RequesterTrustTimeline steps={steps} />

        {/* RUN-UI-1C-CHECKPOINT-8: extracted active/history run list presentation. */}

        <RequesterRunLists activeRuns={activeRuns} historyRuns={historyRuns} />
      </div>
    </section>
  );
}
