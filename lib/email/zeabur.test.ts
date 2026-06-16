import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendZeaburEmail } from "./zeabur";

describe("sendZeaburEmail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("ZEABUR_EMAIL_API_KEY", "test-email-key");
    vi.stubEnv("ZEABUR_EMAIL_FROM", "Writeflow <noreply@example.com>");
  });

  it("sends html and text email through Zeabur Email", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          email_id: "email-1",
          status: "queued",
          message: "Email queued for sending",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    await sendZeaburEmail({
      to: "reader@example.com",
      subject: "验证你的邮箱",
      html: "<p>点击验证</p>",
      text: "点击验证",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.zeabur.com/api/v1/zsend/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-email-key",
        },
        body: JSON.stringify({
          from: "Writeflow <noreply@example.com>",
          to: ["reader@example.com"],
          subject: "验证你的邮箱",
          html: "<p>点击验证</p>",
          text: "点击验证",
        }),
      }
    );
  });

  it("fails clearly when Zeabur Email is not configured", async () => {
    vi.stubEnv("ZEABUR_EMAIL_API_KEY", "");

    await expect(
      sendZeaburEmail({
        to: "reader@example.com",
        subject: "验证你的邮箱",
        html: "<p>点击验证</p>",
        text: "点击验证",
      })
    ).rejects.toThrow("ZEABUR_EMAIL_API_KEY");
  });
});
