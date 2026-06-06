# AI Writing MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local runnable MVP that lets a user complete the full AI-assisted article workflow with mock data and no real AI integration.

**Architecture:** A single Next.js App Router page hosts a two-panel workspace. A typed client-side workflow state machine manages transitions and persists state to `localStorage`, while mock async generators simulate AI output for each stage.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Scaffold the app and test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.js`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `components/`
- Create: `lib/`
- Create: `types/`

- [ ] **Step 1: Scaffold a Next.js app with Tailwind and TypeScript**

Run:

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm
```

Expected: base Next.js app files are created in the current workspace.

- [ ] **Step 2: Add the test dependencies**

Run:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: dev dependencies install successfully.

- [ ] **Step 3: Add Vitest configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    globals: true,
  },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Verify the scaffold builds**

Run:

```bash
npm run build
```

Expected: the starter app builds successfully.

### Task 2: Define the core workflow model with TDD

**Files:**
- Create: `types/workflow.ts`
- Create: `lib/state-machine.ts`
- Test: `lib/state-machine.test.ts`

- [ ] **Step 1: Write the failing transition test**

Create `lib/state-machine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialWorkflowState, transitionWorkflow } from "./state-machine";

describe("workflow state machine", () => {
  it("advances from idea input to topic select after topics load", () => {
    const state = createInitialWorkflowState();

    const next = transitionWorkflow(state, {
      type: "topics_generated",
      topics: [
        { id: "t1", title: "Topic 1", angle: "Angle 1", summary: "Summary 1" },
      ],
    });

    expect(next.currentStep).toBe("topic_select");
    expect(next.topicOptions).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
npx vitest run lib/state-machine.test.ts
```

Expected: FAIL because `state-machine` does not exist yet.

- [ ] **Step 3: Implement the minimal workflow types and transition logic**

Create `types/workflow.ts` and `lib/state-machine.ts` with typed steps, topic/brief/outline/draft/meta models, `createInitialWorkflowState()`, and `transitionWorkflow()` supporting at least:

- `topics_generated`
- `topic_selected`
- `brief_confirmed`
- `outline_generated`
- `drafts_generated`
- `meta_generated`
- `final_version_selected`
- `go_to_step`

- [ ] **Step 4: Re-run the test to verify GREEN**

Run:

```bash
npx vitest run lib/state-machine.test.ts
```

Expected: PASS.

### Task 3: Add mock generators with TDD

**Files:**
- Create: `lib/mock/generators.ts`
- Test: `lib/mock/generators.test.ts`

- [ ] **Step 1: Write the failing mock generator test**

Create `lib/mock/generators.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateTopics } from "./generators";

describe("mock generators", () => {
  it("returns topic options for an idea prompt", async () => {
    const topics = await generateTopics("AI writing workflow");

    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0]).toHaveProperty("title");
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
npx vitest run lib/mock/generators.test.ts
```

Expected: FAIL because generator module does not exist yet.

- [ ] **Step 3: Implement the minimal mock async generators**

Create async functions that return realistic static data for:

- `generateTopics(idea: string)`
- `generateBrief(topicId: string)`
- `generateOutline(topicId: string)`
- `generateDraftVersions(topicId: string)`
- `generateMeta(topicId: string, draftId: string)`

Each function should simulate latency with a small `Promise`.

- [ ] **Step 4: Re-run the test to verify GREEN**

Run:

```bash
npx vitest run lib/mock/generators.test.ts
```

Expected: PASS.

### Task 4: Build local persistence with TDD

**Files:**
- Create: `lib/storage/workflow-storage.ts`
- Test: `lib/storage/workflow-storage.test.ts`

- [ ] **Step 1: Write the failing persistence test**

Create `lib/storage/workflow-storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialWorkflowState } from "../state-machine";
import { loadWorkflowState, saveWorkflowState } from "./workflow-storage";

describe("workflow storage", () => {
  it("saves and restores workflow state", () => {
    const state = createInitialWorkflowState();
    state.ideaInput = "Draft an article";

    saveWorkflowState(state);
    const restored = loadWorkflowState();

    expect(restored?.ideaInput).toBe("Draft an article");
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
npx vitest run lib/storage/workflow-storage.test.ts
```

Expected: FAIL because storage helpers do not exist yet.

- [ ] **Step 3: Implement localStorage helpers**

Implement:

- `saveWorkflowState(state)`
- `loadWorkflowState()`
- `clearWorkflowState()`

Use a single storage key and guard for server-side execution.

- [ ] **Step 4: Re-run the test to verify GREEN**

Run:

