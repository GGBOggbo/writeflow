"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PaymentStatus = "idle" | "processing" | "success" | "failed";

const PACKAGE = {
  credits: 10,
  price: "9.9",
  regenerationCount: 200,
} as const;

const USAGE_ITEMS = [
  "用于同一阶段重新生成，成功返回后才扣除",
  "生成失败自动退回，不吞额度",
  "适合先跑完 1-2 篇文章工作流再判断是否加量",
] as const;

const ORDER_ROWS = [
  ["商品", "10 个积分"],
  ["单价", "¥9.9"],
  ["到账", "订单确认后自动入账"],
] as const;

export function PaymentPage() {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handlePay = () => {
    setStatus("processing");
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setStatus("success");
      timerRef.current = null;
    }, 900);
  };

  const handleRetry = () => {
    setStatus("idle");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-4 py-5 md:px-6 md:py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center rounded-full border border-[rgba(35,48,68,0.10)] bg-white/70 px-4 text-sm font-medium text-stone-600 transition hover:-translate-y-0.5 hover:bg-white hover:text-[#233044]"
        >
          返回工作台
        </Link>
        <span className="rounded-full border border-[rgba(95,121,147,0.18)] bg-white/72 px-3 py-2 text-xs font-semibold text-[#5f7993]">
          安全支付
        </span>
      </div>

      <section className="editorial-card editorial-card-strong editorial-texture relative overflow-hidden rounded-[36px] px-6 py-8 md:px-10 md:py-10">
        <div className="absolute inset-y-0 right-0 hidden w-[36%] bg-[radial-gradient(circle_at_top_right,rgba(207,220,235,0.5),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.32),transparent)] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <p className="editorial-kicker text-xs font-semibold text-[#5f7993]">
              积分充值
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-[#233044] md:text-5xl">
              充值积分
            </h1>
            <p className="editorial-copy mt-4 max-w-2xl text-sm text-stone-700 md:text-[15px]">
              给当前工作台补一小包可控额度。先用 9.9 元拿到 10 个积分，
              足够覆盖多轮重新生成，不需要一次性买很大套餐。
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {USAGE_ITEMS.map((item, index) => (
                <div
                  key={item}
                  className="editorial-panel rounded-[24px] p-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef2f6] text-sm font-bold text-[#5f7993]">
                    {index + 1}
                  </span>
                  <p className="mt-4 text-sm leading-6 text-stone-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-[rgba(95,121,147,0.14)] bg-white/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-stone-500">
                    支付方式
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#233044]">
                    微信支付或支付宝
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full bg-[#e9f0f6] px-3 py-2 text-xs font-semibold text-[#5f7993]">
                    WeChat Pay
                  </span>
                  <span className="rounded-full bg-[#eef3ef] px-3 py-2 text-xs font-semibold text-[#56735f]">
                    Alipay
                  </span>
                </div>
              </div>
            </div>
          </div>

          <aside className="editorial-card relative rounded-[32px] bg-white p-6">
            <div className="rounded-[28px] border border-[rgba(190,112,65,0.18)] bg-[linear-gradient(135deg,#fff7ec,#fbe6d1)] p-5 text-[#7c3f1f]">
              <p className="text-xs font-semibold uppercase opacity-75">
                入门包
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-5xl font-semibold leading-none">
                    ¥{PACKAGE.price}
                  </p>
                  <p className="mt-2 text-sm opacity-80">
                    一次性充值
                  </p>
                </div>
                <div className="rounded-2xl bg-white/72 px-4 py-3 text-right">
                  <p className="text-2xl font-semibold leading-none">
                    {PACKAGE.credits}
                  </p>
                  <p className="mt-1 text-xs font-semibold opacity-75">
                    个积分
                  </p>
                </div>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              {ORDER_ROWS.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-[rgba(35,48,68,0.08)] pb-3 last:border-b-0 last:pb-0"
                >
                  <dt className="text-stone-500">{label}</dt>
                  <dd className="font-semibold text-[#233044]">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 rounded-[20px] bg-[#f3f6f8] px-4 py-3 text-sm font-medium text-[#5f7993]">
              约 {PACKAGE.regenerationCount} 次重新生成
            </p>

            {status === "processing" ? (
              <div className="mt-5 rounded-[24px] border border-[rgba(95,121,147,0.2)] bg-[#f7fafc] px-4 py-4 text-sm font-semibold text-[#233044]">
                正在创建支付订单…
              </div>
            ) : null}

            {status === "success" ? (
              <div className="mt-5 rounded-[24px] border border-[rgba(108,139,116,0.22)] bg-[#f1f6f2] px-4 py-4">
                <p className="text-sm font-semibold text-[#476251]">
                  支付成功
                </p>
                <p className="mt-1 text-sm text-[#56735f]">
                  10 个积分将在订单确认后到账。
                </p>
              </div>
            ) : null}

            {status === "failed" ? (
              <div className="mt-5 rounded-[24px] border border-[rgba(184,108,95,0.22)] bg-[#fff4f1] px-4 py-4">
                <p className="text-sm font-semibold text-[#b86c5f]">
                  订单创建失败
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-3 inline-flex min-h-9 items-center rounded-full border border-[rgba(184,108,95,0.22)] bg-white px-4 text-sm font-semibold text-[#b86c5f] transition hover:-translate-y-0.5"
                >
                  重新创建订单
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePay}
              disabled={status === "processing" || status === "success"}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#233044] px-5 text-base font-semibold text-white shadow-[0_10px_24px_rgba(35,48,68,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1a2432] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
            >
              {status === "success" ? "已完成支付" : "确认支付 ¥9.9"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-stone-500">
              当前版本会先完成前端支付流程，真实收款通道接入后即可替换订单创建逻辑。
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
