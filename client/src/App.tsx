import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import StockDetail from "./pages/StockDetail";
import Watchlist from "./pages/Watchlist";
import Portfolio from "./pages/Portfolio";
import SearchHistory from "./pages/SearchHistory";
import AIAdvisor from "./pages/AIAdvisor";
import AnalysisAccuracy from "./pages/AnalysisAccuracy";
import TransactionHistory from "./pages/TransactionHistory";
import { ApiMonitor } from "./components/ApiMonitor";
import EmptyStateTest from "./pages/EmptyStateTest";
import BatchAnalysisResults from "./pages/BatchAnalysisResults";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/stock/:symbol"} component={StockDetail} />
      <Route path={"/watchlist"} component={Watchlist} />
      <Route path={"/portfolio"} component={Portfolio} />
      <Route path={"/portfolio/transactions"} component={TransactionHistory} />
      <Route path={"/history"} component={SearchHistory} />
      <Route path={"/ai-advisor"} component={AIAdvisor} />
      <Route path={"/analysis-accuracy"} component={AnalysisAccuracy} />
      <Route path={"/test/empty-state"} component={EmptyStateTest} />
      <Route path={"/batch-analysis"} component={BatchAnalysisResults} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <ApiMonitor />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
