import "./RequesterCommandCenter.css";

const DEFAULT_STEPS = [
  {
    id: "created",
    title: "Run request created",
    copy: "Requester details, destination, and mission notes remain owned by the existing dashboard flow.",
    state: "done",
  },
  {
    id: "hold",
    title: "Secure hold placeholder",
    copy: "Authorization state can be displayed without changing money movement or server route behavior.",
    state: "active",
  },
  {
    id: "runner",
    title: "Runner acceptance",
    copy: "Runner matching, offer acceptance, and active-run transitions stay controlled by current flows.",
    state: "pending",
  },
  {
    id: "proof",
    title: "Delivery proof and review",
    copy: "PIN, proof, final handoff, and review checkpoints remain visible as trust milestones.",
    state: "pending",
  },
];

function normalizeState(state) {
  const normalized = String(state || "pending").toLowerCase();
  if (["done", "active"].includes(normalized)) {
    return normalized;
  }
  return "pending";
}

export default function RequesterTrustTimeline({
  steps = DEFAULT_STEPS,
  title = "Trust timeline",
  copy = "A presentational timeline for the requester journey. It is intentionally data-neutral for this checkpoint.",
}) {
  return (
    <section className="requester-trust-timeline" aria-label="Requester trust timeline">
      <div className="requester-trust-timeline__header">
        <div>
          <h3 className="requester-trust-timeline__title">{title}</h3>
          <p className="requester-trust-timeline__copy">{copy}</p>
        </div>
      </div>

      <ol className="requester-trust-timeline__list">
        {steps.map((step, index) => {
          const state = normalizeState(step.state);

          return (
            <li className="requester-trust-timeline__item" key={step.id || step.title}>
              <span className="requester-trust-timeline__icon" aria-hidden="true">
                {index + 1}
              </span>

              <div>
                <p className="requester-trust-timeline__item-title">{step.title}</p>
                <p className="requester-trust-timeline__item-copy">{step.copy}</p>
                <span className={`requester-trust-timeline__state requester-trust-timeline__state--${state}`}>
                  {state}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
