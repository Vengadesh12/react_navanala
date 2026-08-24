import React from "react";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { WorkspaceOverview } from "./WorkspaceOverview";

export const CalendarPage: React.FC = () => {
  return (
    <WorkspaceLayout permission="calendar.view" label="Schedule" icon="□" showHero={false}>
      <WorkspaceOverview type="calendar" />
    </WorkspaceLayout>
  );
};

export default CalendarPage;
