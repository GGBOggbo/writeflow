const ZEABUR_EMAIL_ENDPOINT = "https://api.zeabur.com/api/v1/zsend/emails";

type SendZeaburEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to send email`);
  }

  return value;
}

export async function sendZeaburEmail({
  to,
  subject,
  html,
  text,
}: SendZeaburEmailInput) {
  const apiKey = getRequiredEnv("ZEABUR_EMAIL_API_KEY");
  const from = getRequiredEnv("ZEABUR_EMAIL_FROM");

  const response = await fetch(ZEABUR_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      `Zeabur Email request failed with ${response.status}${
        responseText ? `: ${responseText}` : ""
      }`
    );
  }
}

export function buildAuthEmail({
  title,
  body,
  actionLabel,
  actionUrl,
}: {
  title: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
}) {
  const text = `${title}\n\n${body}\n\n${actionLabel}: ${actionUrl}`;
  const html = `
    <div style="margin:0;padding:32px;background:#f3f5f7;color:#233044;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei UI',sans-serif;">
      <div style="max-width:520px;margin:0 auto;border:1px solid rgba(35,48,68,0.12);border-radius:24px;background:#ffffff;padding:28px;box-shadow:0 18px 40px rgba(31,42,55,0.06);">
        <p style="margin:0 0 12px;color:#5f7993;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">WRITEFLOW</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#233044;">${title}</h1>
        <p style="margin:0 0 24px;color:#56616d;font-size:15px;line-height:1.75;">${body}</p>
        <a href="${actionUrl}" style="display:inline-block;border-radius:999px;background:#233044;color:#ffffff;padding:12px 18px;text-decoration:none;font-size:14px;font-weight:700;">${actionLabel}</a>
        <p style="margin:24px 0 0;color:#8a96a3;font-size:12px;line-height:1.6;">如果按钮无法打开，请复制这个链接到浏览器：<br>${actionUrl}</p>
      </div>
    </div>
  `;

  return { html, text };
}
