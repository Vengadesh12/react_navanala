import React from "react";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { WorkspaceOverview } from "./WorkspaceOverview";

export const AuditPage: React.FC = () => {
  return (
    <WorkspaceLayout permission="audit.view" label="Audit Logs" icon="◌" showHero={false}>
      <WorkspaceOverview type="audit" />
    </WorkspaceLayout>
  );
};

export default AuditPage;
