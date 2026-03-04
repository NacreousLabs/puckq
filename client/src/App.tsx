import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import NotFound from "@/pages/not-found";

import Shell from "@/components/layout/Shell";
import Dashboard from "@/pages/Dashboard";
import Teams from "@/pages/Teams";
import TeamProfile from "@/pages/TeamProfile";
import Players from "@/pages/Players";

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard}/>
        <Route path="/teams" component={Teams}/>
        <Route path="/teams/:id" component={TeamProfile}/>
        <Route path="/players" component={Players}/>
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="puckq-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
