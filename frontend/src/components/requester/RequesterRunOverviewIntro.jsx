import "./RequesterCommandCenter.css";

export default function RequesterRunOverviewIntro({
  kicker = "Your run at a glance.",
  note = "Track each step from request to completion.",
}) {
  return (
    <div className="requester-command-shell__intro">
      <p className="requester-command-shell__kicker">{kicker}</p>
      <p className="requester-command-shell__note">{note}</p>
    </div>
  );
}
