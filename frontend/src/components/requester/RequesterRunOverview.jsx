import "./RequesterCommandCenter.css";
import RequesterMissionSummary from "./RequesterMissionSummary";
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
      <div className="requester-command-shell__intro">
        <p className="requester-command-shell__kicker">Live requester overview</p>
        <p className="requester-command-shell__note">
          Real run data, trust checkpoints, and current movement stay grouped before the detailed panels below.
        </p>
      </div>

      <div className="requester-command-shell__content">
        <RequesterMissionSummary activeRun={activeRun} activeRuns={activeRuns} historyRuns={historyRuns} />
        <RequesterTrustTimeline steps={steps} />
      </div>
    </section>
  );
}
