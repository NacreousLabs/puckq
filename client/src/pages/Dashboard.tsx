import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, api, invalidateAll } from "@/lib/api";
import { ArrowUpRight, DollarSign, TrendingUp, Users, ShieldAlert, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Team, Transaction } from "@shared/schema";

export default function Dashboard() {
  const { data: teams = [], isLoading: teamsLoading } = useQuery({ queryKey: ["teams"], queryFn: api.teams.list });
  const { data: transactions = [], isLoading: txLoading } = useQuery({ queryKey: ["transactions"], queryFn: api.transactions.list });
  const { data: players = [] } = useQuery({ queryKey: ["players"], queryFn: api.players.list });

  const seedMutation = useMutation({ mutationFn: api.seed, onSuccess: () => invalidateAll() });

  useEffect(() => {
    if (!teamsLoading && teams.length === 0) {
      seedMutation.mutate();
    }
  }, [teamsLoading, teams.length]);

  if (teamsLoading || txLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalLeagueCap = teams.reduce((acc: number, team: Team) => acc + team.capHit, 0);
  const totalLTIR = teams.reduce((acc: number, team: Team) => acc + team.ltir, 0);
  const totalContracts = players.length;
  
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-0 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Cap Hit</CardTitle>
            <DollarSign className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-display font-bold" data-testid="text-total-cap">{formatCurrency(totalLeagueCap)}</div>
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
            <div className="text-2xl font-display font-bold" data-testid="text-total-contracts">{totalContracts}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Across {teams.length} tracked teams
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Average Cap Hit</CardTitle>
            <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-display font-bold">{formatCurrency(teams.length > 0 ? totalLeagueCap / teams.length : 0)}</div>
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
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-panel border-0 bg-card">
            <CardHeader className="px-4 py-3 border-b border-border/50">
              <CardTitle className="font-display text-sm">Cap Space Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {[...teams].sort((a: Team, b: Team) => b.capSpace - a.capSpace).map((team: Team) => (
                  <div key={team.id} data-testid={`row-team-${team.id}`} className="flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors">
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

        <div className="space-y-4">
          <Card className="glass-panel border-0 bg-card">
            <CardHeader className="px-4 py-3 border-b border-border/50">
              <CardTitle className="font-display text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
              ) : (
                <div className="space-y-5 border-l-2 border-border/50 ml-2 pl-4 relative">
                  {transactions.map((tx: Transaction) => (
                    <div key={tx.id} className="relative" data-testid={`row-tx-${tx.id}`}>
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}