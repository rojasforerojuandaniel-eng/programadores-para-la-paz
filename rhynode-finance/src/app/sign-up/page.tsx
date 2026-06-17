import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = buildMetadata({
  title: "Crear cuenta gratis",
  description:
    "Regístrate gratis en Rhynode. Controla tu dinero, ahorra con inteligencia y gestiona tu negocio en Colombia. Soporte Wompi y facturación DIAN.",
  path: "/sign-up",
  keywords: ["registro", "crear cuenta", "fintech Colombia", "finanzas gratis"],
});

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
