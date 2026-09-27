import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  GET_RELEASE,
  GET_RELEASES,
  CREATE_RELEASE,
  TOGGLE_STEP,
  UPDATE_ADDITIONAL_INFO,
  DELETE_RELEASE,
} from "../graphql.js";
import { TrashIcon, CheckIcon } from "../Icons.jsx";

function toDatetimeLocal(isoOrDate) {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function ReleasePage() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();

  if (isNew) return <NewReleaseForm navigate={navigate} />;
  return <ExistingRelease id={id} navigate={navigate} />;
}

function NewReleaseForm({ navigate }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(toDatetimeLocal());
  const [createRelease, { loading, error }] = useMutation(CREATE_RELEASE, {
    refetchQueries: [{ query: GET_RELEASES }],
  });

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim() || !date) return;
    const { data } = await createRelease({
      variables: {
        input: { name: name.trim(), date: new Date(date).toISOString() },
      },
    });
    navigate(`/releases/${data.createRelease.id}`);
  }

  return (
    <form className="card" onSubmit={handleSave}>
      <div className="card-toolbar">
        <div className="crumbs">
          <Link to="/" className="crumb">
            All releases
          </Link>
          <span className="crumb-sep">›</span>
          <span className="crumb crumb-active">New release</span>
        </div>
      </div>

      <div className="field-row">
        <label>
          Release
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Version 1.0.1"
            required
            autoFocus
          />
        </label>
        <label>
          Date
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
      </div>

      {error && <p className="error">{error.message}</p>}

      <div className="card-footer">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Save"} <CheckIcon />
        </button>
      </div>
    </form>
  );
}

function ExistingRelease({ id, navigate }) {
  const { data, loading, error } = useQuery(GET_RELEASE, { variables: { id } });
  const [info, setInfo] = useState("");
  const [toggleStep] = useMutation(TOGGLE_STEP);
  const [updateInfo, { loading: saving }] = useMutation(UPDATE_ADDITIONAL_INFO);
  const [deleteRelease, { loading: deleting }] = useMutation(DELETE_RELEASE, {
    refetchQueries: [{ query: GET_RELEASES }],
  });

  const release = data?.release;

  useEffect(() => {
    if (release) setInfo(release.additionalInfo || "");
  }, [release?.id, release?.additionalInfo]);

  if (loading) return <div className="card">Loading…</div>;
  if (error) return <div className="card error">Failed to load: {error.message}</div>;
  if (!release) return <div className="card">Release not found.</div>;

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

  function handleSaveInfo() {
    updateInfo({ variables: { id: release.id, additionalInfo: info || null } });
  }

  function handleDelete() {
    if (!confirm(`Delete release "${release.name}"?`)) return;
    deleteRelease({ variables: { id: release.id } }).then(() => navigate("/"));
  }

  return (
    <div className="card">
      <div className="card-toolbar">
        <div className="crumbs">
          <Link to="/" className="crumb">
            All releases
          </Link>
          <span className="crumb-sep">›</span>
          <span className="crumb crumb-active">{release.name}</span>
        </div>
        <button className="btn btn-primary" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete"} <TrashIcon />
        </button>
      </div>

      <div className="field-row">
        <label>
          Release
          <input value={release.name} readOnly />
        </label>
        <label>
          Date
          <input
            value={new Date(release.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            readOnly
          />
        </label>
      </div>

      <ul className="checklist">
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

      <label className="remarks-label">
        Additional remarks / tasks
        <textarea
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          placeholder="Please enter any other important notes for the release"
        />
      </label>

      <div className="card-footer">
        <button className="btn btn-primary" onClick={handleSaveInfo} disabled={saving}>
          {saving ? "Saving…" : "Save"} <CheckIcon />
        </button>
      </div>
    </div>
  );
}
