import { describe, expect, it } from "vitest";
import { WRITING_SYSTEM_PROMPT } from "./system";

describe("WRITING_SYSTEM_PROMPT", () => {
  it("keeps global writing rules strict enough for JSON article generation", () => {
    expect(WRITING_SYSTEM_PROMPT).toContain("六年级");
    expect(WRITING_SYSTEM_PROMPT).toContain("闺蜜/铁哥们");
    expect(WRITING_SYSTEM_PROMPT).toContain("\\n\\n");
    expect(WRITING_SYSTEM_PROMPT).toContain("只返回合法、标准的 JSON");
    expect(WRITING_SYSTEM_PROMPT).toContain("不要使用 ```json");
    expect(WRITING_SYSTEM_PROMPT).toContain("不要使用 Markdown 代码块");
    expect(WRITING_SYSTEM_PROMPT).toContain("严禁编造任何个人经历、客户案例或具体数据");
    expect(WRITING_SYSTEM_PROMPT).toContain("只做降维表达");

    [
      "首先",
      "其次",
      "然而",
      "此外",
      "综上所述",
      "总之",
      "因此",
      "例如",
      "基于此",
      "显而易见",
      "值得注意的是",
      "不可否认",
      "换句话说",
      "尽管如此",
      "由此可见",
      "简而言之",
    ].forEach((word) => {
      expect(WRITING_SYSTEM_PROMPT).toContain(word);
    });
  });
});
