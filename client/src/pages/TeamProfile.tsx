import { formatCurrency, api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { Loader2, ArrowLeft, ArrowRightLeft, UserPlus, UserMinus, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import type { Player, Transaction } from "@shared/schema";

const TRANSACTION_ICONS: Record<string, React.ReactNode> = {
  Trade: <ArrowRightLeft className="h-3.5 w-3.5" />,
  Signing: <UserPlus className="h-3.5 w-3.5" />,
  Extension: <TrendingUp className="h-3.5 w-3.5" />,
  Waivers: <UserMinus className="h-3.5 w-3.5" />,
  Injury: <AlertTriangle className="h-3.5 w-3.5" />,
};

const TRANSACTION_COLORS: Record<string, string> = {
  Trade: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  Signing: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  Extension: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  Waivers: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  Injury: "text-red-500 bg-red-500/10 border-red-500/20",
};

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["teams", teamId],
    queryFn: () => api.teams.get(teamId),
    enabled: !!teamId,
  });

  const { data: roster = [], isLoading: rosterLoading } = useQuery({
    queryKey: ["teams", teamId, "roster"],
    queryFn: () => api.teams.roster(teamId),
    enabled: !!teamId,
  });

  const { data: teamTxs = [], isLoading: txLoading } = useQuery({
    queryKey: ["teams", teamId, "transactions"],
    queryFn: () => api.teams.teamTransactions(teamId),
    enabled: !!teamId,
  });

  if (teamLoading) {
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
        <Link href="/teams" className="text-sm mt-2 text-primary hover:underline">Back to teams</Link>
      </div>
    );
  }

  async function handleSyncRoster() {
    if (!team || syncing) return;
    setSyncing(true);
    try {
      await api.nhl.syncRoster(team.abbreviation);
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "roster"] });
    } finally {
      setSyncing(false);
    }
  }

  const capPercentage = (team.capHit / 88000000) * 100;
  const isCloseToCap = team.capSpace < 2000000;
  const totalRosterCap = roster.reduce((sum, p) => sum + p.capHit, 0);

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/teams" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        All franchises
      </Link>

      {/* Team header */}
      <div className="glass-panel rounded-xl p-6 bg-card border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <TeamLogo abbreviation={team.abbreviation} color={team.color} size="lg" className="!w-16 !h-16 !text-lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-semibold">{team.name}</h1>
            <p className="text-sm text-muted-foreground tracking-wider font-medium mt-0.5">{team.abbreviation}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-0.5">Cap Hit</div>
              <div className="font-mono font-semibold">{formatCurrency(team.capHit)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-0.5">Space</div>
              <div className={`font-mono font-semibold ${isCloseToCap ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                {formatCurrency(team.capSpace)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-0.5">Projected</div>
              <div className="font-mono font-semibold text-foreground/80">{formatCurrency(team.projectedCapSpace)}</div>
            </div>
            {team.ltir > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-0.5">LTIR</div>
                <div className="font-mono font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(team.ltir)}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-0.5">Contracts</div>
              <div className="font-mono font-semibold">{team.contracts} <span className="text-muted-foreground/60 text-xs">/ 50</span></div>
            </div>
          </div>
        </div>

        {/* Cap bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Cap Utilization</span>
            <span className="font-mono font-medium text-[12px]">{capPercentage.toFixed(1)}% of $88.0M</span>
          </div>
          <div className="h-2 w-full bg-secondary/60 dark:bg-secondary/40 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isCloseToCap ? "bg-destructive/80" : "bg-primary/70"}`}
              style={{ width: `${Math.min(capPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active Roster & Player Stats */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-display font-semibold">Active Roster</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rosterLoading ? "Loading…" : `${roster.length} players · ${formatCurrency(totalRosterCap)} total cap hit`}
            </p>
          </div>
          <button
            onClick={handleSyncRoster}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Import players from NHL API"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync Roster"}
          </button>
        </div>

        <div className="glass-panel border-border/40 rounded-xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] text-muted-foreground uppercase bg-secondary/30 dark:bg-secondary/20 border-b border-border/40 font-medium tracking-wider">
                <tr>
                  <th className="px-5 py-3">Player</th>
                  <th className="px-4 py-3 text-center">Pos</th>
                  <th className="px-4 py-3 text-center">Age</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Cap Hit</th>
                  <th className="px-4 py-3 text-right">Cap %</th>
                  <th className="px-4 py-3 text-center">Length</th>
                  <th className="px-4 py-3 text-center">Expiry</th>
                  <th className="px-4 py-3">Draft</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/25 text-[13px]">
                {rosterLoading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary/60 mx-auto" />
                    </td>
                  </tr>
                ) : roster.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-muted-foreground text-sm">
                      No players on roster
                    </td>
                  </tr>
                ) : (
                  roster.map((player: Player) => (
                    <tr key={player.id} data-testid={`row-team-player-${player.id}`} className="hover:bg-accent/25 transition-colors">
                      <td className="px-5 py-2.5 font-medium">{player.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-secondary/40 dark:bg-secondary/30 text-[11px] font-semibold text-foreground/70">
                          {player.position}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{player.age}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          {player.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatCurrency(player.capHit)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">
                        {player.capPercentage}%
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/30 bg-secondary/20 dark:bg-secondary/15 text-[11px] font-medium text-foreground/70">
                          {player.contractLength} YRS
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground font-medium font-mono">
                        {player.expiryYear}
                      </td>
                      <td className="px-4 py-2.5">
                        {player.draftYear ? (
                          <div className="flex flex-col text-[10px] leading-relaxed">
                            <span className="text-foreground/70 font-medium">{player.draftYear}</span>
                            <span className="text-muted-foreground/70">Rd {player.draftRound} (#{player.draftOverall})</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!rosterLoading && roster.length > 0 && (
            <div className="px-5 py-3 border-t border-border/30 bg-secondary/15 dark:bg-secondary/10 flex items-center justify-between text-xs text-muted-foreground">
              <span>{roster.length} players on active roster</span>
              <span className="font-mono font-medium text-foreground/70">{formatCurrency(totalRosterCap)} total</span>
            </div>
          )}
        </div>
      </section>

      {/* Contract Details */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-display font-semibold">Contract Details</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Cap commitments by contract expiry year</p>
        </div>

        <div className="glass-panel border-border/40 rounded-xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] text-muted-foreground uppercase bg-secondary/30 dark:bg-secondary/20 border-b border-border/40 font-medium tracking-wider">
                <tr>
                  <th className="px-5 py-3">Player</th>
                  <th className="px-4 py-3 text-center">Pos</th>
                  <th className="px-4 py-3 text-right">AAV</th>
                  <th className="px-4 py-3 text-right">Cap %</th>
                  <th className="px-4 py-3 text-center">Years</th>
                  <th className="px-4 py-3 text-center">Expiry</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/25 text-[13px]">
                {rosterLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary/60 mx-auto" />
                    </td>
                  </tr>
                ) : roster.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground text-sm">
                      No contracts on file
                    </td>
                  </tr>
                ) : (
                  [...roster]
                    .sort((a, b) => b.capHit - a.capHit)
                    .map((player: Player) => (
                      <tr key={player.id} className="hover:bg-accent/25 transition-colors">
                        <td className="px-5 py-2.5 font-medium">{player.name}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-secondary/40 dark:bg-secondary/30 text-[11px] font-semibold text-foreground/70">
                            {player.position}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatCurrency(player.capHit)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                          {player.capPercentage}%
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/30 bg-secondary/20 dark:bg-secondary/15 text-[11px] font-medium text-foreground/70">
                            {player.contractLength} YRS
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-medium text-muted-foreground">
                          {player.expiryYear}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground/80 font-medium">
                          {formatCurrency(player.capHit * player.contractLength)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-display font-semibold">Recent Transactions</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {txLoading ? "Loading…" : `${teamTxs.length} transaction${teamTxs.length !== 1 ? "s" : ""} involving ${team.abbreviation}`}
          </p>
        </div>

        {txLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
          </div>
        ) : teamTxs.length === 0 ? (
          <div className="glass-panel border-border/40 rounded-xl bg-card px-5 py-14 text-center text-muted-foreground text-sm">
            No transactions on record for {team.abbreviation}
          </div>
        ) : (
          <div className="space-y-2.5">
            {[...teamTxs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((tx: Transaction) => {
                const colorClass = TRANSACTION_COLORS[tx.type] ?? "text-muted-foreground bg-secondary/20 border-border/30";
                const icon = TRANSACTION_ICONS[tx.type] ?? null;
                return (
                  <div
                    key={tx.id}
                    data-testid={`tx-${tx.id}`}
                    className="glass-panel border-border/40 rounded-xl bg-card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold shrink-0 ${colorClass}`}>
                        {icon}
                        {tx.type}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-[13px] truncate">{tx.player}</div>
                        <div className="text-xs text-muted-foreground truncate">{tx.details}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span className="font-medium text-foreground/60">{tx.team}</span>
                      <span className="font-mono">{tx.date}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
