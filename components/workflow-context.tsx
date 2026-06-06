"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useWorkflow } from "./hooks/use-workflow";

type WorkflowContextValue = ReturnType<typeof useWorkflow>;

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const workflow = useWorkflow();
  return (
    <WorkflowContext.Provider value={workflow}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflowContext(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error("useWorkflowContext must be used within WorkflowProvider");
  }
  return ctx;
}
