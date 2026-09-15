import { useMemo, useState } from "react";

import { Button, Card, StatusPill } from "../ui";
import "./RequesterMobileShell.css";

const DESTINATIONS = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "request", label: "Request", icon: "+" },
  { id: "runs", label: "My Runs", icon: "↗" },
  { id: "menu", label: "Menu", icon: "•••" },
];

const statusLabels = {
  open: "Requested",
  assigned: "Runner assigned",
  arrived: "Runner arrived",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function getRunTitle(run) {
  return run?.item || run?.title || run?.description || "Run request";
}

function getRunLocation(run) {
  return run?.location || run?.pickupAddress || run?.pickupLocation || "Location pending";
}

function getNextStep(status) {
  if (status === "open") return "Waiting for a runner to accept this run.";
  if (status === "assigned") return "Runner assigned. Next step: runner arrival.";
  if (status === "arrived") return "Runner has arrived. Next step: completion.";
  if (status === "in_progress") return "Run is in progress.";
  if (status === "completed") return "Run completed. Review payment and history.";
  return "Monitoring run status.";
}

function formatSecurityStatus(value) {
  if (!value) return "Not started";
  return String(value).split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function getStatusTone(status) {
  if (status === "completed") return "success";
  if (status === "cancelled") return "danger";
  if (status === "assigned" || status === "arrived") return "warning";
  if (status === "in_progress") return "trust";
  return "neutral";
}

function Progress({ status }) {
  const steps = ["open", "assigned", "arrived", "completed"];
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step === status || (status === "in_progress" && step === "arrived"))
  );

  return (
    <div className="requester-mobile-progress" aria-label="Run progress">
      {steps.map((step, index) => (
        <span
          className={index <= activeIndex || status === "completed" ? "is-active" : ""}
          key={step}
        />
      ))}
    </div>
  );
}

function Header({ onMenu }) {
  return (
    <header className="requester-mobile-header">
      <div className="requester-mobile-brand" aria-label="RUNFORME requester">
        <span className="requester-mobile-brand__mark">R</span>
        <span>RUNFORME</span>
      </div>
      <button className="requester-mobile-header__menu" type="button" onClick={onMenu}>
        Account
      </button>
    </header>
  );
}

