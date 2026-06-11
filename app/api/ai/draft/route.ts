import { meteredJsonResponse } from "../_shared";
import { generateDraft } from "@/lib/ai/service";
import { draftRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return meteredJsonResponse(request, draftRequestSchema, "draft", (input) =>
    generateDraft(input)
  );
}
