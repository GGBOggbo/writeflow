import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "github"],
    requireLocalEmailVerified: false,
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
