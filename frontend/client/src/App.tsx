import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Record from "@/pages/Record";
import Chat from "@/pages/Chat";
import Documents from "@/pages/Documents";
import Profile from "@/pages/Profile";
import AppointmentDetails from "@/pages/AppointmentDetails";
import { SplashScreen } from "@/components/SplashScreen";

import { AppointmentsProvider } from "@/context/AppointmentsContext";
import { DocumentsProvider } from "@/context/DocumentsContext";
import { TranscriptsProvider } from "@/context/TranscriptsContext";
import { UserProfileProvider } from "@/context/UserProfileContext";
import { MedicationsProvider } from "@/context/MedicationsContext";
import { CalendarProvider } from "@/context/CalendarContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/history" component={History} />
      <Route path="/record" component={Record} />
      <Route path="/chat" component={Chat} />
      <Route path="/documents" component={Documents} />
      <Route path="/profile" component={Profile} />

      {/* NEW: appointment details route */}
      <Route path="/appointment/:id" component={AppointmentDetails} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SplashScreen />
      <TooltipProvider>
        <UserProfileProvider>
          <AppointmentsProvider>
            <MedicationsProvider>
              <CalendarProvider>
                <DocumentsProvider>
                  <TranscriptsProvider>
                    <Toaster />
                    <Router />
                  </TranscriptsProvider>
                </DocumentsProvider>
              </CalendarProvider>
            </MedicationsProvider>
          </AppointmentsProvider>
        </UserProfileProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
