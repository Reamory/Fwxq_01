import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import RequestsListPage from "@/pages/RequestsListPage";
import RequestFormPage from "@/pages/RequestFormPage";
import RequestDetailPage from "@/pages/RequestDetailPage";
import InboxPage from "@/pages/InboxPage";
import SettingsPage from "@/pages/SettingsPage";
import ToastHost from "@/components/ToastHost";

export default function App() {
  return (
    <Router>
      <ToastHost />
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/todo" replace />} />
          <Route path="/todo" element={<RequestsListPage view="todo" />} />
          <Route path="/handled" element={<RequestsListPage view="handled" />} />
          <Route path="/initiated" element={<RequestsListPage view="initiated" />} />
          <Route path="/manage" element={<RequestsListPage view="manage" />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/requests/new" element={<RequestFormPage mode="new" />} />
          <Route path="/requests/:id/edit" element={<RequestFormPage mode="edit" />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
          <Route path="*" element={<div className="text-sm text-zinc-600 dark:text-zinc-300">Not Found</div>} />
        </Routes>
      </AppShell>
    </Router>
  );
}
