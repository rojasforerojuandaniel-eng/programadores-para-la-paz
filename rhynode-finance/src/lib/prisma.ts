import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Clean URL: ensure sslmode=require and remove channel_binding which can cause issues with some Neon drivers
  let cleanUrl = connectionString;
  if (!cleanUrl.includes("sslmode=")) {
    cleanUrl += cleanUrl.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }
  cleanUrl = cleanUrl.replace(/&?channel_binding=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");

  const adapter = new PrismaNeon({ connectionString: cleanUrl });
  return new PrismaClient({ adapter });
}

let prismaInstance: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance;
  prismaInstance = globalForPrisma.prisma || createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
  return prismaInstance;
}

// Lazy proxy for backwards compatibility with existing code
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    const client = getPrisma();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
