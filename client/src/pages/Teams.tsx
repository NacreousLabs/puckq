import { formatCurrency, MOCK_TEAMS } from "@/lib/mock-data";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Teams() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-1">Franchises</h1>
          <p className="text-sm text-muted-foreground">Browse 32 NHL franchises, cap situations, and contract limits.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search teams..." 
              className="pl-8 h-9 text-sm bg-card border-border focus-visible:ring-primary"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 bg-card border-border hover:bg-secondary">
            <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
            Sort
          </Button>
          <Button variant="outline" size="sm" className="h-9 bg-card border-border hover:bg-secondary">
            <Filter className="h-3.5 w-3.5 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {MOCK_TEAMS.map(team => {
          const capPercentage = (team.capHit / 88000000) * 100;
          const isCloseToCap = team.capSpace < 2000000;
          
          return (
            <div key={team.id} className="glass-panel rounded-xl p-4 border border-border hover:border-primary/40 transition-all group cursor-pointer bg-card flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-background border border-border shadow-sm group-hover:scale-105 transition-transform">
                      {team.logo}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base leading-tight group-hover:text-primary transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground tracking-wider font-medium">{team.abbreviation}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Cap Hit</span>
                      <span className="font-mono font-medium">{formatCurrency(team.capHit)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isCloseToCap ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${Math.min(capPercentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
                      <span>{capPercentage.toFixed(1)}%</span>
                      <span>$88.0M Limit</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">Current Space</div>
                  <div className={`font-mono font-medium ${isCloseToCap ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatCurrency(team.capSpace)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">Projected Space</div>
                  <div className="font-mono font-medium text-foreground">
                    {formatCurrency(team.projectedCapSpace)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">LTIR Pool</div>
                  <div className="font-mono font-medium text-foreground">
                    {formatCurrency(team.ltir)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">Contracts</div>
                  <div className="font-mono font-medium text-foreground">
                    {team.contracts} <span className="text-muted-foreground">/ 50</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}