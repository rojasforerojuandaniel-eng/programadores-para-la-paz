import { cn } from "@/lib/utils";

interface ClientAvatarProps {
  name: string;
  className?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function ClientAvatar({ name, className }: ClientAvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-primary/10 font-semibold text-primary ring-1 ring-primary/10",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
