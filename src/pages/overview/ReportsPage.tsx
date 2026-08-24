import React from "react";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { WorkspaceOverview } from "./WorkspaceOverview";

export const ReportsPage: React.FC = () => {
  return (
    <WorkspaceLayout permission="reports.view" label="Reports" icon="▤" showHero={false}>
      <WorkspaceOverview type="reports" />
    </WorkspaceLayout>
  );
};

export default ReportsPage;
