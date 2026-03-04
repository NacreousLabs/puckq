import { formatCurrency, api } from "@/lib/api";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import type { Team } from "@shared/schema";
import TeamLogo from "@/components/TeamLogo";

export default function Teams() {
  const { data: teams = [], isLoading } = useQuery({ queryKey: ["teams"], queryFn: api.teams.list });
  const [search, setSearch] = useState("");

  const filteredTeams = useMemo(() => {
    if (!search) return teams;
    const q = search.toLowerCase();
    return teams.filter((t: Team) => t.name.toLowerCase().includes(q) || t.abbreviation.toLowerCase().includes(q));
  }, [teams, search]);

  if (isLoading) {
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
          <h1 className="text-2xl font-display font-semibold mb-1.5">Franchises</h1>
          <p className="text-sm text-muted-foreground">Browse {teams.length} tracked NHL franchises and their cap situations.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
            <Input
              data-testid="input-search-teams"
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-card border-border/60 focus-visible:ring-primary/40"
            />
          </div>
        </div>
      </div>

      {filteredTeams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-base font-medium">No teams found</p>
          <p className="text-sm mt-1">{search ? "Try a different search term" : "Seed data from the dashboard"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTeams.map((team: Team) => {
            const capPercentage = (team.capHit / 88000000) * 100;
            const isCloseToCap = team.capSpace < 2000000;

            return (
              <Link key={team.id} href={`/teams/${team.id}`} data-testid={`card-team-${team.id}`} className="glass-panel rounded-xl p-5 border-border/40 hover:border-primary/30 transition-all group cursor-pointer bg-card flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <TeamLogo abbreviation={team.abbreviation} color={team.color} size="lg" className="group-hover:scale-105 transition-transform" />
                      <div>
                        <h3 className="font-display font-semibold text-[15px] leading-tight group-hover:text-primary transition-colors">
                          {team.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground tracking-wider font-medium mt-0.5">{team.abbreviation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Cap Utilization</span>
                        <span className="font-mono font-medium text-[12px]">{formatCurrency(team.capHit)}</span>
                      </div>
                      <div className="h-1 w-full bg-secondary/60 dark:bg-secondary/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${isCloseToCap ? 'bg-destructive/80' : 'bg-primary/70'}`}
                          style={{ width: `${Math.min(capPercentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] mt-1 text-muted-foreground/70">
                        <span>{capPercentage.toFixed(1)}%</span>
                        <span>$88.0M</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-border/30 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 mb-0.5 uppercase tracking-wider font-medium">Space</div>
                    <div className={`font-mono font-medium ${isCloseToCap ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(team.capSpace)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 mb-0.5 uppercase tracking-wider font-medium">Projected</div>
                    <div className="font-mono font-medium text-foreground/80">
                      {formatCurrency(team.projectedCapSpace)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 mb-0.5 uppercase tracking-wider font-medium">LTIR</div>
                    <div className="font-mono font-medium text-foreground/80">
                      {formatCurrency(team.ltir)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 mb-0.5 uppercase tracking-wider font-medium">Contracts</div>
                    <div className="font-mono font-medium text-foreground/80">
                      {team.contracts} <span className="text-muted-foreground/60">/ 50</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}