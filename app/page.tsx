import { headers } from "next/headers";
import { AppClient } from "@/components/app-client";
import { auth } from "@/lib/auth";
import { creditStore } from "@/lib/credits";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  const initialCreditBalance = session?.user
    ? await creditStore.getBalance(session.user.id)
    : null;

  return <AppClient initialCreditBalance={initialCreditBalance} />;
}
