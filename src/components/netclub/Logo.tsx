export function Logo({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      Net<span className="text-primary">C</span>lub<span className="text-gold">.</span>
    </span>
  );
}
