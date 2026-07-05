import "./RequesterCommandCenter.css";

export default function RequesterRunOverviewIntro({
  kicker = "Live requester overview",
  note = "Real run data, trust checkpoints, and current movement stay grouped before the detailed panels below.",
}) {
  return (
    <div className="requester-command-shell__intro">
      <p className="requester-command-shell__kicker">{kicker}</p>
      <p className="requester-command-shell__note">{note}</p>
    </div>
  );
}
