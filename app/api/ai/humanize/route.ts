import { meteredJsonResponse } from "../_shared";
import { humanizeDraft } from "@/lib/ai/service";
import { humanizeDraftRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return meteredJsonResponse(
    request,
    humanizeDraftRequestSchema,
    "humanize",
    (input) => humanizeDraft(input)
  );
}
