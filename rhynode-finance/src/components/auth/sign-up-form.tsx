"use client";

import { SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { AuthLayout } from "./auth-layout";
import { getClerkAppearance } from "@/lib/clerk-appearance";

export function SignUpForm() {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("auth.common");
  const isDark = resolvedTheme === "dark";

  return (
    <AuthLayout
      title={t("signUpTitle")}
      subtitle={t("subtitle")}
    >
      <SignUp
        fallbackRedirectUrl="/onboarding"
        signInUrl="/sign-in"
        routing="hash"
        appearance={getClerkAppearance(isDark)}
      />
    </AuthLayout>
  );
}
