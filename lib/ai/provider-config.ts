import type { AIProviderName } from "./provider";

export type RealProviderConfig = {
  name: Exclude<AIProviderName, "mock">;
  apiKey: string | undefined;
  model: string | undefined;
  baseUrl?: string | undefined;
};

export function getProviderName(): AIProviderName {
  const rawName = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();

  if (
    rawName === "mock" ||
    rawName === "openai" ||
    rawName === "anthropic" ||
    rawName === "mimo"
  ) {
    return rawName;
  }

  throw new Error(`AI provider "${rawName}" 未实现`);
}

export function getRealProviderConfig(
  name: Exclude<AIProviderName, "mock">
): RealProviderConfig {
  if (name === "openai") {
    return {
      name,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    };
  }

  if (name === "anthropic") {
    return {
      name,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL,
    };
  }

  return {
    name: "mimo",
    apiKey: process.env.MIMO_API_KEY,
    model: process.env.MIMO_MODEL,
    baseUrl: process.env.MIMO_BASE_URL,
  };
}

export function assertProviderKey(config: RealProviderConfig) {
  if (config.apiKey) {
    return;
  }

  const keyName =
    config.name === "openai"
      ? "OPENAI_API_KEY"
      : config.name === "anthropic"
        ? "ANTHROPIC_API_KEY"
        : "MIMO_API_KEY";

  throw new Error(`${keyName} 未配置，无法使用 ${config.name} provider。`);
}
