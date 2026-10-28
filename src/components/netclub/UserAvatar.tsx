import { cn } from "@/lib/utils";
import { initials } from "@/lib/netclub";

export function UserAvatar({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-deep font-display text-sm font-semibold text-accent-foreground",
        className,
      )}
    >
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </div>
  );
}
