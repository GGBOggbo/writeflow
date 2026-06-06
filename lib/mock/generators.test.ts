import { describe, expect, it } from "vitest";
import { generateTopics } from "./generators";

describe("mock generators", () => {
  it("returns topic options for an idea prompt", async () => {
    const topics = await generateTopics("AI writing workflow");

    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0]).toHaveProperty("title");
  });
});
