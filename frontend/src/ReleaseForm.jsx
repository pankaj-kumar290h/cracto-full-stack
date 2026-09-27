import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_RELEASE, GET_RELEASES } from "./graphql.js";

export default function ReleaseForm({ onCreated }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [createRelease, { loading, error }] = useMutation(CREATE_RELEASE, {
    refetchQueries: [{ query: GET_RELEASES }],
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !date) return;
    await createRelease({
      variables: {
        input: {
          name: name.trim(),
          date: new Date(date).toISOString(),
          additionalInfo: additionalInfo.trim() || null,
        },
      },
    });
    setName("");
    setDate("");
    setAdditionalInfo("");
    onCreated?.();
  }

  return (
    <form className="release-form" onSubmit={handleSubmit}>
      <h2>New release</h2>
      <label>
        Name *
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="v1.2.0"
          required
        />
      </label>
      <label>
        Date *
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>
      <label>
        Additional info
        <textarea
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="Optional notes"
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create release"}
      </button>
      {error && <p className="error">{error.message}</p>}
    </form>
  );
}
