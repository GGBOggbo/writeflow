export const INITIAL_CREDITS = 5;
export const CREDIT_COST_PER_GENERATION = 1;

export const AI_STAGES = [
  "topics",
  "brief",
  "outline",
  "draft",
  "meta",
] as const;

export type AiStage = (typeof AI_STAGES)[number];

export class InsufficientCreditsError extends Error {
  constructor() {
    super("积分不足，无法继续生成。");
    this.name = "InsufficientCreditsError";
  }
}

export class CreditConflictError extends Error {
  constructor(message = "该生成请求已处理，请勿重复提交。") {
    super(message);
    this.name = "CreditConflictError";
  }
}
