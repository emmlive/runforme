import "./RequesterCommandCenter.css";
import RequesterRunList from "./RequesterRunList";

export default function RequesterRunLists({
  activeRuns = [],
  historyRuns = [],
}) {
  return (
    <section className="requester-run-lists" aria-label="Requester run lists">
      <RequesterRunList
        title="Active runs"
        runs={activeRuns}
        emptyMessage="No active requester runs yet."
      />
      <RequesterRunList
        title="History"
        runs={historyRuns}
        emptyMessage="Completed requester runs will appear here."
      />
    </section>
  );
}
