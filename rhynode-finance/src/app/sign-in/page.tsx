import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo-metadata";
import { getLocale } from "@/lib/locale-server";
import { SignInForm } from "@/components/auth/sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth.signIn" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/sign-in",
    keywords: [t("kw1"), t("kw2"), t("kw3"), t("kw4")],
  });
}

export default function SignInPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-background p-4"
    >
      <SignInForm />
    </main>
  );
}