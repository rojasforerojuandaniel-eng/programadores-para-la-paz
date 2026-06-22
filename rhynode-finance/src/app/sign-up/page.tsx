import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo-metadata";
import { getLocale } from "@/lib/locale-server";
import { SignUpForm } from "@/components/auth/sign-up-form";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth.signUp" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/sign-up",
    keywords: [t("kw1"), t("kw2"), t("kw3"), t("kw4")],
  });
}

export default function SignUpPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-background p-4"
    >
      <SignUpForm />
    </main>
  );
}