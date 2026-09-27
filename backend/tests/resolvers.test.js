import { describe, it, expect, afterAll } from "vitest";
import { resolvers } from "../src/resolvers.js";
import { prisma } from "../src/db.js";

// Integration test — requires DATABASE_URL to point at a real (test) Postgres.
// Skips automatically when no DATABASE_URL is configured.
const hasDb = !!process.env.DATABASE_URL;
const maybe = hasDb ? describe : describe.skip;

maybe("release lifecycle (integration)", () => {
  let releaseId;

  afterAll(async () => {
    if (releaseId) {
      await prisma.release.delete({ where: { id: releaseId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("creates a release with status planned", async () => {
    const release = await resolvers.Mutation.createRelease(null, {
      input: { name: "v1.0.0", date: new Date().toISOString() },
    });
    releaseId = release.id;
    expect(release.status).toBe("planned");
    expect(release.steps.every((s) => !s.completed)).toBe(true);
  });

  it("moves to ongoing after completing one step, done after all", async () => {
    const firstKey = (await resolvers.Query.steps())[0].key;
    let release = await resolvers.Mutation.toggleStep(null, {
      id: releaseId,
      stepKey: firstKey,
      completed: true,
    });
    expect(release.status).toBe("ongoing");

    for (const step of release.steps) {
      release = await resolvers.Mutation.toggleStep(null, {
        id: releaseId,
        stepKey: step.key,
        completed: true,
      });
    }
    expect(release.status).toBe("done");
  });
});
