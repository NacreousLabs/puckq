import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, api, invalidateAll } from "@/lib/api";
import { ArrowUpRight, DollarSign, TrendingUp, Users, ShieldAlert, Loader2, Newspaper } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Team, Transaction } from "@shared/schema";
import TeamLogo from "@/components/TeamLogo";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: teams = [], isLoading: teamsLoading } = useQuery({ queryKey: ["teams"], queryFn: api.teams.list });
  const { data: transactions = [], isLoading: txLoading } = useQuery({ queryKey: ["transactions"], queryFn: api.transactions.list });
  const { data: players = [] } = useQuery({ queryKey: ["players"], queryFn: api.players.list });

  const seedMutation = useMutation({ mutationFn: api.seed, onSuccess: () => invalidateAll() });
  const scrapeNewsMutation = useMutation({
    mutationFn: () => api.scrape.news("all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  useEffect(() => {
    if (!teamsLoading && teams.length === 0) {
      seedMutation.mutate();
    }
  }, [teamsLoading, teams.length]);

  if (teamsLoading || txLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
      </div>
    );
  }

  const totalLeagueCap = teams.reduce((acc: number, team: Team) => acc + team.capHit, 0);
  const totalLTIR = teams.reduce((acc: number, team: Team) => acc + team.ltir, 0);
  const totalContracts = players.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold mb-1.5">League Overview</h1>
          <p className="text-sm text-muted-foreground">NHL team cap situations and recent transactions.</p>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <div className="px-3 py-1.5 rounded-lg bg-card border border-border/60 flex items-center gap-2">
            <span className="text-muted-foreground">Ceiling</span>
            <span className="font-semibold font-mono">$88.0M</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-card border border-border/60 flex items-center gap-2">
            <span className="text-muted-foreground">Floor</span>
            <span className="font-semibold font-mono">$65.0M</span>
          </div>
          <button
            onClick={() => scrapeNewsMutation.mutate()}
            disabled={scrapeNewsMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-border/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Scrape latest NHL transactions from news sources"
          >
            <Newspaper size={13} className={scrapeNewsMutation.isPending ? "animate-pulse" : ""} />
            {scrapeNewsMutation.isPending ? "Scraping…" : "Scrape News"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Cap Hit",
            value: formatCurrency(totalLeagueCap),
            icon: DollarSign,
            testId: "text-total-cap",
            sub: (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">+2.4%</span>
                <span className="text-muted-foreground">from 23-24</span>
              </span>
            ),
          },
          {
            label: "Active Contracts",
            value: totalContracts,
            icon: Users,
            testId: "text-total-contracts",
            sub: <span>Across {teams.length} franchises</span>,
          },
          {
            label: "Average Cap Hit",
            value: formatCurrency(teams.length > 0 ? totalLeagueCap / teams.length : 0),
            icon: ArrowUpRight,
            sub: <span>Per active franchise</span>,
          },
          {
            label: "League LTIR Pool",
            value: formatCurrency(totalLTIR),
            icon: ShieldAlert,
            iconColor: "text-destructive/70",
            sub: <span>Relief across all teams</span>,
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="glass-panel bg-card border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.iconColor || "text-primary/60"}`} strokeWidth={1.75} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-display font-semibold tracking-tight" data-testid={kpi.testId}>{kpi.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1.5">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card className="glass-panel bg-card border-border/40">
            <CardHeader className="px-5 py-3.5 border-b border-border/40">
              <CardTitle className="font-display text-sm font-medium">Available Cap Space</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {[...teams].sort((a: Team, b: Team) => a.capSpace - b.capSpace).map((team: Team) => (
                  <div key={team.id} data-testid={`row-team-${team.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <TeamLogo abbreviation={team.abbreviation} color={team.color} />
                      <div>
                        <div className="font-medium text-sm">{team.name}</div>
                        <div className="text-[11px] text-muted-foreground flex gap-3 mt-0.5">
                          <span>Hit: <span className="font-mono">{formatCurrency(team.capHit)}</span></span>
                          <span className="text-border">|</span>
                          <span>LTIR: <span className="font-mono">{formatCurrency(team.ltir)}</span></span>
                          <span className="text-border">|</span>
                          <span>{team.contracts}/50</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(team.capSpace)}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">Proj: {formatCurrency(team.projectedCapSpace)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-panel bg-card border-border/40">
            <CardHeader className="px-5 py-3.5 border-b border-border/40">
              <CardTitle className="font-display text-sm font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
              ) : (
                <div className="space-y-5 border-l border-border/50 ml-1.5 pl-4 relative">
                  {transactions.map((tx: Transaction) => (
                    <div key={tx.id} className="relative" data-testid={`row-tx-${tx.id}`}>
                      <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-primary/70 ring-[3px] ring-card" />
                      <div className="text-[10px] text-primary/80 mb-0.5 font-medium uppercase tracking-wider">{tx.date}</div>
                      <div className="font-medium text-sm leading-tight">{tx.player}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block px-1.5 py-px rounded text-[9px] uppercase font-semibold bg-secondary/80 text-foreground/80 tracking-wide">
                            {tx.type}
                          </span>
                          <span className="font-medium text-foreground/70">{tx.team}</span>
                        </div>
                        <span className="text-muted-foreground/80">{tx.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}