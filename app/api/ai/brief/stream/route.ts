import { streamJsonResponse } from "../../_stream";
import { generateBrief } from "@/lib/ai/service";
import { briefRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return streamJsonResponse(
    request,
    briefRequestSchema,
    "brief",
    (input, onProgress) => generateBrief(input, { onProgress })
  );
}
