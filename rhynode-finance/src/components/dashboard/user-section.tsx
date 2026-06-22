"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function UserSection({ mobile = false }: { mobile?: boolean }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const t = useTranslations("dashboard.nav");

  if (!user) return null;

  const initials =
    user.firstName?.[0] ||
    user.lastName?.[0] ||
    user.emailAddresses?.[0]?.emailAddress?.[0] ||
    "?";

  return (
    <div className={cn("border-t border-border", mobile ? "p-4" : "p-4")}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {user.fullName ||
              user.primaryEmailAddress?.emailAddress ||
              "Usuario"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="h-10 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => signOut({ redirectUrl: "/" })}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {t("signOut" as never)}
      </Button>
    </div>
  );
}
