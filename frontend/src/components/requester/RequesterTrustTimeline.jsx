import "./RequesterCommandCenter.css";

const DEFAULT_STEPS = [
  {
    id: "created",
    title: "Run request created",
    copy: "Your request details are saved and ready to move forward.",
    state: "done",
  },
  {
    id: "hold",
    title: "Funding protection",
    copy: "Authorize the estimated amount before the request is sent to runners.",
    state: "active",
  },
  {
    id: "runner",
    title: "Runner acceptance",
    copy: "You’ll see when a runner accepts and starts handling your request.",
    state: "pending",
  },
  {
    id: "proof",
    title: "Delivery proof and review",
    copy: "Delivery proof and any required review stay visible through completion.",
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
  copy = "Follow your request from creation through delivery.",
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
