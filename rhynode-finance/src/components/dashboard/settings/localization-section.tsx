
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

interface Organization {
  name: string;
  taxId: string;
  country: string;
  currency: string;
  timezone: string;
}

interface LocalizationSectionProps {
  org: Organization;
  onChange: (org: Organization) => void;
  saving: boolean;
}

export function LocalizationSection({
  org,
  onChange,
  saving,
}: LocalizationSectionProps) {
  return (
    <Card className="surface-elevated-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="heading-card flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Regional
        </CardTitle>
        <Button type="submit" disabled={saving} size="sm" className="hidden sm:inline-flex">
          Guardar Cambios
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="settings-country">País</Label>
            <Select
              value={org.country}
              onValueChange={(v) => onChange({ ...org, country: v })}
            >
              <SelectTrigger id="settings-country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CO">Colombia</SelectItem>
                <SelectItem value="MX">México</SelectItem>
                <SelectItem value="BR">Brasil</SelectItem>
                <SelectItem value="AR">Argentina</SelectItem>
                <SelectItem value="CL">Chile</SelectItem>
                <SelectItem value="PE">Perú</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-currency">Moneda</Label>
            <Select
              value={org.currency}
              onValueChange={(v) => onChange({ ...org, currency: v })}
            >
              <SelectTrigger id="settings-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COP">COP — Peso Colombiano</SelectItem>
                <SelectItem value="MXN">MXN — Peso Mexicano</SelectItem>
                <SelectItem value="BRL">BRL — Real Brasileño</SelectItem>
                <SelectItem value="ARS">ARS — Peso Argentino</SelectItem>
                <SelectItem value="CLP">CLP — Peso Chileno</SelectItem>
                <SelectItem value="PEN">PEN — Sol Peruano</SelectItem>
                <SelectItem value="USD">USD — Dólar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-timezone">Zona Horaria</Label>
            <Select
              value={org.timezone}
              onValueChange={(v) => onChange({ ...org, timezone: v })}
            >
              <SelectTrigger id="settings-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Bogota">Bogotá</SelectItem>
                <SelectItem value="America/Mexico_City">Ciudad de México</SelectItem>
                <SelectItem value="America/Sao_Paulo">São Paulo</SelectItem>
                <SelectItem value="America/Argentina/Buenos_Aires">Buenos Aires</SelectItem>
                <SelectItem value="America/Santiago">Santiago</SelectItem>
                <SelectItem value="America/Lima">Lima</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={saving} className="w-full sm:hidden">
          Guardar Cambios
        </Button>
      </CardContent>
    </Card>
  );
}
