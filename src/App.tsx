import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { Projects } from "./surfaces/Projects";
import { ProjectDetail } from "./surfaces/ProjectDetail";
import { Tasks } from "./surfaces/Tasks";
import { Content } from "./surfaces/Content";
import { Vault } from "./surfaces/Vault";
import { Intake } from "./surfaces/Intake";
import { Wins } from "./surfaces/Wins";
import { Team } from "./surfaces/Team";
import { Ask } from "./surfaces/Ask";
import { Settings } from "./surfaces/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/content" element={<Content />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/intake" element={<Intake />} />
        <Route path="/wins" element={<Wins />} />
        <Route path="/team" element={<Team />} />
        <Route path="/ask" element={<Ask />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Route>
    </Routes>
  );
}
