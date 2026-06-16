import { headers } from "next/headers";
import { AppClient } from "@/components/app-client";
import { auth } from "@/lib/auth";
import { safeGetSession } from "@/lib/auth-session";
import { creditStore } from "@/lib/credits";

export default async function Home() {
  const session = await safeGetSession({
    headers: await headers(),
    getSession: auth.api.getSession,
  });
  const initialCreditBalance = session?.user
    ? await creditStore.getBalance(session.user.id)
    : null;

  return <AppClient initialCreditBalance={initialCreditBalance} />;
}
