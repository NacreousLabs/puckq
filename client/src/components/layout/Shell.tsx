import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, ShieldHalf, Settings, Activity, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Teams", href: "/teams", icon: ShieldHalf },
  { name: "Players", href: "/players", icon: Users },
  { name: "Analytics", href: "/analytics", icon: Activity },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden selection:bg-primary/30 transition-colors duration-300">
      
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r flex-shrink-0 flex flex-col z-10 relative bg-sidebar text-sidebar-foreground">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-primary font-display font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <ShieldHalf size={18} className="text-primary" />
            </div>
            PuckQ
          </div>
        </div>
        
        <div className="flex-1 py-6 px-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link key={item.name} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                )}
                <Icon size={18} className={cn(
                  "transition-colors",
                  isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                )} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border flex flex-col gap-1">
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
          >
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </div>
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full">
            <Settings size={18} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none opacity-50 mix-blend-screen dark:mix-blend-screen mix-blend-multiply" />
        
        <div className="h-16 flex items-center justify-between px-8 border-b glass-panel z-10 sticky top-0">
          <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Cap Update: <span className="text-foreground font-semibold">$88.0M for 2024-25 Season</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              GM
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-8 z-0">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}