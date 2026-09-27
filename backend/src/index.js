import "dotenv/config";
import os from "os";
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

app.get("/health", (_req, res) => {
  const cpus = os.cpus().length;
  // Prisma's default connection_limit when none is set on DATABASE_URL.
  const defaultPrismaPoolSize = cpus * 2 + 1;
  res.json({ ok: true, cpus, defaultPrismaPoolSize });
});

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use("/graphql", expressMiddleware(server));

app.listen(PORT, () => {
  console.log(`GraphQL server ready at http://localhost:${PORT}/graphql`);
});
