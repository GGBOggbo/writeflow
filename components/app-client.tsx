"use client";

import { WorkflowProvider } from "./workflow-context";
import { WorkspaceShell } from "./workspace-shell";
import type { CreditBalance } from "@/types/credits";

export function AppClient({
  initialCreditBalance = null,
}: {
  initialCreditBalance?: CreditBalance | null;
}) {
  return (
    <WorkflowProvider initialCreditBalance={initialCreditBalance}>
      <WorkspaceShell />
    </WorkflowProvider>
  );
}
