import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  Link2,
  Users,
  BarChart3,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "@/lib/locale-server";

interface QuickActionsCardProps {
  className?: string;
}

const actions = [
  {
    labelKey: "business.quickActions.createInvoice",
    href: "/dashboard/invoices",
    icon: FileText,
  },
  {
    labelKey: "business.quickActions.createPaymentLink",
    href: "/dashboard/payment-links",
    icon: Link2,
  },
  {
    labelKey: "business.quickActions.addClient",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    labelKey: "business.quickActions.viewReports",
    href: "/dashboard/stats",
    icon: BarChart3,
  },
];

export async function QuickActionsCard({ className }: QuickActionsCardProps) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.home" });

  return (
    <Card className={cn("surface-elevated-2", className)}>
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          {t("business.quickActions.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {actions.map((action) => (
            <Button
              key={action.href}
              asChild
              variant="outline"
              className="h-11 w-full justify-start gap-2"
            >
              <Link href={action.href}>
                <action.icon className="h-4 w-4" aria-hidden="true" />
                {t(action.labelKey as never)}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
