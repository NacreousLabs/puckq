import { cn } from "@/lib/utils";
import * as NHLLogos from "react-nhl-logos";

interface TeamLogoProps {
  abbreviation: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: 28,
  md: 32,
  lg: 40,
};

export default function TeamLogo({ abbreviation, color, size = "md", className }: TeamLogoProps) {
  const LogoComponent = (NHLLogos as Record<string, React.ComponentType<{ size?: number }>>)[abbreviation];

  if (LogoComponent) {
    return (
      <div
        className={cn("shrink-0 flex items-center justify-center", className)}
        data-testid={`logo-${abbreviation}`}
      >
        <LogoComponent size={sizeMap[size]} />
      </div>
    );
  }

  // Fallback to abbreviation badge for unknown teams
  const textSizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-8 h-8 text-[11px]",
    lg: "w-10 h-10 text-xs",
  };

  return (
    <div
      className={cn(
        "rounded-md flex items-center justify-center font-display font-bold tracking-wider text-white border border-white/20 shadow-sm shrink-0",
        textSizeClasses[size],
        className
      )}
      style={{ backgroundColor: color }}
      data-testid={`logo-${abbreviation}`}
    >
      {abbreviation}
    </div>
  );
}
