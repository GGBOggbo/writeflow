import { streamJsonResponse } from "../../_stream";
import { generateTitlesAndSummaries } from "@/lib/ai/service";
import { metaRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return streamJsonResponse(request, metaRequestSchema, (input, onProgress) =>
    generateTitlesAndSummaries(input, { onProgress })
  );
}
