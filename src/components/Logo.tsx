import logoAsset from "@/assets/br3-logo.png.asset.json";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src={logoAsset.url}
        alt="Br3 Tech"
        className="h-9 w-auto rounded-md bg-foreground/95 px-2 py-1"
      />
    </span>
  );
}
