import { streamJsonResponse } from "../../_stream";
import { generateOutline } from "@/lib/ai/service";
import { outlineRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return streamJsonResponse(request, outlineRequestSchema, (input, onProgress) =>
    generateOutline(input, { onProgress })
  );
}