function MobileRequestForm({ form }) {
  const { newRun, setNewRun, creatingRun, createRun, preview, formatMoney } = form;
  const update = (key) => (event) => setNewRun((prev) => ({ ...prev, [key]: event.target.value }));
  const specialHandoff = ["third_party_allowed", "authorized_person_required"].includes(newRun.handoffRequirement);

  return (
    <Card as="section" elevated className="run-requester-surface run-requester-surface--create requester-run-form-card requester-mobile-form-card">
      <form className="requester-run-form" onSubmit={createRun}>
        <p className="requester-mobile-form__group-label">What</p>
        <div className="requester-run-form__field requester-run-form__field--location"><label className="requester-run-form__label" htmlFor="mobile-run-location">Location *</label><input id="mobile-run-location" className="requester-run-form__control" value={newRun.location} onChange={update("location")} placeholder="Chicago Loop" autoComplete="street-address" required /><p className="requester-run-form__helper">Where should the runner go?</p></div>
        <div className="requester-run-form__field requester-run-form__field--task"><label className="requester-run-form__label" htmlFor="mobile-run-item">Item / Task *</label><input id="mobile-run-item" className="requester-run-form__control" value={newRun.item} onChange={update("item")} placeholder="Pick up a package" required /><p className="requester-run-form__helper">What needs doing?</p></div>
        <p className="requester-mobile-form__group-label">Money</p>
        {[["payout", "Payout", "1", "Runner earnings."], ["itemBudgetEstimate", "Item Budget", "0", "Maximum item estimate."]].map(([key, label, min, helper]) => (
          <div className="requester-run-form__field" key={key}><label className="requester-run-form__label" htmlFor={`mobile-run-${key}`}>{label}{key === "payout" ? " *" : ""}</label><div className="requester-run-form__money-control"><span aria-hidden="true">$</span><input id={`mobile-run-${key}`} className="requester-run-form__control requester-run-form__control--money" type="number" min={min} max={key === "itemBudgetEstimate" ? "5000" : key === "payout" ? undefined : "1000"} step="1" inputMode="numeric" value={newRun[key]} onChange={update(key)} required={key === "payout"} /></div><p className="requester-run-form__helper">{helper}</p></div>
        ))}
        <div className="requester-mobile-protection-fees"><p className="requester-mobile-form__group-label">Protection &amp; fees</p><div><label className="requester-run-form__label" htmlFor="mobile-run-platformFee">Platform fee</label><div className="requester-run-form__money-control"><span aria-hidden="true">$</span><input id="mobile-run-platformFee" className="requester-run-form__control requester-run-form__control--money" type="number" min="0" max="1000" step="1" inputMode="numeric" value={newRun.platformFee} onChange={update("platformFee")} /></div></div><div><label className="requester-run-form__label" htmlFor="mobile-run-bufferAmount">Buffer</label><div className="requester-run-form__money-control"><span aria-hidden="true">$</span><input id="mobile-run-bufferAmount" className="requester-run-form__control requester-run-form__control--money" type="number" min="0" max="1000" step="1" inputMode="numeric" value={newRun.bufferAmount} onChange={update("bufferAmount")} /></div></div></div>
        <p className="requester-mobile-form__group-label">Handoff</p>
        <section className="requester-run-form__handoff"><details className="requester-run-form__handoff-details-shell"><summary className="requester-run-form__handoff-summary"><div className="requester-run-form__handoff-summary-copy"><span className="requester-run-form__handoff-icon" aria-hidden="true">OK</span><div><strong>Location handoff</strong><span>{newRun.handoffRequirement === "standard" ? "Standard - no special requirements" : newRun.handoffRequirement === "requester_presence_required" ? "You must be there" : newRun.handoffRequirement === "unknown" ? "Needs clarification" : "Special requirement"}</span></div></div><span className="requester-run-form__handoff-change">Change</span></summary><div className="requester-run-form__handoff-panel"><div className="requester-run-form__handoff-intro"><strong>Can the runner complete the handoff on your behalf?</strong><p>Most errands need nothing extra. Change this only when the location has a special rule.</p></div><div className="requester-run-form__handoff-answer-row" role="group" aria-label="Can the runner complete the handoff">
          {[['third_party_allowed', 'Yes'], ['requester_presence_required', 'No'], ['unknown', "I'm not sure"]].map(([value, label]) => <button type="button" className={`requester-run-form__handoff-answer ${newRun.handoffRequirement === value ? "requester-run-form__handoff-answer--selected" : ""}`} aria-pressed={newRun.handoffRequirement === value} key={value} onClick={() => setNewRun((prev) => ({ ...prev, handoffRequirement: value, identityRequirement: "none", handoffConfirmed: false, handoffInstructions: value === "requester_presence_required" || value === "unknown" ? "" : prev.handoffInstructions }))}>{label}</button>)}
        </div>{specialHandoff && <div className="requester-run-form__handoff-followup"><label className="requester-run-form__label" htmlFor="mobile-run-identity">Will the location ask the runner for anything?</label><select id="mobile-run-identity" className="requester-run-form__control" value={newRun.identityRequirement} onChange={(event) => setNewRun((prev) => ({ ...prev, handoffRequirement: event.target.value === "authorized_person_required" ? "authorized_person_required" : "third_party_allowed", identityRequirement: event.target.value, handoffConfirmed: false }))}><option value="none">Nothing extra</option><option value="authorized_person_required">Runner must be named or authorized</option><option value="physical_id_required">Runner must show photo ID</option><option value="organization_credential_required">Organization credential required</option><option value="other">Another requirement</option></select>{newRun.identityRequirement !== "none" && <><p className="requester-run-form__security-note">Do not enter ID numbers, passwords, barcodes, or private credentials.</p><label className="requester-run-form__confirmation"><input type="checkbox" checked={newRun.handoffConfirmed} onChange={(event) => setNewRun((prev) => ({ ...prev, handoffConfirmed: event.target.checked }))} /><span>I confirmed the runner can complete this errand under the location's rules.</span></label></>}<label className="requester-run-form__label" htmlFor="mobile-run-instructions">Location instructions</label><textarea id="mobile-run-instructions" className="requester-run-form__control requester-run-form__textarea" rows="3" maxLength={500} value={newRun.handoffInstructions} onChange={update("handoffInstructions")} placeholder="Example: Use the east service desk." /></div>}{newRun.handoffRequirement === "requester_presence_required" && <div className="requester-run-form__handoff-warning" role="status">This location requires you personally. RUNFORME will keep this errand from runners.</div>}{newRun.handoffRequirement === "unknown" && <div className="requester-run-form__handoff-warning" role="status">Check the location's rule first. Dispatch stays paused until eligibility is known.</div>}</div></details></section>
        <div className="requester-run-form__action"><Button type="submit" size="lg" fullWidth disabled={creatingRun} aria-disabled={creatingRun}>{creatingRun ? "Creating..." : "Create Run"}</Button><p className="requester-run-form__action-copy">Required fields are marked with an asterisk.</p></div>
      </form>
      <details className="requester-mobile-funding" aria-label="Funding protection details"><summary><span><strong>Funding protection</strong><small>Secure hold preview</small></span><span className="requester-mobile-funding__amount">{formatMoney(preview.holdAmount)}</span><span className="requester-mobile-funding__view">View details</span></summary><div className="requester-run-form-preview" aria-live="polite"><div className="requester-run-form-preview__heading"><div><p className="requester-run-form-preview__eyebrow">Funding protection</p><h3>Secure hold preview</h3></div><span>Authorization estimate</span></div><div className="requester-run-form-preview__metrics"><div><p>Estimated hold</p><strong>{formatMoney(preview.holdAmount)}</strong></div><div><p>Max runner spend</p><strong>{formatMoney(preview.maxRunnerSpend)}</strong></div></div><p className="requester-run-form-preview__copy">Approved budget, payout, fee, and buffer protect requester funds and trigger receipt review when needed.</p></div></details>
    </Card>
  );
}

function MobileRunDetail({ run, onBack, onAuthorizeHold, onApproveManualReview, authorizingHold, approvingManualReview }) {
  if (!run) return null;
  const needsHold = Number(run.holdAmount || 0) > 0 && run.authorizationStatus !== "authorized";
  const needsReview = Boolean(run.requiresManualReview);
  const isCompleted = run.status === "completed";
  const showPrimaryHold = needsHold && !isCompleted && !needsReview;
  const runner = run.assignedRunnerId ? `Runner #${run.assignedRunnerId}` : "Runner matching";
  const operationalRows = [
    ["Location", getRunLocation(run)],
    ["Handoff", formatSecurityStatus(run.handoffRequirement)],
    ["Identity", formatSecurityStatus(run.identityRequirement)],
    ["Instructions", run.handoffInstructions],
    ["Receipt", formatSecurityStatus(run.receiptStatus)],
    ["Receipt amount", Number(run.receiptAmount || 0) > 0 ? `$${run.receiptAmount}` : null],
    ["Receipt proof", run.receiptImageUrl ? "Uploaded" : run.receiptStatus ? "Not uploaded" : null],
    ["Final amount", Number(run.finalAmount || 0) > 0 ? `$${run.finalAmount}` : null],
    ["Purchase", formatSecurityStatus(run.purchaseStatus)],
    ["Delivery confirmed", run.deliveryConfirmedAt ? new Date(run.deliveryConfirmedAt).toLocaleDateString() : null],
    ["Manual review", run.requiresManualReview ? "Required" : null],
  ].filter(([, value]) => value && value !== "Not started");
  const paymentRows = [
    ["Payout", `$${run.payout || 0}`],
    ["Estimated hold", Number(run.holdAmount || 0) > 0 ? `$${run.holdAmount}` : null],
    ["Max runner spend", Number(run.maxRunnerSpend || 0) > 0 ? `$${run.maxRunnerSpend}` : null],
    ["Authorization", formatSecurityStatus(run.authorizationStatus)],
    ["Payment", formatSecurityStatus(run.paymentStatus)],
  ].filter(([, value]) => value && value !== "Not started");
  const advancedRows = [
    ["Run ID", run.id],
    ["Created", run.createdAt ? new Date(run.createdAt).toLocaleDateString() : null],
    ["Accepted", run.acceptedAt ? new Date(run.acceptedAt).toLocaleDateString() : null],
    ["Arrived", run.arrivedAt ? new Date(run.arrivedAt).toLocaleDateString() : null],
    ["Started", run.startedAt ? new Date(run.startedAt).toLocaleDateString() : null],
    ["Completed", run.completedAt ? new Date(run.completedAt).toLocaleDateString() : null],
    ["Review status", run.reviewStatus || run.qualityStatus],
  ].filter(([, value]) => value && value !== "Not started");

  return (
    <section className="requester-mobile-run-detail" aria-label="Run detail">
      <button className="requester-mobile-back" type="button" onClick={onBack}>← Back to My Runs</button>
      <div className="requester-mobile-run-detail__heading">
        <div><p className="requester-mobile-eyebrow">Run detail</p><h1>{getRunTitle(run)}</h1><p>{getRunLocation(run)}</p></div>
        <span className={`requester-mobile-detail-status requester-mobile-detail-status--${getStatusTone(run.status)}`}>{statusLabels[run.status] || run.status || "Ready"}</span>
      </div>
      <Progress status={run.status} />
      <div className="requester-mobile-detail-facts"><div><span>Runner</span><strong>{runner}</strong></div><div><span>Next step</span><strong>{getNextStep(run.status)}</strong></div><div><span>Payout</span><strong>${run.payout || 0}</strong></div>{Number(run.holdAmount || 0) > 0 && !needsHold && <div><span>Secure Hold</span><strong>${run.holdAmount} · {formatSecurityStatus(run.authorizationStatus)}</strong></div>}</div>
      {(showPrimaryHold || needsReview) && <div className="requester-mobile-detail-action">
        {showPrimaryHold && <><div><p className="requester-mobile-eyebrow">Funding authorization</p><strong>${run.holdAmount || 0} estimated hold</strong><span>Secure Hold authorization is required before runner dispatch.</span></div><Button fullWidth size="lg" variant="success" disabled={authorizingHold} onClick={() => onAuthorizeHold?.(run.id)}>{authorizingHold ? "Authorizing..." : "Authorize Secure Hold"}</Button></>}
        {!showPrimaryHold && needsReview && <><div><p className="requester-mobile-eyebrow">Receipt review</p><strong>Review required before completion</strong><span>Check the receipt and final amount.</span></div><Button fullWidth size="lg" variant="warning" disabled={approvingManualReview} onClick={() => onApproveManualReview?.(run.id)}>{approvingManualReview ? "Approving..." : "Approve Manual Review"}</Button></>}
      </div>}
      <details className="requester-mobile-disclosure">
        <summary><span>Run details</span><span aria-hidden="true">›</span></summary>
        <div className="requester-mobile-disclosure__body">
          {operationalRows.map(([label, value]) => <div className="requester-mobile-detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          {run.deliveryPin && <div className="requester-mobile-pin-note"><strong>Delivery PIN {run.deliveryPin}</strong><span>Keep this PIN private. Give it to the runner only after the delivery or task handoff is verified with the requester or recipient.</span></div>}
        </div>
      </details>

      <details className="requester-mobile-disclosure">
        <summary><span>Payment &amp; protection</span><span aria-hidden="true">›</span></summary>
        <div className="requester-mobile-disclosure__body">
          {paymentRows.map(([label, value]) => <div className="requester-mobile-detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          {needsHold && !showPrimaryHold && <div className="requester-mobile-inline-action"><p>Secure Hold authorization is available for this run.</p><Button fullWidth variant="success" disabled={authorizingHold} onClick={() => onAuthorizeHold?.(run.id)}>{authorizingHold ? "Authorizing..." : "Authorize Secure Hold"}</Button></div>}
          <p className="requester-mobile-disclosure__copy">{needsHold ? "Secure Hold authorization protects the approved spending limit before runner dispatch." : "Spending protection supports receipt review when needed."}</p>
        </div>
      </details>

      <details className="requester-mobile-full-detail"><summary>Advanced details</summary><div className="requester-mobile-disclosure__body">{advancedRows.length > 0 ? advancedRows.map(([label, value]) => <div className="requester-mobile-detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>) : <p className="requester-mobile-disclosure__copy">No additional run details.</p>}</div></details>
    </section>
  );
}

export default function RequesterMobileShell({
  activeRuns = [],
  completedRuns = [],
  selectedRun = null,
  notification = null,
  form,
  onSelectRun,
  onAuthorizeHold,
  onApproveManualReview,
  authorizingHold = false,
  approvingManualReview = false,
  onRefresh,
  onLogout,
}) {
  const [destination, setDestination] = useState("home");
  const [runsTab, setRunsTab] = useState("active");
  const [openRunId, setOpenRunId] = useState(null);

  const activeRun = activeRuns[0] || null;
  const actionableHold = Boolean(
    activeRun && Number(activeRun.holdAmount || 0) > 0 && activeRun.authorizationStatus !== "authorized"
  );
  const actionableReview = Boolean(activeRun?.requiresManualReview);
  const dominantAction = actionableHold
    ? { label: "Authorize Secure Hold", onClick: () => onAuthorizeHold?.(activeRun.id) }
    : actionableReview
      ? { label: "Approve manual review", onClick: () => onApproveManualReview?.(activeRun.id) }
      : { label: "View run", onClick: () => setDestination("runs") };

  const visibleRuns = useMemo(
    () => (runsTab === "active" ? activeRuns : completedRuns),
    [activeRuns, completedRuns, runsTab]
  );

  const navigate = (id) => {
    setDestination(id);
    if (id !== "runs") setOpenRunId(null);
    if (id === "runs") setRunsTab(activeRuns.length > 0 ? "active" : "history");
  };

  return (
    <div className="requester-mobile-shell">
      <Header onMenu={() => navigate("menu")} />

      {notification && (
        <div className={`requester-mobile-notification requester-mobile-notification--${notification.type}`} role="status">
          {notification.message}
        </div>
      )}

      <main className="requester-mobile-main">
        {destination === "home" && (
          <section className="requester-mobile-home" aria-label="Requester home">
            {!activeRun && (
              <div className="requester-mobile-home__intro">
                <p className="requester-mobile-eyebrow">Your RUNFORME home</p>
                <h1>What do you need done?</h1>
                <p>Tell us what needs handling. A runner can take it from there.</p>
              </div>
            )}

            {activeRun ? (
              <Card className="requester-mobile-active-card" elevated>
                <div className="requester-mobile-card-heading">
                  <div>
                    <p className="requester-mobile-eyebrow">Active run</p>
                    <h2 aria-label={getRunTitle(activeRun)} title={getRunTitle(activeRun)}>{getRunTitle(activeRun)}</h2>
                    <p className="requester-mobile-muted">{getRunLocation(activeRun)}</p>
                  </div>
                  <StatusPill tone={getStatusTone(activeRun.status)}>
                    {statusLabels[activeRun.status] || activeRun.status || "In progress"}
                  </StatusPill>
                </div>
                <Progress status={activeRun.status} />
                <div className="requester-mobile-active-meta">
                  <span>{activeRun.assignedRunnerId ? `Runner #${activeRun.assignedRunnerId}` : "Runner matching"}</span>
                  <strong>{getNextStep(activeRun.status)}</strong>
                </div>
                <Button fullWidth size="lg" variant={actionableHold ? "success" : actionableReview ? "warning" : "primary"} onClick={dominantAction.onClick}>
                  {dominantAction.label}
                </Button>
              </Card>
            ) : (
              <Card className="requester-mobile-request-card" elevated>
                <span className="requester-mobile-request-card__symbol" aria-hidden="true">+</span>
                <h2>Start a request</h2>
                <p>Share the location, task, and spending limits. We’ll keep the next step clear.</p>
                <Button fullWidth size="lg" onClick={() => navigate("request")}>Start a request</Button>
              </Card>
            )}

            <div className="requester-mobile-home__status">
              <span className={`requester-mobile-status-dot ${activeRun ? "is-live" : ""}`} aria-hidden="true" />
              <div>
                <strong>{activeRun ? "Your run is being handled" : "No active run"}</strong>
                <span>{activeRun ? "Current status is updated from your requester dashboard." : "Ready when you are."}</span>
              </div>
            </div>

            <button className="requester-mobile-runs-link" type="button" onClick={() => navigate("runs")}>
              <span><strong>My Runs</strong><small>{completedRuns.length} in history</small></span>
              <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {destination === "request" && (
          <section className="requester-mobile-destination" aria-label="Create a request">
            <div className="requester-mobile-destination__heading">
              <p className="requester-mobile-eyebrow">Request</p>
              <h1>Tell us what needs doing.</h1>
              <p>Required details stay together here. You can review funding protection before sending.</p>
            </div>
            <MobileRequestForm form={form} />
          </section>
        )}

        {destination === "runs" && (
          <section className="requester-mobile-destination" aria-label="My runs">
            {openRunId && selectedRun?.id === openRunId ? <MobileRunDetail run={selectedRun} onBack={() => { setOpenRunId(null); onSelectRun?.(null); }} onAuthorizeHold={onAuthorizeHold} onApproveManualReview={onApproveManualReview} authorizingHold={authorizingHold} approvingManualReview={approvingManualReview} /> : <>
            <div className="requester-mobile-destination__heading">
              <p className="requester-mobile-eyebrow">My Runs</p>
              <h1>Keep track of your requests.</h1>
            </div>
            <div className="requester-mobile-tabs" role="tablist" aria-label="Run type">
              {[["active", "Active", activeRuns.length], ["history", "History", completedRuns.length]].map(([id, label, count]) => (
                <button className={runsTab === id ? "is-selected" : ""} key={id} type="button" role="tab" aria-selected={runsTab === id} onClick={() => setRunsTab(id)}>
                  {label}<span>{count}</span>
                </button>
              ))}
            </div>
            {visibleRuns.length === 0 ? (
              <Card className="requester-mobile-empty-card"><h2>{runsTab === "active" ? "No active runs" : "No history yet"}</h2><p>{runsTab === "active" ? "Start a request when you need a runner." : "Completed runs will appear here."}</p></Card>
            ) : (
              <div className="requester-mobile-run-list">
                {visibleRuns.map((run) => (
                    <button className="requester-mobile-run-row" type="button" key={run.id} onClick={() => { setOpenRunId(run.id); onSelectRun?.(run.id); }}>
                    <span><strong>{getRunTitle(run)}</strong><small>{getRunLocation(run)}</small></span>
                    <StatusPill tone={getStatusTone(run.status)}>{statusLabels[run.status] || run.status || "Ready"}</StatusPill>
                  </button>
                ))}
              </div>
            )}
            </>}
          </section>
        )}

        {destination === "menu" && (
          <section className="requester-mobile-destination" aria-label="Requester menu">
            <div className="requester-mobile-destination__heading"><p className="requester-mobile-eyebrow">Menu</p><h1>Keep things simple.</h1></div>
            <div className="requester-mobile-menu-list">
              <button type="button" onClick={onRefresh}>Refresh runs <span>↻</span></button>
              <button type="button" onClick={onLogout}>Sign out <span>→</span></button>
            </div>
          </section>
        )}
      </main>

      <nav className="requester-mobile-nav" aria-label="Requester navigation">
        {DESTINATIONS.map((item) => (
          <button className={destination === item.id ? "is-selected" : ""} type="button" key={item.id} onClick={() => navigate(item.id)} aria-current={destination === item.id ? "page" : undefined}>
            <span aria-hidden="true">{item.icon}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
