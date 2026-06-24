import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { safeGetSession } from "@/lib/auth-session";

export async function proxy(request: NextRequest) {
  const session = await safeGetSession({
    headers: request.headers,
    getSession: auth.api.getSession,
  });

  // 未登录 → 跳转到登录页
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 保护除了以下路径之外的所有页面：
     * - / (首页落地页，未登录可看)
     * - /login (登录页)
     * - /payment (静态充值页，创建订单 API 再做登录校验)
     * - /api (API 路由)
     * - /_next (Next.js 内部资源)
     * - 静态资源
     */
    "/((?!$|login|reset-password|payment|api|_next/static|_next/image|favicon.ico).*)",
  ],
};
