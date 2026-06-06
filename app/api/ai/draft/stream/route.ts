import { streamJsonResponse } from "../../_stream";
import { generateDraft } from "@/lib/ai/service";
import { draftRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return streamJsonResponse(request, draftRequestSchema, (input, onProgress) =>
    generateDraft(input, { onProgress })
  );
}
