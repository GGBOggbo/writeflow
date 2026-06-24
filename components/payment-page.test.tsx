import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PaymentPage } from "./payment-page";

describe("PaymentPage", () => {
  it("shows the starter credit package", () => {
    render(<PaymentPage />);

    expect(screen.getByRole("heading", { name: /充值积分/i })).toBeInTheDocument();
    expect(screen.getAllByText("¥9.9").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10 个积分").length).toBeGreaterThan(0);
    expect(screen.getByText(/约 200 次重新生成/i)).toBeInTheDocument();
  });

  it("moves from order creation to a success receipt", async () => {
    const user = userEvent.setup();

    render(<PaymentPage />);

    await user.click(screen.getByRole("button", { name: "确认支付 ¥9.9" }));

    expect(screen.getByText("正在创建支付订单…")).toBeInTheDocument();

    expect(await screen.findByText("支付成功")).toBeInTheDocument();
    expect(screen.getByText("10 个积分将在订单确认后到账。")).toBeInTheDocument();
  });
});
