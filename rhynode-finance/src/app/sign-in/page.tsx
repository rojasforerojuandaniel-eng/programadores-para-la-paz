import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Iniciar sesión — Rhynode",
  description:
    "Accede a tu cuenta de Rhynode. Gestiona tus finanzas personales y empresariales de forma segura.",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignInForm />
    </div>
  );
}
