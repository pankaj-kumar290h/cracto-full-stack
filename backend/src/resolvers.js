import { prisma } from "./db.js";
import { STEPS, STEP_KEYS, computeStatus } from "./steps.js";
import { cacheGet, cacheSet, cacheClear } from "./cache.js";

const RELEASES_CACHE_KEY = "releases";
const RELEASES_CACHE_TTL_MS = 2000;

function toGraphRelease(release) {
  const completed = new Set(release.completedSteps ?? []);
  return {
    id: release.id,
    name: release.name,
    date: release.date.toISOString(),
    additionalInfo: release.additionalInfo,
    status: computeStatus(release.completedSteps),
    steps: STEPS.map((s) => ({ ...s, completed: completed.has(s.key) })),
    createdAt: release.createdAt.toISOString(),
  };
}

export const resolvers = {
  Query: {
    releases: async () => {
      const cached = cacheGet(RELEASES_CACHE_KEY);
      if (cached) return cached;

      const releases = await prisma.release.findMany({
        orderBy: { createdAt: "desc" },
      });
      const result = releases.map(toGraphRelease);
      cacheSet(RELEASES_CACHE_KEY, result, RELEASES_CACHE_TTL_MS);
      return result;
    },
    release: async (_parent, { id }) => {
      const release = await prisma.release.findUnique({ where: { id } });
      return release ? toGraphRelease(release) : null;
    },
    steps: () => STEPS.map((s) => ({ ...s, completed: false })),
  },

  Mutation: {
    createRelease: async (_parent, { input }) => {
      const release = await prisma.release.create({
        data: {
          name: input.name,
          date: new Date(input.date),
          additionalInfo: input.additionalInfo ?? null,
          completedSteps: [],
        },
      });
      cacheClear();
      return toGraphRelease(release);
    },

    toggleStep: async (_parent, { id, stepKey, completed }) => {
      if (!STEP_KEYS.includes(stepKey)) {
        throw new Error(`Unknown step key: ${stepKey}`);
      }
      const existing = await prisma.release.findUnique({ where: { id } });
      if (!existing) throw new Error("Release not found");

      const current = new Set(existing.completedSteps ?? []);
      if (completed) current.add(stepKey);
      else current.delete(stepKey);

      const release = await prisma.release.update({
        where: { id },
        data: { completedSteps: Array.from(current) },
      });
      cacheClear();
      return toGraphRelease(release);
    },

    updateAdditionalInfo: async (_parent, { id, additionalInfo }) => {
      const release = await prisma.release.update({
        where: { id },
        data: { additionalInfo: additionalInfo ?? null },
      });
      cacheClear();
      return toGraphRelease(release);
    },

    deleteRelease: async (_parent, { id }) => {
      await prisma.release.delete({ where: { id } });
      cacheClear();
      return true;
    },
  },
};
