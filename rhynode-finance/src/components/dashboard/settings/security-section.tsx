
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, KeyRound, AlertCircle } from "lucide-react";

export function SecuritySection() {
  return (
    <div className="space-y-4">
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Seguridad de la Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="body-default">
            La autenticación y gestión de credenciales están protegidas por Clerk.
            Para actualizar tu contraseña, activar autenticación de dos factores o
            revisar sesiones activas, usa el menú de usuario en la barra lateral.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-medium">Contraseña segura</div>
                <div className="text-sm text-muted-foreground">
                  Usa una contraseña única y guardada en un gestor de contraseñas.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <KeyRound className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-medium">Autenticación de dos factores</div>
                <div className="text-sm text-muted-foreground">
                  Activa 2FA desde el portal de usuario para proteger el acceso.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-medium">Sesiones y dispositivos</div>
                <div className="text-sm text-muted-foreground">
                  Revisa y cierra sesiones sospechosas desde tu proveedor de identidad.
                </div>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
