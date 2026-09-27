import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use("/graphql", expressMiddleware(server));

app.listen(PORT, () => {
  console.log(`GraphQL server ready at http://localhost:${PORT}/graphql`);
});