```bash
npx vitest run lib/storage/workflow-storage.test.ts
```

Expected: PASS.

### Task 5: Compose the MVP app shell and primary layout

**Files:**
- Modify: `app/page.tsx`
- Create: `components/workspace-shell.tsx`
- Create: `components/chat-panel.tsx`
- Create: `components/manuscript-panel.tsx`
- Create: `components/workflow-status.tsx`

- [ ] **Step 1: Write the failing layout test**

Create `components/workspace-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceShell } from "./workspace-shell";
import { createInitialWorkflowState } from "@/lib/state-machine";

describe("WorkspaceShell", () => {
  it("renders chat and manuscript regions", () => {
    render(<WorkspaceShell state={createInitialWorkflowState()} />);

    expect(screen.getByText(/chat/i)).toBeInTheDocument();
    expect(screen.getByText(/manuscript/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
npx vitest run components/workspace-shell.test.tsx
```

Expected: FAIL because component does not exist yet.

- [ ] **Step 3: Implement the two-panel shell**

Build:

- a left chat column
- a right manuscript column
- a workflow status header
- responsive stack on mobile, split view on desktop

`app/page.tsx` should render the shell using client-side state.

- [ ] **Step 4: Re-run the test to verify GREEN**

Run:

```bash
npx vitest run components/workspace-shell.test.tsx
```

Expected: PASS.

### Task 6: Implement workflow stage UIs

**Files:**
- Create: `components/stages/idea-stage.tsx`
- Create: `components/stages/topic-stage.tsx`
- Create: `components/stages/brief-stage.tsx`
- Create: `components/stages/outline-stage.tsx`
- Create: `components/stages/draft-stage.tsx`
- Create: `components/stages/meta-stage.tsx`
- Create: `components/stages/final-stage.tsx`
- Modify: `components/manuscript-panel.tsx`

- [ ] **Step 1: Write a failing stage interaction test**

Create `components/stages/topic-stage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TopicStage } from "./topic-stage";

describe("TopicStage", () => {
  it("calls onSelect when a topic card is chosen", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <TopicStage
        topics={[{ id: "t1", title: "Topic 1", angle: "Angle 1", summary: "Summary 1" }]}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByRole("button", { name: /choose topic 1/i }));

    expect(onSelect).toHaveBeenCalledWith("t1");
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
npx vitest run components/stages/topic-stage.test.tsx
```

Expected: FAIL because `TopicStage` does not exist yet.

- [ ] **Step 3: Implement each stage component**

Build the manuscript-side stages:

- idea entry with generate button
- topic cards
- brief confirmation card
- outline with material slots
- draft version list and draft preview
- title/summary cards
- final review with copy button

Wire stage rendering from `currentStep`.

- [ ] **Step 4: Re-run the test to verify GREEN**

Run:

```bash
npx vitest run components/stages/topic-stage.test.tsx
```

Expected: PASS.

### Task 7: Wire app interactions and mocked generation flow

**Files:**
- Create: `components/app-client.tsx`
- Modify: `app/page.tsx`
- Modify: `components/workspace-shell.tsx`

- [ ] **Step 1: Write a failing integration test**

Create `components/app-client.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppClient } from "./app-client";

describe("AppClient", () => {
  it("moves from idea input to topic selection", async () => {
    const user = userEvent.setup();
    render(<AppClient />);

    await user.type(screen.getByLabelText(/core idea/i), "AI writing workflow");
    await user.click(screen.getByRole("button", { name: /generate topics/i }));

    expect(await screen.findByText(/choose a direction/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
npx vitest run components/app-client.test.tsx
```

Expected: FAIL because the app is not wired yet.

- [ ] **Step 3: Implement the client orchestration**

Use `useState` and `useEffect` to:

- load saved state on mount
- save state after transitions
- call mock generators on user actions
- progress through the state machine
- allow backward navigation between completed steps

- [ ] **Step 4: Re-run the test to verify GREEN**

Run:

```bash
npx vitest run components/app-client.test.tsx
```

Expected: PASS.

### Task 8: Final verification and polish

**Files:**
- Modify: `app/globals.css`
- Modify: any component files needed for loading/error/copy states

- [ ] **Step 1: Add loading and error affordances**

Implement visible loading text or disabled buttons during mock generation, plus retry-safe error rendering.

- [ ] **Step 2: Verify the full automated suite**

Run:

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 3: Verify production build**

Run:

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Run the local app manually**

Run:

```bash
npm run dev
```

Expected: the app starts locally and supports the end-to-end flow:
`idea -> topic -> brief -> outline -> draft -> title/summary -> final copy`
