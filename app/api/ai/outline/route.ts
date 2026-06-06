import { NextResponse } from "next/server";
import { parseRequest, serverErrorResponse } from "../_shared";
import { generateOutline } from "@/lib/ai/service";
import { outlineRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  const input = await parseRequest(request, outlineRequestSchema);

  if (input instanceof NextResponse) {
    return input;
  }

  try {
    const result = await generateOutline(input);

    return NextResponse.json(result);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
