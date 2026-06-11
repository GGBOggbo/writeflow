import { meteredJsonResponse } from "../_shared";
import { generateTopics } from "@/lib/ai/service";
import { topicRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return meteredJsonResponse(request, topicRequestSchema, "topics", (input) =>
    generateTopics(input)
  );
}
