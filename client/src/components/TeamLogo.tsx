import { cn } from "@/lib/utils";

interface TeamLogoProps {
  abbreviation: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function TeamLogo({ abbreviation, color, size = "md", className }: TeamLogoProps) {
  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-8 h-8 text-[11px]",
    lg: "w-10 h-10 text-xs",
  };

  return (
    <div
      className={cn(
        "rounded-md flex items-center justify-center font-display font-bold tracking-wider text-white border border-white/20 shadow-sm shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: color }}
      data-testid={`logo-${abbreviation}`}
    >
      {abbreviation}
    </div>
  );
}