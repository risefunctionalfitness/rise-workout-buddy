import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProVersion from "./pages/ProVersion";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { StrengthValues } from "@/components/StrengthValues";
import { ExerciseSelection } from "@/components/ExerciseSelection";
import { WorkoutTimer } from "@/components/WorkoutTimer";
import { ForTimeTimer } from "@/components/ForTimeTimer";
import { AmrapTimer } from "@/components/AmrapTimer";
import { EmomTimer } from "@/components/EmomTimer";
import { WorkoutStart } from "@/components/WorkoutStart";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/pro" element={<ProVersion />} />
            <Route path="/pro/strength-values" element={<StrengthValues />} />
            <Route path="/pro/exercises" element={<ExerciseSelection />} />
            <Route path="/workout-timer" element={<WorkoutTimer />} />
            <Route path="/workout-timer/fortime" element={<ForTimeTimer />} />
            <Route path="/workout-timer/amrap" element={<AmrapTimer />} />
            <Route path="/workout-timer/emom" element={<EmomTimer />} />
            <Route path="/workout-timer/start" element={<WorkoutStart />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
