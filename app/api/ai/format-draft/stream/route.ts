import { authenticatedStreamJsonResponse } from "../../_stream";
import { formatDraft } from "@/lib/ai/service";
import { formatDraftRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return authenticatedStreamJsonResponse(
    request,
    formatDraftRequestSchema,
    "draft",
    (input, onProgress) => formatDraft(input, { onProgress })
  );
}
