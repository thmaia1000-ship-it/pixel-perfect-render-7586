interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export function Logo({ className = "", size = "md", showText = true }: LogoProps) {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  };

  const textMap = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <span className="relative flex shrink-0 items-center justify-center">
        <img
          src="/images/logo3d.jpg"
          alt="Br3 Tech"
          className={`${sizeMap[size]} rounded-xl object-cover bg-black/80 border border-primary/40 shadow-md shadow-primary/20 transition-all hover:scale-105 hover:border-primary`}
        />
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary animate-pulse" />
      </span>
      {showText && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display font-extrabold tracking-tight text-foreground ${textMap[size]}`}
          >
            Br<span className="text-primary">3</span>{" "}
            <span className="text-foreground/95">Tech</span>
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground mt-0.5">
            Assistência Técnica
          </span>
        </span>
      )}
    </span>
  );
}
