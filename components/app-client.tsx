"use client";

import { WorkflowProvider } from "./workflow-context";
import { WorkspaceShell } from "./workspace-shell";
import type { CreditBalance } from "@/types/credits";

export function AppClient({
  initialCreditBalance = null,
  currentUserId = null,
}: {
  initialCreditBalance?: CreditBalance | null;
  currentUserId?: string | null;
}) {
  return (
    <WorkflowProvider
      initialCreditBalance={initialCreditBalance}
      storageOwnerKey={currentUserId}
    >
      <WorkspaceShell />
    </WorkflowProvider>
  );
}
