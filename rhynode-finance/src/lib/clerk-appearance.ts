import { dark } from "@clerk/themes";

type ClerkAppearance = {
  baseTheme?: unknown;
  variables?: Record<string, string | number>;
  elements?: Record<string, string>;
};

export function getClerkAppearance(isDark: boolean): ClerkAppearance {
  return {
    baseTheme: isDark ? dark : undefined,
    variables: {
      colorPrimary: "hsl(var(--primary))",
      colorBackground: "hsl(var(--card))",
      colorText: "hsl(var(--foreground))",
      colorTextSecondary: "hsl(var(--muted-foreground))",
      colorInputBackground: "hsl(var(--background))",
      colorInputText: "hsl(var(--foreground))",
      colorDanger: "hsl(var(--destructive))",
      borderRadius: "0.75rem",
      fontFamily: "var(--font-sans)",
    },
    elements: {
      rootBox: "w-full",
      card: "shadow-xl border border-border bg-card",
      headerTitle: "text-2xl font-bold text-center",
      headerSubtitle: "text-muted-foreground text-center",
      socialButtonsBlockButton: "border-border hover:bg-muted",
      dividerLine: "bg-border",
      dividerText: "text-muted-foreground text-xs",
      formFieldLabel: "text-foreground text-sm font-medium",
      formFieldInput:
        "bg-background border border-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
      formButtonPrimary:
        "bg-primary hover:bg-primary/90 text-primary-foreground font-medium",
      footer: "hidden",
      logoBox: "hidden",
      footerActionLink: "text-primary hover:text-primary/90",
      identityPreviewEditButton: "text-primary hover:text-primary/90",
      formFieldErrorText: "text-destructive text-sm",
      alertText: "text-destructive text-sm",
      alternativeMethodsBlockButton:
        "border border-border bg-background hover:bg-muted text-foreground",
      otpCodeFieldInput:
        "bg-background border border-input text-foreground",
    },
  };
}
