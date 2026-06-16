import { nextCookies } from "better-auth/next-js";
import type { BetterAuthOptions } from "better-auth";

type AuthDatabase = BetterAuthOptions["database"];

export function createAuthOptions(database: AuthDatabase): BetterAuthOptions {
  return {
    database,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: true,
    },
    emailVerification: {
      sendOnSignUp: false,
      sendOnSignIn: false,
      autoSignInAfterVerification: true,
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID !== "待填写"
        ? {
            github: {
              clientId: process.env.GITHUB_CLIENT_ID!,
              clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            },
          }
        : {}),
    },
    plugins: [nextCookies()],
  };
}
