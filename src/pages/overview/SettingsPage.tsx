import React from "react";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { WorkspaceOverview } from "./WorkspaceOverview";

export const SettingsPage: React.FC = () => {
  return (
    <WorkspaceLayout permission="settings.view" label="Settings" icon="⚙" showHero={false}>
      <WorkspaceOverview type="settings" />
    </WorkspaceLayout>
  );
};

export default SettingsPage;
