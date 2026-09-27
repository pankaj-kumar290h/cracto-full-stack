import { useQuery } from "@apollo/client/react";
import { GET_RELEASES } from "./graphql.js";
import ReleaseForm from "./ReleaseForm.jsx";
import ReleaseCard from "./ReleaseCard.jsx";
import "./App.css";

export default function App() {
  const { data, loading, error, refetch } = useQuery(GET_RELEASES);

  return (
    <div className="app">
      <header>
        <h1>Release Checklist</h1>
      </header>

      <main>
        <ReleaseForm onCreated={refetch} />

        <section className="release-list">
          {loading && <p>Loading releases…</p>}
          {error && <p className="error">Failed to load: {error.message}</p>}
          {data?.releases?.length === 0 && (
            <p className="empty">No releases yet. Create one above.</p>
          )}
          {data?.releases?.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </section>
      </main>
    </div>
  );
}
