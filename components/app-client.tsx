"use client";

import { WorkflowProvider } from "./workflow-context";
import { WorkspaceShell } from "./workspace-shell";

export function AppClient() {
  return (
    <WorkflowProvider>
      <WorkspaceShell />
    </WorkflowProvider>
  );
}
