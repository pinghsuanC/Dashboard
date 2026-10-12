import { Prisma } from "@/generated/prisma/client";

// Prisma's answer when an update's `where` matches no row.
export const isRecordNotFound = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";

// Prisma's answer when a write breaks a unique index.
export const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
