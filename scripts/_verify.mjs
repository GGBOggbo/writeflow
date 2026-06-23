import { renderExtendedMarkdown } from "../lib/formatting/render-extended-markdown.ts";
import { parseAdvancedMarkdown, validateAdvancedModuleNode } from "../lib/markdown/advanced-modules.ts";

// 用户真实输入(字段型)
const input = `:::wf-compare
side: 常规长上下文模型
heading: 处理长文档时遗忘关键冲突
body: 常规模型在处理前20页时表现正常，但当任务推进到第30页之后，它开始遗漏关键信息。

side: GLM-5.2
heading: 全程记忆并主动揭示风险
body: GLM-5.2 在同样的任务中提取了全部五个付款节点。
:::`;

console.log("=== 1. 解析 + 校验 ===");
const nodes = parseAdvancedMarkdown(input);
const n = nodes.find(x => x.type === "module");
console.log("校验:", validateAdvancedModuleNode(n));
console.log("fieldEntries 数:", n.fieldEntries.length);

console.log("\n=== 2. 渲染 ===");
const html = renderExtendedMarkdown(input);
console.log("✅ 含 wf-compare 模块?", html.includes('data-writeflow-module="wf-compare"'));
console.log("✅ 含 '常规长上下文'?", html.includes("常规长上下文"));
console.log("✅ 含 'GLM-5.2'?", html.includes("GLM-5.2"));
console.log("✅ 含两列网格?", html.includes("grid-template-columns:1fr 1fr"));
console.log("✅ 含格式提示(应 false)?", html.includes("格式提示"));
console.log("✅ 含原始 ::: (应 false)?", html.includes(":::wf"));
