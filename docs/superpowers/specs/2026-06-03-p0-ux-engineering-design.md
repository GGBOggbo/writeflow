# P0 修复设计：拆 AppClient + 步骤回退 + Brief 可编辑

日期：2026-06-03

## 背景

`app-client.tsx` 是一个 350 行的 God Component，同时管理状态、API 调用编排和 UI 组装。ManuscriptPanel 通过 16+ props 透传所有 handler，中间层无实际消费。用户流程只能前进不可回退，Brief 确认后不可编辑。

## 设计目标

1. 将 AppClient 拆成自定义 hook + Context，消除 prop drilling
2. 让用户能回到任意已完成步骤，不丢数据
3. 让 Brief 的 6 个维度在确认前可编辑

## 一、拆 AppClient + Context

### 文件结构

```
components/
├── hooks/
│   └── use-workflow.ts        ← 新文件，持有状态+暴露 handler
├── workflow-context.tsx        ← 新文件，Context + Provider + useWorkflow()
├── app-client.tsx              ← 瘦身到 ~50 行
├── manuscript-panel.tsx        ← 去掉 16+ props，从 Context 取
├── workspace-shell.tsx         ← 从 Context 取 state/loading/error
└── stages/
    └── *.tsx                   ← 各自从 Context 取自己需要的
```

### use-workflow.ts

职责：持有全部 workflow 状态，暴露所有 handler。

```ts
export function useWorkflow() {
  const [state, setState] = useState(createInitialWorkflowState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("复制最终稿");
  const [copyFailed, setCopyFailed] = useState(false);

  // localStorage 恢复与保存（现有逻辑原样迁移）

  // 所有 handler（现有逻辑原样迁移）：
  // handleIdeaChange, handleGenerateTopics, handleSelectTopic,
  // handleConfirmBrief, handleGenerateDrafts, handleSelectDraft,
  // handleGenerateMeta, handleContinueToFinal, handleBackToMeta,
  // handleSelectFinal, handleSelectTitle, handleSelectSummary,
  // handleCopyFinal, handleResetWorkflow

  return { state, loading, error, copyLabel, copyFailed, /* 所有 handler */ };
}
```

关键改动：
- 修复 `handleSelectTopic` 中 `setState` 绕过 `updateState` 的问题，统一用 `updateState`
- 抽出 `getSelectedTopic(state)` 工具函数，消除 5 处重复的 `topicOptions.find(...)`

### workflow-context.tsx

```ts
type WorkflowContextValue = ReturnType<typeof useWorkflow>;

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const workflow = useWorkflow();
  return <WorkflowContext.Provider value={workflow}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider");
  return ctx;
}
```

### 各组件的改法

**app-client.tsx**：~50 行，只做 `<WorkflowProvider>` + `<WorkspaceShell />`

**workspace-shell.tsx**：内部调用 `useWorkflow()` 取 `state` / `loading` / `error` / `onResetWorkflow`，去掉对应 props。`chatContent` 和 `manuscriptContent` 改为组件内部直接渲染（不再由外部传入）。

**manuscript-panel.tsx**：去掉全部 props，内部调用 `useWorkflow()`，只负责根据 `state.currentStep` 路由到对应 Stage。

**Stage 组件**：每个 Stage 各自调用 `useWorkflow()` 取自己需要的值。例如：
- `IdeaStage`：`state.ideaInput`, `loading`, `handleIdeaChange`, `handleGenerateTopics`
- `TopicStage`：`state.topicOptions`, `state.selectedTopicId`, `loading`, `handleSelectTopic`
- `BriefStage`：`state.brief`, `state.topicOptions`, `loading`, `handleConfirmBrief`, `handleBriefUpdate`（新增）
- 以此类推

## 二、步骤可回退

### 状态机改动

`go_to_step` 事件加前置校验：

