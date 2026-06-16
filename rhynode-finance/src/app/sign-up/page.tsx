import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Crear cuenta — Rhynode",
  description:
    "Regístrate gratis en Rhynode. Controla tu dinero, ahorra con inteligencia y gestiona tu negocio desde Colombia.",
};

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
