"use client";

import { SignIn } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { AuthLayout } from "./auth-layout";
import { getClerkAppearance } from "@/lib/clerk-appearance";

export function SignInForm() {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("auth.common");
  const isDark = resolvedTheme === "dark";

  return (
    <AuthLayout
      title={t("signInTitle")}
      subtitle={t("subtitle")}
    >
      <SignIn
        fallbackRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
        routing="hash"
        appearance={getClerkAppearance(isDark)}
      />
    </AuthLayout>
  );
}
