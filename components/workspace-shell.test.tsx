import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkflowProvider } from "./workflow-context";
import { WorkspaceShell } from "./workspace-shell";

describe("WorkspaceShell", () => {
  it("renders chat and manuscript regions", () => {
    render(
      <WorkflowProvider>
        <WorkspaceShell />
      </WorkflowProvider>
    );

    expect(screen.getByText(/主编台/i)).toBeInTheDocument();
    expect(screen.getByText(/成稿工作台/i)).toBeInTheDocument();
  });

  it("keeps detailed editor guidance behind a compact disclosure", () => {
    render(
      <WorkflowProvider>
        <WorkspaceShell />
      </WorkflowProvider>
    );

    expect(screen.getByText(/展开阶段说明/i)).toBeInTheDocument();
  });
});
