import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, MOCK_TEAMS, RECENT_TRANSACTIONS } from "@/lib/mock-data";
import { ArrowUpRight, DollarSign, TrendingUp, Users } from "lucide-react";

export default function Dashboard() {
  const totalLeagueCap = MOCK_TEAMS.reduce((acc, team) => acc + team.capHit, 0);
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">League Overview</h1>
        <p className="text-muted-foreground">Comprehensive look at NHL team caps and recent transactions.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel border-0 bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">League Total Cap Hit</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">{formatCurrency(totalLeagueCap)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">+2.4%</span> from last season
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-0 bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Contracts</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">732</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across 32 active rosters
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0 bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Cap Hit</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">{formatCurrency(totalLeagueCap / 32)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per team average
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col - Team Cap Space */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-panel border-0 bg-white/5">
            <CardHeader>
              <CardTitle className="font-display">Top Teams by Cap Space</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...MOCK_TEAMS].sort((a, b) => b.capSpace - a.capSpace).map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white/10 shadow-inner">
                        {team.logo}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{team.name}</div>
                        <div className="text-xs text-muted-foreground">Hit: {formatCurrency(team.capHit)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium text-emerald-400">{formatCurrency(team.capSpace)}</div>
                      <div className="text-xs text-muted-foreground">Space</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col - Recent Transactions */}
        <div className="space-y-6">
          <Card className="glass-panel border-0 bg-white/5">
            <CardHeader>
              <CardTitle className="font-display">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 border-l-2 border-white/10 ml-3 pl-4 relative">
                {RECENT_TRANSACTIONS.map((tx, i) => (
                  <div key={tx.id} className="relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="text-xs text-primary mb-1 font-medium">{tx.date}</div>
                    <div className="font-medium text-white">{tx.player}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/10 mr-2">
                        {tx.type}
                      </span>
                      {tx.team} &bull; {tx.details}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}