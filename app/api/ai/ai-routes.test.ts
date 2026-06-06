import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as postTopics } from "./topics/route";
import { POST as postTopicsStream } from "./topics/stream/route";

describe("AI routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns topics from the topics route", async () => {
    const request = new Request("http://localhost:3000/api/ai/topics", {
      method: "POST",
      body: JSON.stringify({
        idea: "公众号 AI 写作流程",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await postTopics(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.topics.length).toBeGreaterThan(0);
  });

  it("streams progress events before the final topics result", async () => {
    const request = new Request("http://localhost:3000/api/ai/topics/stream", {
      method: "POST",
      body: JSON.stringify({
        idea: "公众号 AI 写作流程",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await postTopicsStream(request);
    const text = await response.text();
    const payloads = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(response.headers.get("Content-Type")).toContain("application/x-ndjson");
    expect(payloads.some((payload) => payload.type === "progress")).toBe(true);
    expect(payloads[payloads.length - 1].type).toBe("result");
  });

  it("returns a clear error when a real provider is selected without a key", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");

    const request = new Request("http://localhost:3000/api/ai/topics", {
      method: "POST",
      body: JSON.stringify({
        idea: "real provider",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await postTopics(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(String(json.error)).toMatch(/OPENAI_API_KEY|openai/i);
  });

  it("returns a clear error when mimo is selected without a key", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");

    const request = new Request("http://localhost:3000/api/ai/topics", {
      method: "POST",
      body: JSON.stringify({
        idea: "mimo provider",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await postTopics(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(String(json.error)).toMatch(/MIMO_API_KEY|mimo/i);
  });
});
