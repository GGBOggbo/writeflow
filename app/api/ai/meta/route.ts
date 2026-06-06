import { NextResponse } from "next/server";
import { parseRequest, serverErrorResponse } from "../_shared";
import { generateTitlesAndSummaries } from "@/lib/ai/service";
import { metaRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  const input = await parseRequest(request, metaRequestSchema);

  if (input instanceof NextResponse) {
    return input;
  }

  try {
    const result = await generateTitlesAndSummaries(input);

    return NextResponse.json(result);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
