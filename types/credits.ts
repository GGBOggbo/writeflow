export type CreditBalance =
  | { unlimited: true; remaining: null }
  | { unlimited: false; remaining: number };
