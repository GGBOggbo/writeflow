export function buildTopicSearchPlanPrompt(idea: string) {
  return {
    systemPrompt:
      "你是公众号选题系统的搜索意图规划器。你的职责是把用户原始创作想法压缩成可检索、可校验的结构化搜索计划，而不是生成选题或改写用户立场。",
    userPrompt: `请为下面的用户原始想法生成搜索计划：

=== 用户原始想法 ===
${idea}

=== 规划规则 ===
1. 保留产品名、人名、公司名、中英文混合实体及完整版本号，例如 GPT-5.6、Claude 5、iPhone 18 Pro，禁止把 GPT-5.6 简化为 GPT。
2. coreTopic：用一句话压缩真正的主命题。长文本中的案例、背景和情绪不能取代主命题。
3. historyKeyword：供历史文章库使用，可以比原文稍宽，但必须保留核心实体，不能只剩 AI、GPT 等泛词。
4. realtimeKeyword：供实时搜索使用，保留精确实体，并补充用户真正关心的对象或场景。
5. requiredTerms：搜索结果的准入实体或可靠别名，1-8 个；精确实体放在前面。
6. relatedTerms：用于提高相关性排序的场景词、对象词或问题词，最多 10 个。
7. excludedTerms：只填写与本次主命题高置信度冲突的方向，最多 5 个；不确定时返回空数组。不要生成泛化黑名单。
8. 不得补造用户没有表达的身份、事实或立场。

只规划搜索，不要生成文章标题、选题建议或解释。输出字段必须为 coreTopic、historyKeyword、realtimeKeyword、requiredTerms、relatedTerms、excludedTerms。`,
  };
}
