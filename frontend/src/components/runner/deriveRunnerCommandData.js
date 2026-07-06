export function deriveRunnerCommandData({
  availableRuns,
  completedRuns,
  focusedRun,
  statusLabel = "Ready",
} = {}) {
  const safeAvailableRuns = Array.isArray(availableRuns) ? availableRuns : [];
  const safeCompletedRuns = Array.isArray(completedRuns) ? completedRuns : [];
  const safeFocusedRun = focusedRun || safeAvailableRuns[0] || null;
  const safeStatusLabel = statusLabel || "Ready";

  return {
    availableRuns: safeAvailableRuns,
    completedRuns: safeCompletedRuns,
    focusedRun: safeFocusedRun,
    statusLabel: safeStatusLabel,
    metrics: [
      { label: "Available", value: String(safeAvailableRuns.length) },
      { label: "Focused", value: safeFocusedRun ? "1" : "0" },
      { label: "Completed", value: String(safeCompletedRuns.length) },
    ],
    checklistItems: [
      safeFocusedRun
        ? "Review the focused run details before the next step."
        : "Review available requests from the runner queue.",
      safeAvailableRuns.length > 0
        ? "Keep the queue organized before selecting the next request."
        : "Stay ready for the next matched request.",
      safeCompletedRuns.length > 0
        ? "Completed work is reflected in the runner history count."
        : "Completed work will appear after finished requests.",
    ],
  };
}
