import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { creditStore } from "@/lib/credits";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "请先登录后再使用。" }, { status: 401 });
  }

  return NextResponse.json(await creditStore.getBalance(session.user.id));
}
