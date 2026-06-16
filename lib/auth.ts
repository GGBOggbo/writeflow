import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getDatabaseConfig, getPostgresPool, getSqliteDatabase } from "./database";

const databaseConfig = getDatabaseConfig();
const database =
  databaseConfig.provider === "sqlite"
    ? getSqliteDatabase()
    : {
        db: getPostgresPool(),
        type: "postgres" as const,
      };

export const auth = betterAuth({
  database,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
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
});
