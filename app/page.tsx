import { headers } from "next/headers";
import { AppClient } from "@/components/app-client";
import { LandingPage } from "@/components/landing-page";
import { auth } from "@/lib/auth";
import { safeGetSession } from "@/lib/auth-session";
import { creditStore } from "@/lib/credits";

export default async function Home() {
  const session = await safeGetSession({
    headers: await headers(),
    getSession: auth.api.getSession,
  });

  if (!session?.user) {
    return <LandingPage />;
  }

  const initialCreditBalance = await creditStore.getBalance(session.user.id);

  return (
    <AppClient
      initialCreditBalance={initialCreditBalance}
      currentUserId={session.user.id}
    />
  );
}
