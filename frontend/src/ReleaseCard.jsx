import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  TOGGLE_STEP,
  UPDATE_ADDITIONAL_INFO,
  DELETE_RELEASE,
  GET_RELEASES,
} from "./graphql.js";
import StatusBadge from "./StatusBadge.jsx";

export default function ReleaseCard({ release }) {
  const [info, setInfo] = useState(release.additionalInfo || "");
  const [toggleStep] = useMutation(TOGGLE_STEP);
  const [updateInfo, { loading: savingInfo }] = useMutation(
    UPDATE_ADDITIONAL_INFO
  );
  const [deleteRelease, { loading: deleting }] = useMutation(DELETE_RELEASE, {
    refetchQueries: [{ query: GET_RELEASES }],
  });

  function handleToggle(stepKey, completed) {
    const steps = release.steps.map((s) =>
      s.key === stepKey
        ? { __typename: "Step", ...s, completed }
        : { __typename: "Step", ...s }
    );
    const doneCount = steps.filter((s) => s.completed).length;
    const status =
      doneCount === 0 ? "planned" : doneCount === steps.length ? "done" : "ongoing";

    toggleStep({
      variables: { id: release.id, stepKey, completed },
      optimisticResponse: {
        toggleStep: { __typename: "Release", ...release, steps, status },
      },
    });
  }

  function handleInfoBlur() {
    if (info === (release.additionalInfo || "")) return;
    updateInfo({
      variables: { id: release.id, additionalInfo: info || null },
    });
  }

  function handleDelete() {
    if (!confirm(`Delete release "${release.name}"?`)) return;
    deleteRelease({ variables: { id: release.id } });
  }

  const completedCount = release.steps.filter((s) => s.completed).length;

  return (
    <div className="release-card">
      <div className="release-header">
        <div>
          <h3>{release.name}</h3>
          <p className="date">{new Date(release.date).toLocaleString()}</p>
        </div>
        <StatusBadge status={release.status} />
      </div>

      <p className="progress">
        {completedCount} / {release.steps.length} steps completed
      </p>

      <ul className="steps">
        {release.steps.map((step) => (
          <li key={step.key}>
            <label>
              <input
                type="checkbox"
                checked={step.completed}
                onChange={(e) => handleToggle(step.key, e.target.checked)}
              />
              {step.label}
            </label>
          </li>
        ))}
      </ul>

      <label className="info-label">
        Additional info
        <textarea
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          onBlur={handleInfoBlur}
          placeholder="Optional notes"
        />
      </label>
      {savingInfo && <span className="saving">Saving…</span>}

      <button
        className="delete-btn"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Delete release"}
      </button>
    </div>
  );
}
