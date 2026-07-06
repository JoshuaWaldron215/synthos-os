import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";

// Route-level code splitting: each surface loads on first visit, keeping the
// initial bundle small. The Shell (nav, modals, store) stays in the main chunk.
const Home = lazy(() => import("./surfaces/Home").then((m) => ({ default: m.Home })));
const Projects = lazy(() => import("./surfaces/Projects").then((m) => ({ default: m.Projects })));
const ProjectDetail = lazy(() => import("./surfaces/ProjectDetail").then((m) => ({ default: m.ProjectDetail })));
const Tasks = lazy(() => import("./surfaces/Tasks").then((m) => ({ default: m.Tasks })));
const Content = lazy(() => import("./surfaces/Content").then((m) => ({ default: m.Content })));
const Vault = lazy(() => import("./surfaces/Vault").then((m) => ({ default: m.Vault })));
const Intake = lazy(() => import("./surfaces/Intake").then((m) => ({ default: m.Intake })));
const Wins = lazy(() => import("./surfaces/Wins").then((m) => ({ default: m.Wins })));
const Team = lazy(() => import("./surfaces/Team").then((m) => ({ default: m.Team })));
const Leads = lazy(() => import("./surfaces/Leads").then((m) => ({ default: m.Leads })));
const Ask = lazy(() => import("./surfaces/Ask").then((m) => ({ default: m.Ask })));
const Settings = lazy(() => import("./surfaces/Settings").then((m) => ({ default: m.Settings })));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/content" element={<Content />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/intake" element={<Intake />} />
          <Route path="/wins" element={<Wins />} />
          <Route path="/team" element={<Team />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
