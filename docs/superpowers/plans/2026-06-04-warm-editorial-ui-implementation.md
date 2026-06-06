# Warm Editorial UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 AI 写作工作台升级为 Warm Editorial 风格的主编陪跑型界面，同时保持现有流程与交互能力不变。

**Architecture:** 通过重构 shell、左侧主编台、顶部封面、阶段轨道和关键 stage 卡片来完成视觉与信息架构升级。业务逻辑与状态机尽量保持不动，主要调整展示结构、复用样式和少量文案组织。

**Tech Stack:** Next.js 16 App Router, React 19 Client Components, Tailwind CSS v4, Vitest, ESLint

---

### Task 1: 写设计文档与实现计划

**Files:**
- Create: `docs/superpowers/specs/2026-06-04-warm-editorial-ui-design.md`
- Create: `docs/superpowers/plans/2026-06-04-warm-editorial-ui-implementation.md`

- [ ] 记录 Warm Editorial 的设计目标、信息架构、关键交互、视觉系统和工程边界。
- [ ] 将实现分解到 shell、状态轨道、左侧面板、关键 stage 和验证步骤。

### Task 2: 生成源码快照用于人工回退

**Files:**
- Copy: `app/globals.css`
- Copy: `components/workspace-shell.tsx`
- Copy: `components/chat-panel.tsx`
- Copy: `components/manuscript-panel.tsx`
- Copy: `components/workflow-status.tsx`
- Copy: `components/stages/*.tsx`

- [ ] 创建一个本地备份目录，保存改造前的关键 UI 文件副本。
- [ ] 让后续回退可以通过对比快照和当前文件手动恢复。

### Task 3: 重构全局视觉系统与页面封面

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `components/workspace-shell.tsx`

- [ ] 建立新的暖色视觉 token、背景层、卡片阴影和页面基础排版。
- [ ] 重写工作台顶部，形成带阶段信息、主承诺和新稿动作的任务封面。
- [ ] 保持 `app/page.tsx` 和 `AppClient` 结构不变，避免扩大客户端边界。

### Task 4: 左侧主编台与阶段轨道升级

**Files:**
- Modify: `components/chat-panel.tsx`
- Modify: `components/workflow-status.tsx`
- Modify: `components/search-toggle.tsx`

- [ ] 将左栏从对话区改为主编台，提供当前任务、判断标准、策略信号和下一动作。
- [ ] 把 WorkflowStatus 升级为更强的阶段轨道与节点语义展示。
- [ ] 统一联网增强提示卡的层级和视觉样式。

### Task 5: 右侧工作台与关键阶段改造

**Files:**
- Modify: `components/manuscript-panel.tsx`
- Modify: `components/stages/idea-stage.tsx`
- Modify: `components/stages/topic-stage.tsx`
- Modify: `components/stages/brief-stage.tsx`
- Modify: `components/stages/outline-stage.tsx`
- Modify: `components/stages/draft-stage.tsx`
- Modify: `components/stages/meta-stage.tsx`
- Modify: `components/stages/final-stage.tsx`

- [ ] 给 stage 容器增加一致的标题区、说明区和结果卡层级。
- [ ] 把 `Topic` 改造成选题会视图。
- [ ] 把 `Outline` 改造成结构审稿视图。
- [ ] 把 `Meta` 与 `Final` 改造成包装与出稿视图。

### Task 6: HyperFrames 视觉样片

**Files:**
- Create: `docs/hyperframes/warm-editorial-preview.html`

- [ ] 用 HyperFrames 风格输出一个轻量预览 HTML，展示 Warm Editorial 的封面、阶段推进与卡片质感。
- [ ] 不把它接入产品运行时，只作为演示资产。

### Task 7: 验证与交付说明

**Files:**
- Modify: `progress.md`
- Modify: `findings.md`
- Modify: `task_plan.md`

- [ ] 运行 `npm run test`
- [ ] 运行 `npm run lint`
- [ ] 运行 `npm run build`
- [ ] 更新 planning-with-files 记录本轮改动与验证状态。
- [ ] 在交付说明中明确快照目录与回退方式。