```ts
const stepPrerequisites: Record<WorkflowStep, (s: WorkflowState) => boolean> = {
  idea_input: () => true,
  topic_select: (s) => s.topicOptions.length > 0,
  brief_confirm: (s) => s.selectedTopicId !== null,
  outline_review: (s) => s.brief !== null,
  draft_review: (s) => s.outline.length > 0,
  meta_review: (s) => s.draftVersions.length > 0,
  finalize: (s) => s.titleOptions.length > 0,
};
```

`go_to_step` 的 case 中，先检查前置条件，不满足则不跳转（返回原 state）。

### UI 改动

`WorkflowStatus` 组件中，已完成步骤变成可点击按钮：
- 当前步骤：深色背景（`bg-stone-900`）
- 已完成步骤：绿色背景（`bg-[#dce8d5]`）+ `cursor-pointer` + hover 效果
- 未到达步骤：灰色（`bg-stone-100`），不可点击

点击已完成步骤时，触发 `go_to_step` 事件。因为状态机有前置校验，所以只能跳到数据就位的步骤。

### 回退不丢数据

回退只改 `currentStep`，不清空后续步骤的数据。用户重做某步时，新的 API 调用结果自然覆盖旧数据。

## 三、Brief 全字段可编辑

### 状态机新增事件

```ts
| { type: "brief_updated"; brief: Brief }
```

transition 逻辑：

```ts
case "brief_updated":
  return { ...state, brief: event.brief };
```

### BriefStage UI 改动

加载完成后（`brief` 非 null），从只读 `<dd>` 变成表单：

- `objective`：`<textarea>`，单行输入
- `audience`：`<textarea>`，单行输入
- `persona`：`<textarea>`，2-3 行输入
- `tone`：`<textarea>`，单行输入
- `dropOffPoint`：`<textarea>`，2-3 行输入
- `constraints`：`<textarea>`，多行输入，每行一条约束

表单值的同步方式：每个字段 `onChange` 时组装完整的 Brief 对象，触发 `brief_updated` 事件写入 state。

样式保持现有设计语言：stone 色系、大圆角、一致的间距。

"确认提纲"按钮保持不变，点击后才触发大纲生成 API 调用。

### Mock / Real provider 不受影响

Provider 返回完整 Brief，只是用户现在可以编辑后再确认。

## 四、新增文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/hooks/use-workflow.ts` | 新增 | 状态管理 + API 调用编排 |
| `components/workflow-context.tsx` | 新增 | Context + Provider + useWorkflow() |
| `components/app-client.tsx` | 重写 | 瘦身到 Provider + Shell |
| `components/manuscript-panel.tsx` | 重写 | 去 props，从 Context 取 |
| `components/workspace-shell.tsx` | 修改 | 去 props，从 Context 取 |
| `components/chat-panel.tsx` | 修改 | 去 props，从 Context 取 |
| `components/workflow-status.tsx` | 修改 | 已完成步骤可点击回退 |
| `components/stages/brief-stage.tsx` | 修改 | 6 字段变成可编辑表单 |
| `components/stages/idea-stage.tsx` | 修改 | 去 props，从 Context 取 |
| `components/stages/topic-stage.tsx` | 修改 | 去 props，从 Context 取 |
| `components/stages/outline-stage.tsx` | 修改 | 去 props，从 Context 取 |
| `components/stages/draft-stage.tsx` | 修改 | 去 props，从 Context 取 |
| `components/stages/meta-stage.tsx` | 修改 | 去 props，从 Context 取 |
| `components/stages/final-stage.tsx` | 修改 | 去 props，从 Context 取 |
| `types/workflow.ts` | 修改 | 新增 `brief_updated` 事件 |
| `lib/state-machine.ts` | 修改 | 新增事件处理 + go_to_step 前置校验 |

## 五、测试影响

需要更新的测试文件：
- `lib/state-machine.test.ts`：新增 `brief_updated` 事件测试 + `go_to_step` 前置校验测试
- `components/workspace-shell.test.tsx`：适配 Context
- `components/app-client.test.tsx`：适配新结构
- `components/stages/topic-stage.test.tsx`：适配 Context
- `components/stages/final-stage.test.tsx`：适配 Context
