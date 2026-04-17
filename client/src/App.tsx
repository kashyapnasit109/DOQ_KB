import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { useUserProfile } from "@/hooks/use-profile";
import AppLayout from "@/components/app-layout";
import ChatPage from "@/pages/chat";
import DocumentsPage from "@/pages/documents";
import SettingsPage from "@/pages/settings-page";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

function AppRouter() {
  const { isLoggedIn, setProfile } = useUserProfile();

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginPage onLogin={(user) => setProfile(user)} />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={ChatPage} />
        <Route path="/documents" component={DocumentsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
