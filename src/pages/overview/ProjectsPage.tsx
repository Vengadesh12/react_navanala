import React from "react";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { WorkspaceOverview } from "./WorkspaceOverview";

export const ProjectsPage: React.FC = () => {
  return (
    <WorkspaceLayout permission="projects.view" label="Projects" icon="◇" showHero={false}>
      <WorkspaceOverview type="projects" />
    </WorkspaceLayout>
  );
};

export default ProjectsPage;
