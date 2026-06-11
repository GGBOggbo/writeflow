import { meteredJsonResponse } from "../_shared";
import { generateTitlesAndSummaries } from "@/lib/ai/service";
import { metaRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return meteredJsonResponse(request, metaRequestSchema, "meta", (input) =>
    generateTitlesAndSummaries(input)
  );
}
