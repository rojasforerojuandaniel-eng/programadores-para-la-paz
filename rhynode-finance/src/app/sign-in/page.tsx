import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = buildMetadata({
  title: "Iniciar sesión",
  description:
    "Accede de forma segura a tu cuenta de Rhynode. Gestiona tus finanzas personales y empresariales desde Colombia.",
  path: "/sign-in",
  keywords: ["iniciar sesión", "login", "autenticación segura", "finanzas Colombia"],
});

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
