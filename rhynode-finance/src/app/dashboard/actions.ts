"use server";

import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/prisma";
import type { UserScope } from "@/lib/scope";
import { revalidatePath } from "next/cache";

export async function updateUserScope(scope: UserScope) {
  const session = await auth();
  const clerkId = session?.userId;
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  const prisma = getPrisma();
  await prisma.userProfile.update({
    where: { clerkId },
    data: { scope },
  });

  revalidatePath("/dashboard");
}
