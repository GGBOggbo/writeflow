export const CREDIT_UNITS_PER_CREDIT = 100;
export const INITIAL_CREDIT_AMOUNT = 5;
export const INITIAL_CREDITS = INITIAL_CREDIT_AMOUNT * CREDIT_UNITS_PER_CREDIT;
export const FREE_GENERATION_CREDIT_COST_UNITS = 0;
export const REGENERATION_CREDIT_COST_UNITS = 5;
export const CREDIT_COST_PER_GENERATION = REGENERATION_CREDIT_COST_UNITS;

export function creditUnitsToAmount(units: number) {
  return units / CREDIT_UNITS_PER_CREDIT;
}

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
    super("重新生成需要至少 0.05 积分。");
    this.name = "InsufficientCreditsError";
  }
}

export class CreditConflictError extends Error {
  constructor(message = "该生成请求已处理，请勿重复提交。") {
    super(message);
    this.name = "CreditConflictError";
  }
}
