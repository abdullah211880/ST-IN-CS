import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/contexts/theme-context";
import { LanguageProvider } from "@/contexts/language-context";
import Welcome from "@/pages/welcome";
import Home from "@/pages/home";
import Documents from "@/pages/documents";
import Sessions from "@/pages/sessions";
import SessionQA from "@/pages/session-qa";
import Goals from "@/pages/goals";
import GoalDetail from "@/pages/goal-detail";
import BugFinder from "@/pages/bug-finder";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/overview" component={Home} />
            <Route path="/documents" component={Documents} />
            <Route path="/sessions" component={Sessions} />
            <Route path="/sessions/:id" component={SessionQA} />
            <Route path="/goals/:id" component={GoalDetail} />
            <Route path="/goals" component={Goals} />
            <Route path="/bug-finder" component={BugFinder} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
