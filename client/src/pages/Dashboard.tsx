import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, MOCK_TEAMS, RECENT_TRANSACTIONS } from "@/lib/mock-data";
import { ArrowUpRight, DollarSign, TrendingUp, Users, ShieldAlert } from "lucide-react";

export default function Dashboard() {
  const totalLeagueCap = MOCK_TEAMS.reduce((acc, team) => acc + team.capHit, 0);
  const totalLTIR = MOCK_TEAMS.reduce((acc, team) => acc + team.ltir, 0);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-1">League Overview</h1>
          <p className="text-sm text-muted-foreground">Comprehensive look at NHL team caps and recent transactions.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-muted-foreground">Upper Limit:</span>
            <span className="font-semibold">$88.0M</span>
          </div>
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-muted-foreground">Floor:</span>
            <span className="font-semibold">$65.0M</span>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-0 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Cap Hit</CardTitle>
            <DollarSign className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-display font-bold">{formatCurrency(totalLeagueCap)}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500 font-medium">+2.4%</span> from 23-24
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-0 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Contracts</CardTitle>
            <Users className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-display font-bold">1,452</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Max 1,600 (50 per team)
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Average Cap Hit</CardTitle>
            <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-display font-bold">{formatCurrency(totalLeagueCap / 32)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Per active franchise
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">League LTIR Pool</CardTitle>
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-display font-bold">{formatCurrency(totalLTIR)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Relief across all teams
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Col - Team Cap Space */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-panel border-0 bg-card">
            <CardHeader className="px-4 py-3 border-b border-border/50">
              <CardTitle className="font-display text-sm">Cap Space Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {[...MOCK_TEAMS].sort((a, b) => b.capSpace - a.capSpace).map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-background shadow-sm border border-border">
                        {team.logo}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{team.name}</div>
                        <div className="text-[11px] text-muted-foreground flex gap-3">
                          <span>Hit: {formatCurrency(team.capHit)}</span>
                          <span className="text-border/40">|</span>
                          <span>LTIR: {formatCurrency(team.ltir)}</span>
                          <span className="text-border/40">|</span>
                          <span>{team.contracts}/50 Contracts</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(team.capSpace)}</div>
                      <div className="text-[11px] text-muted-foreground">Proj: {formatCurrency(team.projectedCapSpace)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col - Recent Transactions */}
        <div className="space-y-4">
          <Card className="glass-panel border-0 bg-card">
            <CardHeader className="px-4 py-3 border-b border-border/50">
              <CardTitle className="font-display text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-5 border-l-2 border-border/50 ml-2 pl-4 relative">
                {RECENT_TRANSACTIONS.map((tx) => (
                  <div key={tx.id} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card" />
                    <div className="text-[10px] text-primary mb-0.5 font-medium uppercase tracking-wider">{tx.date}</div>
                    <div className="font-medium text-sm leading-tight">{tx.player}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0 rounded-[4px] text-[9px] uppercase font-bold bg-secondary text-foreground">
                          {tx.type}
                        </span>
                        <span className="font-medium text-foreground/80">{tx.team}</span>
                      </div>
                      <span className="opacity-80">{tx.details}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}