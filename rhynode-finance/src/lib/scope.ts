export type UserScope = "PERSONAL" | "BUSINESS" | "BOTH";

export function getDefaultScope(): UserScope {
  return "PERSONAL";
}

export function canAccessBusiness(scope: UserScope): boolean {
  return scope === "BUSINESS" || scope === "BOTH";
}

export function canAccessPersonal(scope: UserScope): boolean {
  return scope === "PERSONAL" || scope === "BOTH";
}

export function scopeLabel(scope: UserScope): string {
  switch (scope) {
    case "PERSONAL":
      return "Personal";
    case "BUSINESS":
      return "Empresa";
    case "BOTH":
      return "Ambas";
  }
}
