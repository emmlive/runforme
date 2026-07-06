import RunnerTrustChecklist from "./RunnerTrustChecklist";

export function RunnerTrustChecklistSection({ checklistItems }) {
  const safeChecklistItems = Array.isArray(checklistItems) ? checklistItems : [];

  return (
    <section className="runner-command-center__trust-checklist-section" aria-label="Runner trust checklist">
      <RunnerTrustChecklist items={safeChecklistItems} />
    </section>
  );
}
