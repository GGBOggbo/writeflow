import { NextResponse } from "next/server";
import { parseRequest, serverErrorResponse } from "../_shared";
import { generateBrief } from "@/lib/ai/service";
import { briefRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  const input = await parseRequest(request, briefRequestSchema);

  if (input instanceof NextResponse) {
    return input;
  }

  try {
    const result = await generateBrief(input);

    return NextResponse.json(result);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
