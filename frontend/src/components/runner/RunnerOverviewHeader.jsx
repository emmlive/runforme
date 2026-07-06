export function RunnerOverviewHeader({
  title: inputTitle,
  note: inputNote,
}) {
  const title = inputTitle || "Runner command center";
  const note = inputNote || "";

  return (
    <div className="runner-command-center__intro">
            <p className="runner-command-center__kicker">RUNFORME Runner</p>
            <h2 className="runner-command-center__title">{title}</h2>
            <p className="runner-command-center__note">{note}</p>
          </div>
  );
}
