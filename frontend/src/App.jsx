import { Route, Routes } from "react-router-dom";
import { AuthPage } from "@/components/auth/AuthPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceBootScreen } from "@/components/layout/WorkspaceBootScreen";
import { useAuth } from "@/context/AuthContext";
import { AdmissionConfirmationPage } from "@/pages/AdmissionConfirmationPage";
import { AdmissionSplitterPage } from "@/pages/AdmissionSplitterPage";
import { ClientDeskPage } from "@/pages/ClientDeskPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ExportHistoryPage } from "@/pages/ExportHistoryPage";
import { NYSCSorterPage } from "@/pages/NYSCSorterPage";
import { RulesPage } from "@/pages/RulesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SortMachinePage } from "@/pages/SortMachinePage";
import { TemplatesPage } from "@/pages/TemplatesPage";

function App() {
  const { currentUser, ready } = useAuth();

  if (!ready) {
    return <WorkspaceBootScreen />;
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/client-desk" element={<ClientDeskPage />} />
        <Route path="/admission-splitter" element={<AdmissionSplitterPage />} />
        <Route path="/nysc-sorter" element={<NYSCSorterPage />} />
        <Route path="/admission-confirmation" element={<AdmissionConfirmationPage />} />
        <Route path="/sort-machine" element={<SortMachinePage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/export-history" element={<ExportHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
