interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "default" | "print";
}

export function Logo({
  className = "",
  size = "md",
  showText = true,
  variant = "default",
}: LogoProps) {
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

  const ehImpresso = variant === "print";

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <span className="relative flex shrink-0 items-center justify-center">
        <img
          src="/images/logo3d.jpg"
          alt="Br3 Tech"
          className={`${sizeMap[size]} rounded-xl object-cover ${
            ehImpresso
              ? "bg-white border border-slate-300 shadow-none"
              : "bg-black/80 border border-primary/40 shadow-md shadow-primary/20 transition-all hover:scale-105 hover:border-primary"
          }`}
        />
        {!ehImpresso && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary animate-pulse" />
        )}
      </span>

      {showText && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display font-black tracking-tight ${textMap[size]} ${
              ehImpresso ? "text-black logo-texto-print" : "text-foreground"
            }`}
            style={ehImpresso ? { color: "#000000" } : undefined}
          >
            <span
              className={`logo-texto-letra-br ${
                ehImpresso ? "text-black font-black" : "text-foreground"
              }`}
              style={ehImpresso ? { color: "#000000" } : undefined}
            >
              Br
            </span>
            <span
              className="logo-numero-3 text-primary font-black"
              style={{
                color: "var(--primary, #10b981)",
              }}
            >
              3
            </span>{" "}
            <span
              className={`logo-texto-letra-tech ${
                ehImpresso ? "text-black font-black" : "text-foreground/95"
              }`}
              style={ehImpresso ? { color: "#000000" } : undefined}
            >
              Tech
            </span>
          </span>
          <span
            className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 ${
              ehImpresso ? "text-slate-700" : "text-muted-foreground"
            }`}
            style={ehImpresso ? { color: "#334155" } : undefined}
          >
            Laboratório de Tecnologia
          </span>
        </span>
      )}
    </span>
  );
}
