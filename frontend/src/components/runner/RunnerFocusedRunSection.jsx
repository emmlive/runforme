import RunnerRunCard from "./RunnerRunCard";

export function RunnerFocusedRunSection({ focusedRun }) {
  const run = focusedRun || null;

  return (
    <section className="runner-command-center__focused-run-section" aria-label="Focused run">
      <RunnerRunCard run={run} />
    </section>
  );
}
