// Fixed checklist steps, identical for every release.
// Stored per-release as an array of these keys in `completed_steps`.
export const STEPS = [
  { key: "design", label: "Design" },
  { key: "code_freeze", label: "Code freeze" },
  { key: "qa", label: "QA" },
  { key: "staging", label: "Staging deploy" },
  { key: "docs", label: "Docs updated" },
  { key: "release_notes", label: "Release notes" },
  { key: "deploy", label: "Production deploy" },
  { key: "monitor", label: "Post-release monitoring" },
];

export const STEP_KEYS = STEPS.map((s) => s.key);

export function computeStatus(completedSteps) {
  const count = Array.isArray(completedSteps) ? completedSteps.length : 0;
  if (count === 0) return "planned";
  if (count === STEP_KEYS.length) return "done";
  return "ongoing";
}
