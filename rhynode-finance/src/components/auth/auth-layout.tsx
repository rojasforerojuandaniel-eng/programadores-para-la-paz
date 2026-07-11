"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showBackLink?: boolean;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showBackLink = true,
}: AuthLayoutProps) {
  const t = useTranslations("auth.common");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute top-0 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-chart-2/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo href="/" size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-1">
          {children}
        </div>

        {showBackLink && (
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("backToHome")}
          </Link>
        )}
      </div>
    </div>
  );
}
