import { NextResponse } from "next/server";
import { parseRequest, serverErrorResponse } from "../_shared";
import { generateDraft } from "@/lib/ai/service";
import { draftRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  const input = await parseRequest(request, draftRequestSchema);

  if (input instanceof NextResponse) {
    return input;
  }

  try {
    const result = await generateDraft(input);

    return NextResponse.json(result);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
