import { NextResponse } from "next/server";
import { parseRequest, serverErrorResponse } from "../_shared";
import { generateTopics } from "@/lib/ai/service";
import { topicRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  const input = await parseRequest(request, topicRequestSchema);

  if (input instanceof NextResponse) {
    return input;
  }

  try {
    const result = await generateTopics(input);

    return NextResponse.json(result);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
