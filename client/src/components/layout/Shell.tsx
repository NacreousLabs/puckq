import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, ShieldHalf, Settings, Activity, Moon, Sun, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useState, useEffect, useCallback } from "react";
import { api, invalidateAll } from "@/lib/api";

const COOLDOWN_MS = 15 * 60 * 1000;
const STORAGE_KEY = "puckq:lastRefresh";

function formatCountdown(ms: number) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function useRefreshCooldown() {
  const [lastRefresh, setLastRefresh] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : 0;
  });
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const remaining = COOLDOWN_MS - (now - lastRefresh);
    if (remaining <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastRefresh, now]);

  const remaining = Math.max(0, COOLDOWN_MS - (now - lastRefresh));

  const markRefreshed = useCallback(() => {
    const ts = Date.now();
    localStorage.setItem(STORAGE_KEY, String(ts));
    setLastRefresh(ts);
    setNow(ts);
  }, []);

  return { canRefresh: remaining === 0, remaining, markRefreshed };
}

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Teams", href: "/teams", icon: ShieldHalf },
  { name: "Players", href: "/players", icon: Users },
  { name: "Analytics", href: "/analytics", icon: Activity },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { canRefresh, remaining, markRefreshed } = useRefreshCooldown();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (!canRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await api.nhl.syncGames();
      invalidateAll();
      markRefreshed();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary/20 transition-colors duration-300">

      {/* Top Navigation */}
      <header className="h-14 flex items-center justify-between px-6 glass-header z-20 sticky top-0 shrink-0">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5 font-display font-bold text-[17px] tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 dark:bg-primary/15 dark:border-primary/25">
              <ShieldHalf size={15} className="text-primary" />
            </div>
            <span className="text-foreground">Puck<span className="text-primary">Q</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));

              return (
                <Link key={item.name} href={item.href} className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "text-primary bg-primary/8 dark:bg-primary/12"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}>
                  <Icon size={15} strokeWidth={isActive ? 2 : 1.75} className={cn(
                    "transition-colors",
                    isActive ? "text-primary" : ""
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-medium px-3 py-1.5 rounded-lg bg-secondary/60 dark:bg-secondary/40 border border-border/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse"></span>
            <span>Cap</span>
            <span className="text-foreground font-semibold font-mono text-[12px]">$88.0M</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={!canRefresh || refreshing}
              title={canRefresh ? "Refresh NHL data" : `Next refresh in ${formatCountdown(remaining)}`}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                canRefresh && !refreshing
                  ? "text-muted-foreground hover:text-foreground hover:bg-accent/60 cursor-pointer"
                  : "text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              <RefreshCw
                size={13}
                strokeWidth={2}
                className={refreshing ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">
                {refreshing ? "Syncing…" : canRefresh ? "Refresh" : formatCountdown(remaining)}
              </span>
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
            </button>
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors" title="Settings">
              <Settings size={16} strokeWidth={1.75} />
            </button>
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-[11px] font-bold text-primary ml-1.5 cursor-pointer hover:bg-primary/15 transition-colors">
              GM
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Subtle decorative gradient */}
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[150px] -z-10 pointer-events-none dark:bg-primary/5" />

        {/* Mobile Navigation */}
        <div className="md:hidden flex overflow-x-auto py-2 px-4 gap-1.5 border-b border-border/50 bg-background shrink-0 z-10">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} className={cn(
                "whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
              )}>
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto p-5 md:p-8 lg:p-10 z-0">
          <div className="w-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-400">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}
