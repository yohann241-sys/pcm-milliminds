import { useEffect, useState } from "react";
import ParticipantPage from "./pages/Participant";
import AdminPage from "./pages/Admin";
import ReportPage from "./pages/Report";

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  const report = path.match(/^\/admin\/result\/([0-9a-f-]{36})$/i);
  if (report) return <ReportPage assessmentId={report[1]} />;
  if (path.startsWith("/admin")) return <AdminPage />;
  return <ParticipantPage />;
}
