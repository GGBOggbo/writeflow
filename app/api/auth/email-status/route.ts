import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserByEmail } from "@/lib/auth-users";

const emailStatusBodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = emailStatusBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await getAuthUserByEmail(email);

  return NextResponse.json({
    exists: Boolean(user),
    emailVerified: user?.emailVerified ?? false,
  });
}
