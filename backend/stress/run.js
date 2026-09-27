import autocannon from "autocannon";

// Usage: node stress/run.js <url> <connections> <duration_seconds>
// Example: node stress/run.js http://localhost:4000/graphql 100 10
const url = process.argv[2] || "http://localhost:4000/graphql";
const connections = Number(process.argv[3] || 50);
const duration = Number(process.argv[4] || 10);

const query = {
  query: `query { releases { id name status } }`,
};

const instance = autocannon(
  {
    url,
    connections,
    duration,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(query),
  },
  (err, result) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  }
);

autocannon.track(instance, { renderProgressBar: true });
