import { formatCurrency, api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Player, Transaction } from "@shared/schema";
import TeamLogo from "@/components/TeamLogo";

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["teams", teamId],
    queryFn: () => api.teams.get(teamId),
  });

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ["teams", teamId, "players"],
    queryFn: () => api.teams.players(teamId),
    enabled: !!team,
  });

  const { data: allTransactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: api.transactions.list,
    enabled: !!team,
  });

  if (teamLoading || playersLoading || txLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-base font-medium">Team not found</p>
        <Link href="/teams" className="text-sm text-primary mt-2 hover:underline">
          Back to teams
        </Link>
      </div>
    );
  }

  const teamTransactions = allTransactions.filter(
    (tx: Transaction) =>
      tx.team.includes(team.abbreviation) ||
      tx.team.toLowerCase().includes(team.name.toLowerCase())
  );

  const capPercentage = (team.capHit / 88000000) * 100;
  const isCloseToCap = team.capSpace < 2000000;

  const forwards = players.filter((p: Player) => ["C", "LW", "RW", "F"].includes(p.position));
  const defensemen = players.filter((p: Player) => p.position === "D");
  const goalies = players.filter((p: Player) => p.position === "G");

  const sortByCapHit = (a: Player, b: Player) => b.capHit - a.capHit;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/teams" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to teams
        </Link>

        <div className="flex items-center gap-4">
          <TeamLogo abbreviation={team.abbreviation} color={team.color} size="lg" />
          <div>
            <h1 className="text-2xl font-display font-semibold">{team.name}</h1>
            <p className="text-sm text-muted-foreground tracking-wider font-medium">{team.abbreviation}</p>
          </div>
        </div>
      </div>

      {/* Cap Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Cap Hit", value: formatCurrency(team.capHit), highlight: false },
          { label: "Cap Space", value: formatCurrency(team.capSpace), highlight: !isCloseToCap, warn: isCloseToCap },
          { label: "Projected Space", value: formatCurrency(team.projectedCapSpace), highlight: false },
          { label: "LTIR", value: formatCurrency(team.ltir), highlight: false },
          { label: "Contracts", value: `${team.contracts} / 50`, highlight: false },
        ].map((stat) => (
          <Card key={stat.label} className="glass-panel bg-card border-border/40">
            <CardContent className="p-4">
              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1">{stat.label}</div>
              <div className={`text-lg font-display font-semibold font-mono ${stat.warn ? "text-destructive" : stat.highlight ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cap Utilization Bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Cap Utilization</span>
          <span className="font-mono font-medium text-[12px]">{capPercentage.toFixed(1)}% of $88.0M</span>
        </div>
        <div className="h-2 w-full bg-secondary/60 dark:bg-secondary/40 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${isCloseToCap ? "bg-destructive/80" : "bg-primary/70"}`}
            style={{ width: `${Math.min(capPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Active Roster */}
      <div className="space-y-6">
        <h2 className="text-lg font-display font-semibold">Active Roster</h2>

        {players.length === 0 ? (
          <Card className="glass-panel bg-card border-border/40">
            <CardContent className="py-10">
              <p className="text-sm text-muted-foreground text-center">No roster players found for this team.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {[
              { label: "Forwards", group: forwards },
              { label: "Defensemen", group: defensemen },
              { label: "Goalies", group: goalies },
            ]
              .filter((section) => section.group.length > 0)
              .map((section) => (
                <Card key={section.label} className="glass-panel bg-card border-border/40">
                  <CardHeader className="px-5 py-3.5 border-b border-border/40">
                    <CardTitle className="font-display text-sm font-medium">
                      {section.label} <span className="text-muted-foreground font-normal">({section.group.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_60px_50px_100px_70px_90px_80px_120px] gap-2 px-5 py-2.5 border-b border-border/30 text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">
                      <div>Player</div>
                      <div>Pos</div>
                      <div>Age</div>
                      <div className="text-right">Cap Hit</div>
                      <div className="text-right">Cap %</div>
                      <div className="text-right">Contract</div>
                      <div className="text-right">Expiry</div>
                      <div className="text-right">Draft</div>
                    </div>

                    {/* Table rows */}
                    <div className="divide-y divide-border/30">
                      {section.group.sort(sortByCapHit).map((player: Player) => (
                        <div
                          key={player.id}
                          className="grid grid-cols-[1fr_60px_50px_100px_70px_90px_80px_120px] gap-2 px-5 py-3 hover:bg-accent/30 transition-colors items-center"
                        >
                          <div>
                            <div className="font-medium text-sm">{player.name}</div>
                            <div className="text-[10px] text-muted-foreground/70 mt-0.5">{player.status}</div>
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">{player.position}</div>
                          <div className="text-xs font-mono text-muted-foreground">{player.age}</div>
                          <div className="text-right text-sm font-mono font-medium">{formatCurrency(player.capHit)}</div>
                          <div className="text-right text-xs font-mono text-muted-foreground">{player.capPercentage}%</div>
                          <div className="text-right text-xs font-mono text-muted-foreground">
                            {player.contractLength} {player.contractLength === 1 ? "yr" : "yrs"}
                          </div>
                          <div className="text-right text-xs font-mono text-muted-foreground">{player.expiryYear}</div>
                          <div className="text-right text-xs text-muted-foreground">
                            {player.draftYear ? (
                              <span className="font-mono">
                                {player.draftYear} R{player.draftRound} #{player.draftOverall}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">Undrafted</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold">Recent Transactions</h2>
        <Card className="glass-panel bg-card border-border/40">
          <CardContent className="p-5">
            {teamTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recent transactions for this team.</p>
            ) : (
              <div className="space-y-5 border-l border-border/50 ml-1.5 pl-4 relative">
                {teamTransactions.map((tx: Transaction) => (
                  <div key={tx.id} className="relative">
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
  );
}
