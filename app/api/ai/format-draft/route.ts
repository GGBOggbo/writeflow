import { authenticatedJsonResponse } from "../_shared";
import { formatDraft } from "@/lib/ai/service";
import { formatDraftRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return authenticatedJsonResponse(
    request,
    formatDraftRequestSchema,
    "draft",
    (input) => formatDraft(input)
  );
}
