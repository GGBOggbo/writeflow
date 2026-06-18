# Subscription Account Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected `/subscription` account page that renders the authenticated user's real credit balance and expose it from the workspace credit card without implementing payment or order backends.

**Architecture:** Keep request-specific data loading in the App Router Server Component and pass only serializable user/balance props into a focused presentational component. Reuse the existing `safeGetSession` and `creditStore` paths used by the home page; keep the workspace change limited to a `Link` around the existing balance surface.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest 4, Testing Library 16.

---

## File Structure

- Create `components/subscription/subscription-page.tsx`: pure subscription/account presentation.
- Create `components/subscription/subscription-page.test.tsx`: normal and unlimited balance UI contract.
- Create `app/subscription/page.tsx`: authenticated server data loading.
- Create `app/subscription/page.test.tsx`: verifies session user ID is used for credit lookup.
- Modify `components/workspace-shell.tsx`: link the existing credit surface to `/subscription`.
- Modify `components/workspace-shell.test.tsx`: lock the navigation entry.

### Task 1: Subscription Presentation Component

**Files:**
- Create: `components/subscription/subscription-page.test.tsx`
- Create: `components/subscription/subscription-page.tsx`

- [ ] **Step 1: Write failing tests for regular and unlimited users**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubscriptionPage } from "./subscription-page";

