import type { Metadata } from "next";
import { PaymentPage } from "@/components/payment-page";

export const metadata: Metadata = {
  title: "充值积分 | 主编陪跑型 AI 共创工作台",
  description: "用 9.9 元充值 10 个积分",
};

export default function Page() {
  return <PaymentPage />;
}
