import { formatCurrency, api } from "@/lib/api";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import type { Player, Team } from "@shared/schema";

export default function Players() {
  const { data: players = [], isLoading: playersLoading } = useQuery({ queryKey: ["players"], queryFn: api.players.list });
  const { data: teams = [] } = useQuery({ queryKey: ["teams"], queryFn: api.teams.list });
  const [search, setSearch] = useState("");

  const teamsMap = useMemo(() => {
    const map = new Map<number, Team>();
    teams.forEach((t: Team) => map.set(t.id, t));
    return map;
  }, [teams]);

  const filteredPlayers = useMemo(() => {
    if (!search) return players;
    const q = search.toLowerCase();
    return players.filter((p: Player) => {
      const team = teamsMap.get(p.teamId);
      return (
        p.name.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        team?.abbreviation.toLowerCase().includes(q) ||
        team?.name.toLowerCase().includes(q)
      );
    });
  }, [players, search, teamsMap]);

  if (playersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold mb-1.5">Players Database</h1>
          <p className="text-sm text-muted-foreground">{players.length} active player contracts across all franchises.</p>
        </div>

        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
            <Input
              data-testid="input-search-players"
              placeholder="Search players, teams, pos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-card border-border/60 focus-visible:ring-primary/40"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel border-border/40 rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground uppercase bg-secondary/30 dark:bg-secondary/20 border-b border-border/40 font-medium tracking-wider">
              <tr>
                <th className="px-5 py-3">Player</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">Pos</th>
                <th className="px-4 py-3 text-center">Age</th>
                <th className="px-4 py-3 text-right">Cap Hit</th>
                <th className="px-4 py-3 text-right">Cap %</th>
                <th className="px-4 py-3 text-center">Length</th>
                <th className="px-4 py-3 text-center">Expiry</th>
                <th className="px-4 py-3">Draft Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/25 text-[13px]">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-muted-foreground">
                    {search ? "No players match your search" : "No players in the database"}
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player: Player) => {
                  const team = teamsMap.get(player.teamId);
                  return (
                    <tr key={player.id} data-testid={`row-player-${player.id}`} className="hover:bg-accent/25 transition-colors group cursor-pointer">
                      <td className="px-5 py-2.5 font-medium group-hover:text-primary transition-colors">
                        {player.name}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="opacity-70 text-base leading-none">{team?.logo}</span>
                          <span className="font-medium text-foreground/80">{team?.abbreviation}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-secondary/40 dark:bg-secondary/30 text-[11px] font-semibold text-foreground/70">
                          {player.position}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{player.age}</td>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-border/30 bg-secondary/15 dark:bg-secondary/10 flex items-center justify-between text-xs text-muted-foreground">
          <div>Showing <span className="font-medium text-foreground/70">{filteredPlayers.length}</span> of <span className="font-medium text-foreground/70">{players.length}</span> players</div>
        </div>
      </div>
    </div>
  );
}
