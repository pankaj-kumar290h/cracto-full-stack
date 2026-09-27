import { PrismaClient } from "@prisma/client";

// Singleton client — never instantiate PrismaClient per-request,
// that alone is one of the most common sources of connection exhaustion.
export const prisma = new PrismaClient();
