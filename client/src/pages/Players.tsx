import { formatCurrency, MOCK_PLAYERS, MOCK_TEAMS } from "@/lib/mock-data";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Players() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Players Database</h1>
          <p className="text-muted-foreground">Search and filter active player contracts.</p>
        </div>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search players..." 
              className="pl-9 bg-card border-border focus-visible:ring-primary"
            />
          </div>
          <Button variant="outline" className="bg-card border-border hover:bg-secondary">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="glass-panel border border-border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Player</th>
                <th className="px-6 py-4 font-medium">Team</th>
                <th className="px-6 py-4 font-medium">Pos</th>
                <th className="px-6 py-4 font-medium">Age</th>
                <th className="px-6 py-4 font-medium">Cap Hit</th>
                <th className="px-6 py-4 font-medium">Length</th>
                <th className="px-6 py-4 font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_PLAYERS.map(player => {
                const team = MOCK_TEAMS.find(t => t.id === player.teamId);
                return (
                  <tr key={player.id} className="hover:bg-secondary/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-medium group-hover:text-primary transition-colors">
                      {player.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="opacity-70 text-lg">{team?.logo}</span>
                        {team?.abbreviation}
                      </div>
                    </td>
                    <td className="px-6 py-4">{player.position}</td>
                    <td className="px-6 py-4 text-muted-foreground">{player.age}</td>
                    <td className="px-6 py-4 font-mono text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(player.capHit)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{player.contractLength} YRS</td>
                    <td className="px-6 py-4 text-muted-foreground">{player.expiryYear}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}