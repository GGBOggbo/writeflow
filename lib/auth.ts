import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { createAuthDatabase } from "./auth-database";
import { getDatabaseConfig } from "./database";
import { buildAuthEmail, sendZeaburEmail } from "./email/zeabur";

const databaseConfig = getDatabaseConfig();
const database = createAuthDatabase(databaseConfig);

export const auth = betterAuth({
  database,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: true,
    async sendResetPassword({ user, url }) {
      const email = buildAuthEmail({
        title: "重置你的登录密码",
        body: "我们收到了重置密码的请求。点击下面的按钮设置新密码；如果这不是你本人操作，可以忽略这封邮件。",
        actionLabel: "重置密码",
        actionUrl: url,
      });

      await sendZeaburEmail({
        to: user.email,
        subject: "重置你的 Writeflow 密码",
        ...email,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      const email = buildAuthEmail({
        title: "验证你的邮箱",
        body: "欢迎使用主编陪跑型 AI 共创工作台。点击下面的按钮完成邮箱验证，之后就可以用邮箱和密码登录。",
        actionLabel: "验证邮箱",
        actionUrl: url,
      });

      await sendZeaburEmail({
        to: user.email,
        subject: "验证你的 Writeflow 邮箱",
        ...email,
      });
    },
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
