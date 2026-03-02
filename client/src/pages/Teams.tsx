import { formatCurrency, MOCK_TEAMS } from "@/lib/mock-data";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Teams() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Teams Overview</h1>
          <p className="text-muted-foreground">Browse all 32 NHL franchises and their cap situations.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search teams..." 
            className="pl-9 bg-white/5 border-white/10 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_TEAMS.map(team => {
          const capPercentage = (team.capHit / 88000000) * 100;
          
          return (
            <div key={team.id} className="glass-panel rounded-xl p-5 border border-white/5 hover:border-primary/50 transition-all group cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-white/5 shadow-inner">
                    {team.logo}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white group-hover:text-primary transition-colors">
                      {team.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{team.abbreviation}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Cap Hit</span>
                    <span className="font-mono text-white">{formatCurrency(team.capHit)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${capPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <span className="text-sm text-muted-foreground">Cap Space</span>
                  <span className={`font-mono font-medium ${team.capSpace < 2000000 ? 'text-destructive/80' : 'text-emerald-400'}`}>
                    {formatCurrency(team.capSpace)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}