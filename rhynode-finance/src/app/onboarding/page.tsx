import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateAuthOrg } from "@/lib/auth";
import OnboardingFlow from "./onboarding-flow";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.userId) {
    redirect("/sign-in");
  }

  const org = await getOrCreateAuthOrg();

  if (!org) {
    redirect("/sign-in");
  }

  if (org.onboardingCompleted) {
    redirect("/dashboard");
  }

  return <OnboardingFlow />;
}
