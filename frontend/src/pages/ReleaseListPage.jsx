import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { GET_RELEASES, DELETE_RELEASE } from "../graphql.js";
import StatusBadge from "../StatusBadge.jsx";
import { EyeIcon, TrashIcon, PlusIcon } from "../Icons.jsx";

export default function ReleaseListPage() {
  const { data, loading, error } = useQuery(GET_RELEASES);
  const [deleteRelease] = useMutation(DELETE_RELEASE, {
    refetchQueries: [{ query: GET_RELEASES }],
  });

  function handleDelete(release) {
    if (!confirm(`Delete release "${release.name}"?`)) return;
    deleteRelease({ variables: { id: release.id } });
  }

  return (
    <div className="card">
      <div className="card-toolbar">
        <span className="crumb crumb-active">All releases</span>
        <Link to="/releases/new" className="btn btn-primary">
          New release <PlusIcon />
        </Link>
      </div>

      {loading && <p className="muted">Loading releases…</p>}
      {error && <p className="error">Failed to load: {error.message}</p>}

      {data?.releases?.length === 0 && (
        <p className="muted">No releases yet. Create one above.</p>
      )}

      {data?.releases?.length > 0 && (
        <table className="release-table">
          <thead>
            <tr>
              <th>Release</th>
              <th>Date</th>
              <th>Status</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.releases.map((release) => (
              <tr key={release.id}>
                <td>{release.name}</td>
                <td>
                  {new Date(release.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </td>
                <td>
                  <StatusBadge status={release.status} />
                </td>
                <td>
                  <Link to={`/releases/${release.id}`} className="link-action">
                    View <EyeIcon />
                  </Link>
                </td>
                <td>
                  <button
                    className="link-action link-action-danger"
                    onClick={() => handleDelete(release)}
                  >
                    Delete <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