describe("SubscriptionPage", () => {
  it("shows the authenticated user's real credit balance and unavailable purchase state", () => {
    render(
      <SubscriptionPage
        email="reader@qq.com"
        creditBalance={{ unlimited: false, remaining: 12 }}
      />
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("¥")).toBeInTheDocument();
    expect(screen.getByText("9.9")).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "购买体验包" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "即将开放" })).toBeDisabled();
    expect(screen.queryByText("积分使用说明")).not.toBeInTheDocument();
    expect(screen.queryByText("查看积分明细")).not.toBeInTheDocument();
  });

  it("shows unlimited credits for administrators", () => {
    render(
      <SubscriptionPage
        email="admin@example.com"
        creditBalance={{ unlimited: true, remaining: null }}
      />
    );

    expect(screen.getByText("∞")).toBeInTheDocument();
    expect(screen.getByText("管理员生成不消耗积分")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx vitest run components/subscription/subscription-page.test.tsx
```

Expected: FAIL because `components/subscription/subscription-page.tsx` does not exist.

- [ ] **Step 3: Implement the presentation component**

Create a typed component with this public contract:

```tsx
import Link from "next/link";
import type { CreditBalance } from "@/types/credits";

type SubscriptionPageProps = {
  email: string;
  creditBalance: CreditBalance;
};

export function SubscriptionPage({
  email,
  creditBalance,
}: SubscriptionPageProps) {
  const creditValue = creditBalance.unlimited
    ? "∞"
    : String(creditBalance.remaining);
  const creditCaption = creditBalance.unlimited
    ? "管理员生成不消耗积分"
    : "每次生成消耗 1 积分";

  return (
    <main>{/* approved account, plans, and empty orders layout */}</main>
  );
}
```

Implement the approved layout with:

- `/` return link.
- email and two-character avatar label.
- real `creditValue` and `creditCaption`.
- free-user account status.
- experience card: `¥9.9`, `100` credits, four confirmed benefit lines.
- disabled `购买体验包` and disabled `即将开放` buttons.
- empty order table.
- no credit-rules section and no credit-detail action.
- project blue-gray tokens, `rounded-lg` maximum, tabular numerals, desktop two-column and mobile one-column.

- [ ] **Step 4: Run the component test and verify GREEN**

Run:

```bash
npx vitest run components/subscription/subscription-page.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit the component**

```bash
git add components/subscription/subscription-page.tsx components/subscription/subscription-page.test.tsx
git commit -m "feat: add subscription account view"
```

### Task 2: Authenticated Subscription Route

**Files:**
- Create: `app/subscription/page.test.tsx`
- Create: `app/subscription/page.tsx`

- [ ] **Step 1: Write a failing server-page test**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubscriptionRoute from "./page";

const mocks = vi.hoisted(() => ({
  getBalance: vi.fn(),
  getSession: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/auth-session", () => ({
  safeGetSession: mocks.getSession,
}));
vi.mock("@/lib/credits", () => ({
  creditStore: { getBalance: mocks.getBalance },
}));

describe("SubscriptionRoute", () => {
  beforeEach(() => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getSession.mockResolvedValue({
      user: { id: "user-42", email: "reader@qq.com" },
    });
    mocks.getBalance.mockResolvedValue({
      unlimited: false,
      remaining: 37,
    });
  });

  it("loads credits for the authenticated user", async () => {
    render(await SubscriptionRoute());

    expect(mocks.getBalance).toHaveBeenCalledWith("user-42");
    expect(screen.getByText("37")).toBeInTheDocument();
    expect(screen.getByText("reader@qq.com")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the route test and verify RED**

Run:

```bash
npx vitest run app/subscription/page.test.tsx
```

Expected: FAIL because `app/subscription/page.tsx` does not exist.

- [ ] **Step 3: Implement the Server Component route**

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SubscriptionPage } from "@/components/subscription/subscription-page";
import { auth } from "@/lib/auth";
import { safeGetSession } from "@/lib/auth-session";
import { creditStore } from "@/lib/credits";

export default async function SubscriptionRoute() {
  const session = await safeGetSession({
    headers: await headers(),
    getSession: auth.api.getSession,
  });

  if (!session?.user) {
    redirect("/login?redirect=/subscription");
  }

  const creditBalance = await creditStore.getBalance(session.user.id);

  return (
    <SubscriptionPage
      email={session.user.email}
      creditBalance={creditBalance}
    />
  );
}
```

Add a focused unauthenticated test by mocking `next/navigation.redirect` and asserting:

```tsx
expect(redirectMock).toHaveBeenCalledWith(
  "/login?redirect=/subscription"
);
expect(mocks.getBalance).not.toHaveBeenCalled();
```

- [ ] **Step 4: Run route and component tests**

Run:

```bash
npx vitest run app/subscription/page.test.tsx components/subscription/subscription-page.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit the route**

```bash
git add app/subscription/page.tsx app/subscription/page.test.tsx
git commit -m "feat: serve subscription page with account credits"
```

### Task 3: Workspace Credit Entry

**Files:**
- Modify: `components/workspace-shell.test.tsx`
- Modify: `components/workspace-shell.tsx`

- [ ] **Step 1: Write a failing navigation test**

Add to `components/workspace-shell.test.tsx`:

```tsx
it("links the credit balance to the subscription page", () => {
  render(
    <WorkflowProvider
      initialCreditBalance={{ unlimited: false, remaining: 5 }}
    >
      <WorkspaceShell />
    </WorkflowProvider>
  );

  expect(
    screen.getByRole("link", { name: "查看积分与订阅，剩余 5 积分" })
  ).toHaveAttribute("href", "/subscription");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx vitest run components/workspace-shell.test.tsx
```

Expected: FAIL because the credit balance is not a link.

- [ ] **Step 3: Link the existing balance surface**

Import:

```tsx
import Link from "next/link";
```

Replace the outer credit balance `<div>` with:

```tsx
<Link
  href="/subscription"
  data-onboarding-target="credits"
  aria-label={
    creditBalance?.unlimited
      ? "查看积分与订阅，无限积分"
      : hasNoCredits
        ? "查看积分与订阅，积分不足"
        : `查看积分与订阅，剩余 ${creditValue} 积分`
  }
  className="..."
>
  {/* preserve current credit content */}
</Link>
```

Keep onboarding targeting and existing zero-credit visual behavior unchanged.

- [ ] **Step 4: Run the workspace and subscription tests**

Run:

```bash
npx vitest run components/workspace-shell.test.tsx components/subscription/subscription-page.test.tsx app/subscription/page.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit the entry**

```bash
git add components/workspace-shell.tsx components/workspace-shell.test.tsx
git commit -m "feat: link credits to subscription page"
```

### Task 4: Full Verification and Browser Review

**Files:**
- Modify only if verification exposes a defect in the files above.

- [ ] **Step 1: Run the full automated test suite**

```bash
npm test
```

Expected: all tests pass; the existing intentionally skipped legacy formatting tests remain skipped.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: exit code 0 with no errors.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: Next.js 16.2.7 build succeeds and includes `/subscription`.

- [ ] **Step 4: Check whitespace errors**

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Review in browser**

With the development server running:

1. Log in and open `/`.
2. Click the credit balance surface and verify navigation to `/subscription`.
3. Confirm the displayed balance matches the workspace balance.
4. Confirm purchase and monthly membership buttons are disabled.
5. Check desktop at the normal browser viewport.
6. Check mobile at `390×844`.
7. Confirm no text overlap, overflow, or nested-card visual artifacts.

- [ ] **Step 6: Final implementation commit if verification required fixes**

```bash
git add app/subscription components/subscription components/workspace-shell.tsx components/workspace-shell.test.tsx
git commit -m "fix: polish subscription account page"
```
