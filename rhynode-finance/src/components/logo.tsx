import { cn } from "@/lib/utils";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

interface LogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: "h-5 w-5", box: "h-7 w-7", text: "text-base" },
  md: { icon: "h-5 w-5", box: "h-8 w-8", text: "text-lg" },
  lg: { icon: "h-6 w-6", box: "h-10 w-10", text: "text-xl" },
};

export function Logo({ className, href = "/", size = "md" }: LogoProps) {
  const s = sizes[size];
  const content = (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
          s.box
        )}
      >
        <TrendingUp className={s.icon} aria-hidden="true" />
      </div>
      <span className={cn("font-bold tracking-tight text-foreground", s.text)}>Rhynode</span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
