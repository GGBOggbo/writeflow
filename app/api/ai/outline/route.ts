import { meteredJsonResponse } from "../_shared";
import { generateOutline } from "@/lib/ai/service";
import { outlineRequestSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  return meteredJsonResponse(
    request,
    outlineRequestSchema,
    "outline",
    (input) => generateOutline(input)
  );
}
