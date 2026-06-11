import { streamJsonResponse } from "../../_stream";
import { generateTopics } from "@/lib/ai/service";
import { topicRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return streamJsonResponse(
    request,
    topicRequestSchema,
    "topics",
    (input, onProgress) => generateTopics(input, { onProgress })
  );
}
