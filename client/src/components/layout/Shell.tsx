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
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary/30 transition-colors duration-300">
      
      {/* Top Navigation */}
      <header className="h-14 flex items-center justify-between px-6 border-b glass-panel z-20 sticky top-0 shrink-0 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-primary font-display font-bold text-lg tracking-tight">
            <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <ShieldHalf size={16} className="text-primary" />
            </div>
            PuckQ
          </div>
          
          <nav className="flex items-center gap-1 hidden md:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              
              return (
                <Link key={item.name} href={item.href} className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}>
                  <Icon size={16} className={cn(
                    "transition-colors",
                    isActive ? "text-primary" : "text-sidebar-foreground/70"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-medium px-3 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Cap: <span className="text-foreground font-semibold">$88.0M</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="p-1.5 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors" title="Settings">
              <Settings size={18} />
            </button>
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary ml-2 cursor-pointer hover:bg-primary/20 transition-colors">
              GM
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none opacity-50 mix-blend-screen dark:mix-blend-screen mix-blend-multiply" />
        
        {/* Mobile Navigation - Only visible on small screens */}
        <div className="md:hidden flex overflow-x-auto py-2 px-4 gap-2 border-b border-border bg-sidebar shrink-0 z-10">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} className={cn(
                "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}>
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 z-0">
          <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}