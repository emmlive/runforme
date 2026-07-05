import "./RunnerCommandCenter.css";

const defaultItems = [
  "Confirm the request details before moving forward.",
  "Keep progress clear for the requester.",
  "Use proof and handoff steps when the run reaches that stage.",
];

export default function RunnerTrustChecklist({
  title = "Runner trust checklist",
  note = "A display-only foundation for the runner safety and progress surface.",
  items = defaultItems,
}) {
  const safeItems = Array.isArray(items) && items.length > 0 ? items : defaultItems;

  return (
    <section className="runner-trust-checklist" aria-label={title}>
      <div>
        <p className="runner-trust-checklist__title">{title}</p>
        <p className="runner-trust-checklist__note">{note}</p>
      </div>

      <div className="runner-trust-checklist__items">
        {safeItems.map((item) => (
          <div className="runner-trust-checklist__item" key={item}>
            <span className="runner-trust-checklist__dot" aria-hidden="true" />
            <p className="runner-trust-checklist__label">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
