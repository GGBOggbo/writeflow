import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: "AI 写作工作台 <onboarding@resend.dev>",
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[Resend] 发送失败:", error.message);
    throw new Error(`邮件发送失败: ${error.message}`);
  }

  console.log("[Resend] 发送成功:", data?.id);
}
