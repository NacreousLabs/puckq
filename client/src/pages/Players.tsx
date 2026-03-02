import { formatCurrency, MOCK_PLAYERS, MOCK_TEAMS } from "@/lib/mock-data";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Players() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-1">Players Database</h1>
          <p className="text-sm text-muted-foreground">Comprehensive database of active player contracts and draft history.</p>
        </div>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search players, teams, pos..." 
              className="pl-8 h-9 text-sm bg-card border-border focus-visible:ring-primary"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 bg-card border-border hover:bg-secondary">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-2" />
            View
          </Button>
          <Button variant="outline" size="sm" className="h-9 bg-card border-border hover:bg-secondary">
            <Filter className="h-3.5 w-3.5 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="glass-panel border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground uppercase bg-secondary/40 border-b border-border font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Player</th>
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
            <tbody className="divide-y divide-border/50 text-xs">
              {MOCK_PLAYERS.map(player => {
                const team = MOCK_TEAMS.find(t => t.id === player.teamId);
                return (
                  <tr key={player.id} className="hover:bg-secondary/20 transition-colors group cursor-pointer">
                    <td className="px-4 py-2.5 font-medium group-hover:text-primary transition-colors text-sm">
                      {player.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="opacity-80 text-base leading-none">{team?.logo}</span>
                        <span className="font-medium">{team?.abbreviation}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-secondary/50 text-[11px] font-bold">
                        {player.position}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{player.age}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium text-[13px]">
                      {formatCurrency(player.capHit)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {player.capPercentage}%
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/50 bg-secondary/20 text-[11px]">
                        {player.contractLength} YRS
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground font-medium">
                      {player.expiryYear}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col text-[10px]">
                        <span className="text-foreground">{player.draftYear}</span>
                        <span className="text-muted-foreground">Rd {player.draftRound} (#{player.draftOverall})</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="px-4 py-3 border-t border-border/50 bg-secondary/10 flex items-center justify-between text-xs text-muted-foreground">
          <div>Showing {MOCK_PLAYERS.length} of {MOCK_PLAYERS.length} players</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled>Previous</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}