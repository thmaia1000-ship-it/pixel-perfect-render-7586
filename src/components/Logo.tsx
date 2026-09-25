export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground font-display text-sm font-extrabold text-primary">
        B3
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight">
        BR3<span className="text-primary"> Tech</span>
      </span>
    </span>
  );
}
