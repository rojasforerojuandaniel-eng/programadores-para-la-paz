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

interface QuickActionsCardProps {
  className?: string;
}

const actions = [
  {
    label: "Crear factura",
    href: "/dashboard/invoices",
    icon: FileText,
  },
  {
    label: "Crear link de pago",
    href: "/dashboard/payment-links",
    icon: Link2,
  },
  {
    label: "Agregar cliente",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    label: "Ver reportes",
    href: "/dashboard/stats",
    icon: BarChart3,
  },
];

export function QuickActionsCard({ className }: QuickActionsCardProps) {
  return (
    <Card className={cn("surface-elevated-2", className)}>
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          Acciones Rápidas
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
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
