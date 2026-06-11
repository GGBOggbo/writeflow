import { streamJsonResponse } from "../../_stream";
import { humanizeDraft } from "@/lib/ai/service";
import { humanizeDraftRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return streamJsonResponse(
    request,
    humanizeDraftRequestSchema,
    "humanize",
    (input, onProgress) => humanizeDraft(input, { onProgress })
  );
}
